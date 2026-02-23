import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReservationDto } from "./dto/create-reservation.dto";
import { UpdateReservationDto } from "./dto/update-reservation.dto";
import { AvailabilityQueryDto } from "./dto/availability-query.dto";
import { ReservationStatus } from "@prisma/client";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { RestaurantDto, TableDto, UserPublicDto } from "./dto/upstream.types";

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService, private http: HttpService) { }

  private authHeaders(authHeader?: string) {
    return authHeader ? { authorization: authHeader } : {};
  }

  /**
   * Returns the effective end time of a reservation.
   * If the reservation was checked out early, that timestamp is used as the end.
   * Otherwise, end = reservedAt + durationMins.
   */
  private getReservationEnd(r: { reservedAt: Date; durationMins?: number | null; checkedOutAt?: Date | null }) {
    if (r.checkedOutAt) return r.checkedOutAt;
    const mins = r.durationMins ?? 90;
    return new Date(r.reservedAt.getTime() + mins * 60_000);
  }

  // Customers can only reserve up to 30 days in advance and not in the past.
  async create(userId: string, data: CreateReservationDto) {
    const reservedAt = new Date(data.reservedAt);
    if (Number.isNaN(reservedAt.getTime())) {
      throw new BadRequestException("reservedAt must be a valid ISO date string");
    }

    const now = new Date();
    const max = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (reservedAt < now) throw new BadRequestException("reservedAt cannot be in the past");
    if (reservedAt > max) throw new BadRequestException("Reservations can only be made within 30 days");

    return this.prisma.reservation.create({
      data: {
        userId,
        restaurantId: data.restaurantId,
        guests: data.guests,
        reservedAt,
        status: ReservationStatus.PENDING,
        contactPhone: data.contactPhone?.trim() ? data.contactPhone.trim() : null,
      },
    });
  }

  async findMine(userId: string) {
    const reservations = await this.prisma.reservation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (!reservations.length) return [];

    const restaurantBase = process.env.RESTAURANT_SERVICE_URL ?? "http://127.0.0.1:3003";
    let restaurantsArr: RestaurantDto[] = [];
    try {
      const restaurantsResp = await firstValueFrom(this.http.get(`${restaurantBase}/restaurants`));
      restaurantsArr = (restaurantsResp.data ?? []) as RestaurantDto[];
    } catch {
      restaurantsArr = [];
    }

    const restaurantMap = new Map<string, RestaurantDto>();
    for (const r of restaurantsArr) restaurantMap.set(r.id, r);

    const tableBase = process.env.TABLE_SERVICE_URL ?? "http://localhost:3004";

    const restaurantIdsNeedingTables = Array.from(
      new Set(
        reservations
          .filter((r) => r.tableId && String(r.tableId).startsWith("cml"))
          .map((r) => r.restaurantId),
      ),
    );

    const tableMap = new Map<string, { tableNumber: string }>();

    for (const rid of restaurantIdsNeedingTables) {
      try {
        const tResp = await firstValueFrom(
          this.http.get<TableDto[]>(`${tableBase}/tables`, { params: { restaurantId: rid } }),
        );
        const tables = tResp.data ?? [];
        for (const t of tables) tableMap.set(t.id, { tableNumber: t.tableNumber });
      } catch {
        // table lookup failure is non-critical; reservation data is still returned
      }
    }

    return reservations.map((r) => {
      const restaurant = restaurantMap.get(r.restaurantId) ?? null;

      const tableNumber =
        !r.tableId
          ? null
          : String(r.tableId).startsWith("cml")
            ? tableMap.get(r.tableId)?.tableNumber ?? null
            : String(r.tableId);

      return {
        ...r,
        restaurant,
        tableNumber,
      };
    });
  }

  async cancelMine(userId: string, id: string) {
    const res = await this.prisma.reservation.findUnique({ where: { id } });
    if (!res) throw new NotFoundException("Reservation not found");

    if (res.userId !== userId) throw new ForbiddenException("Not your reservation");
    if (
      res.status !== ReservationStatus.PENDING &&
      res.status !== ReservationStatus.WAITLISTED
    ) {
      throw new ConflictException("Only PENDING or WAITLISTED reservations can be cancelled");
    }

    const cancelled = await this.prisma.reservation.update({
      where: { id },
      data: { status: ReservationStatus.CANCELLED },
    });

    // Auto-promote: when a PENDING reservation is cancelled, move the oldest
    // WAITLISTED reservation for the same restaurant to PENDING so staff can action it.
    if (res.status === ReservationStatus.PENDING) {
      const next = await this.prisma.reservation.findFirst({
        where: { restaurantId: res.restaurantId, status: ReservationStatus.WAITLISTED },
        orderBy: { createdAt: "asc" }, // oldest first (fair queue)
      });
      if (next) {
        await this.prisma.reservation.update({
          where: { id: next.id },
          data: { status: ReservationStatus.PENDING },
        });
      }
    }

    return cancelled;
  }

  // Places a reservation on the waitlist for a restaurant.
  // The customer must NOT already have an active reservation or waitlist entry.
  async joinWaitlist(userId: string, restaurantId: string, dto: {
    guests: number;
    reservedAt: string;
    contactPhone?: string;
  }) {
    const reservedAt = new Date(dto.reservedAt);
    if (Number.isNaN(reservedAt.getTime())) {
      throw new BadRequestException("reservedAt must be a valid ISO date string");
    }
    const now = new Date();
    const max = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (reservedAt < now) throw new BadRequestException("reservedAt cannot be in the past");
    if (reservedAt > max) throw new BadRequestException("Reservations can only be within 30 days");

    // Prevent duplicates
    const existing = await this.prisma.reservation.findFirst({
      where: {
        userId,
        restaurantId,
        status: { in: [ReservationStatus.PENDING, ReservationStatus.WAITLISTED, ReservationStatus.CONFIRMED] },
      },
    });
    if (existing) {
      throw new ConflictException("You already have an active or waitlisted reservation at this restaurant");
    }

    return this.prisma.reservation.create({
      data: {
        userId,
        restaurantId,
        reservedAt,
        guests: dto.guests,
        contactPhone: dto.contactPhone ?? null,
        status: ReservationStatus.WAITLISTED,
        durationMins: 90,
      },
    });
  }

  // Removes the caller from the waitlist (sets status to CANCELLED).
  async leaveWaitlist(userId: string, id: string) {
    const res = await this.prisma.reservation.findUnique({ where: { id } });
    if (!res) throw new NotFoundException("Reservation not found");
    if (res.userId !== userId) throw new ForbiddenException("Not your reservation");
    if (res.status !== ReservationStatus.WAITLISTED) {
      throw new ConflictException("Reservation is not on the waitlist");
    }
    return this.prisma.reservation.update({
      where: { id },
      data: { status: ReservationStatus.CANCELLED },
    });
  }

  async confirm(id: string, actedBy: string) {
    const res = await this.prisma.reservation.findUnique({ where: { id } });
    if (!res) throw new NotFoundException("Reservation not found");
    if (res.status !== ReservationStatus.PENDING) throw new ConflictException("Reservation already processed");

    return this.prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CONFIRMED,
        confirmedAt: new Date(),
        confirmedBy: actedBy,
      },
    });
  }

  async reject(id: string, actedBy: string) {
    const res = await this.prisma.reservation.findUnique({ where: { id } });
    if (!res) throw new NotFoundException("Reservation not found");
    if (res.status !== ReservationStatus.PENDING) throw new ConflictException("Reservation already processed");

    return this.prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.REJECTED,
        confirmedBy: actedBy,
      },
    });
  }

  // Returns reservations enriched with customer and restaurant details for staff/admin views.
  async findAllForStaffAdmin(q: { status?: string; restaurantId?: string }, authHeader?: string) {
    const where: any = {};
    if (q.status) where.status = q.status;
    if (q.restaurantId) where.restaurantId = q.restaurantId;

    const reservations = await this.prisma.reservation.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    if (!reservations.length) return [];

    // Restaurants
    const restaurantIds = Array.from(new Set(reservations.map((r) => r.restaurantId)));
    const restaurantBase = process.env.RESTAURANT_SERVICE_URL ?? "http://127.0.0.1:3003";

    let restaurantsArr: RestaurantDto[] = [];
    try {
      const restaurantsResp = await firstValueFrom(this.http.get(`${restaurantBase}/restaurants`, { params: {} }));
      restaurantsArr = (restaurantsResp.data ?? []) as RestaurantDto[];
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: unknown }; message?: string };
      console.error("[reservation] restaurant-service failed:", err?.response?.status, err?.response?.data ?? err?.message);
      restaurantsArr = [];
    }

    const restaurantMap = new Map<string, RestaurantDto>();
    for (const r of restaurantsArr) {
      if (restaurantIds.includes(r.id)) restaurantMap.set(r.id, r);
    }

    // Users
    const userIds = Array.from(new Set(reservations.map((r) => r.userId)));
    const identityBase = process.env.IDENTITY_SERVICE_URL ?? "http://127.0.0.1:3001";

    let users: UserPublicDto[] = [];

    try {
      const usersResp = await firstValueFrom(
        this.http.post<UserPublicDto[]>(
          `${identityBase}/users/public-by-ids`,
          { ids: userIds },
          { headers: this.authHeaders(authHeader) },
        ),
      );
      users = usersResp.data ?? [];
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: unknown }; message?: string };
      console.error("[reservation] identity /users/public-by-ids failed:", err?.response?.status, err?.response?.data ?? err?.message);
      users = [];
    }

    const userMap = new Map<string, any>();
    for (const u of users) userMap.set(u.id, u);

    return reservations.map((r) => {
      const customer = userMap.get(r.userId) ?? null;
      const restaurant = restaurantMap.get(r.restaurantId) ?? null;

      const contact = (r as any).contactPhone?.trim?.() ? (r as any).contactPhone : null;
      const effectivePhone = contact ?? customer?.phoneNumber ?? null;

      return {
        ...r,
        restaurant,
        customer,
        effectivePhone,
      };
    });
  }

  // Returns tables available for a given restaurant and guest count.
  async availability(q: AvailabilityQueryDto) {
    const start = new Date(q.reservedAt);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException("reservedAt must be a valid ISO date string");
    }

    const base = process.env.TABLE_SERVICE_URL ?? "http://localhost:3004";
    const tablesResp = await firstValueFrom(
      this.http.get(`${base}/tables`, {
        params: { restaurantId: q.restaurantId },
      }),
    );

    const tables = (tablesResp.data ?? []) as Array<{
      id: string;
      restaurantId: string;
      tableNumber: string;
      capacity: number;
      isActive: boolean;
    }>;

    const candidateTables = tables.filter((t) => t.isActive && t.capacity >= q.guests);
    if (candidateTables.length === 0) return [];

    // Block any table that currently has a CONFIRMED reservation that is NOT yet checked out.
    // Once a reservation is checked out (checkedOutAt IS NOT NULL), the table becomes free.
    const activeReservations = await this.prisma.reservation.findMany({
      where: {
        restaurantId: q.restaurantId,
        status: ReservationStatus.CONFIRMED,
        tableId: { not: null },
        checkedOutAt: null, // only block tables still occupied (not checked out)
      },
      select: {
        tableId: true,
      },
    });

    const blocked = new Set<string>(
      activeReservations.map((r) => r.tableId!).filter(Boolean),
    );

    return candidateTables.filter((t) => !blocked.has(t.id));
  }

  // Updates a PENDING reservation's date, guests, or contact phone.
  // Only the reservation owner can modify it, and only while it's PENDING.
  async update(userId: string, id: string, dto: UpdateReservationDto) {
    const res = await this.prisma.reservation.findUnique({ where: { id } });
    if (!res) throw new NotFoundException("Reservation not found");
    if (res.userId !== userId) throw new ForbiddenException("Not your reservation");
    if (res.status !== ReservationStatus.PENDING) {
      throw new ConflictException("Only PENDING reservations can be modified");
    }

    const updates: { reservedAt?: Date; guests?: number; contactPhone?: string | null } = {};

    if (dto.reservedAt !== undefined) {
      const reservedAt = new Date(dto.reservedAt);
      if (Number.isNaN(reservedAt.getTime())) {
        throw new BadRequestException("reservedAt must be a valid ISO date string");
      }
      const now = new Date();
      const max = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (reservedAt < now) throw new BadRequestException("reservedAt cannot be in the past");
      if (reservedAt > max) throw new BadRequestException("Reservations can only be made within 30 days");
      updates.reservedAt = reservedAt;
    }

    if (dto.guests !== undefined) updates.guests = dto.guests;
    if (dto.contactPhone !== undefined) {
      updates.contactPhone = dto.contactPhone.trim() || null;
    }

    return this.prisma.reservation.update({ where: { id }, data: updates });
  }

  // Confirms a pending reservation and assigns a table.
  // Uses a serializable transaction to prevent the TOCTOU race condition
  // where two concurrent staff requests could double-assign the same table.
  async confirmWithTable(reservationId: string, tableId: string, actedBy: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const reservation = await tx.reservation.findUnique({ where: { id: reservationId } });
        if (!reservation) throw new NotFoundException("Reservation not found");
        if (reservation.status !== ReservationStatus.PENDING) {
          throw new ConflictException("Reservation already processed");
        }

        const restaurantId = reservation.restaurantId;

        // Block if ANY confirmed reservation on this table is still active (not checked out).
        // The serializable isolation level prevents another concurrent transaction from
        // sneaking past this check before we commit the update below.
        const activeConflict = await tx.reservation.findFirst({
          where: {
            restaurantId,
            tableId,
            status: ReservationStatus.CONFIRMED,
            checkedOutAt: null, // null means still occupied — block it
          },
        });

        if (activeConflict) {
          throw new ConflictException(
            "Table is currently occupied. Please check out the existing reservation before assigning this table.",
          );
        }

        return tx.reservation.update({
          where: { id: reservationId },
          data: {
            status: ReservationStatus.CONFIRMED,
            tableId,
            confirmedAt: new Date(),
            confirmedBy: actedBy,
          },
        });
      },
      {
        isolationLevel: "Serializable",
        timeout: 10_000,
      },
    );
  }




  // Marks a confirmed reservation as checked out, freeing the table for future assignments.
  async checkoutReservation(reservationId: string, actedBy: string) {
    const res = await this.prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!res) throw new NotFoundException("Reservation not found");

    if (res.status !== ReservationStatus.CONFIRMED) {
      throw new ConflictException("Only CONFIRMED reservations can be checked out");
    }
    if (!res.tableId) {
      throw new ConflictException("Reservation has no table assigned");
    }
    if (res.checkedOutAt) {
      throw new ConflictException("Reservation already checked out");
    }

    return this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        checkedOutAt: new Date(),
        checkedOutBy: actedBy,
      },
    });
  }


  // Returns confirmed reservations for a given restaurant and date, enriched with customer and table info.
  async listConfirmed(user: any, q: any, authHeader?: string) {
    const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];

    let restaurantId: string | undefined = q.restaurantId;

    if (roles.includes("STAFF")) {
      const staffRestaurantId = user?.restaurantId;
      if (!staffRestaurantId) {
        throw new ForbiddenException("Staff user is not assigned to a restaurant");
      }
      restaurantId = staffRestaurantId;
    }

    if (roles.includes("ADMIN")) {
      if (!restaurantId) {
        throw new BadRequestException("restaurantId is required for ADMIN");
      }
    }

    const tz = process.env.APP_TZ_OFFSET ?? "+05:30"; // Sri Lanka default

    const dateStr = String(q.date ?? "").trim();
    if (!dateStr) throw new BadRequestException("date is required (YYYY-MM-DD)");

    const start = q.time
      ? new Date(`${dateStr}T${q.time}:00.000${tz}`)
      : new Date(`${dateStr}T00:00:00.000${tz}`);

    if (Number.isNaN(start.getTime())) throw new BadRequestException("Invalid date/time format");

    const end = new Date(`${dateStr}T23:59:59.999${tz}`);


    const reservations = await this.prisma.reservation.findMany({
      where: {
        status: ReservationStatus.CONFIRMED,
        restaurantId,
        reservedAt: { gte: start, lte: end },
      },
      orderBy: { reservedAt: "asc" },
    });

    if (!reservations.length) return [];

    const userIds = Array.from(new Set(reservations.map((r) => r.userId)));
    const identityBase = process.env.IDENTITY_SERVICE_URL ?? "http://127.0.0.1:3001";

    let users: UserPublicDto[] = [];

    try {
      const usersResp = await firstValueFrom(
        this.http.post<UserPublicDto[]>(
          `${identityBase}/users/public-by-ids`,
          { ids: userIds },
          { headers: this.authHeaders(authHeader) },
        ),
      );
      users = usersResp.data ?? [];
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: unknown }; message?: string };
      console.error("[reservation] identity /users/public-by-ids failed:", err?.response?.status, err?.response?.data ?? err?.message);
      users = [];
    }

    const userMap = new Map<string, any>();
    for (const u of users) userMap.set(u.id, u);

    const tableBase = process.env.TABLE_SERVICE_URL ?? "http://localhost:3004";
    const tableMap = new Map<string, { tableNumber: string }>();

    const needTableLookup = reservations.some((r) => r.tableId && String(r.tableId).startsWith("cml"));
    if (needTableLookup) {
      try {
        const tResp = await firstValueFrom(this.http.get(`${tableBase}/tables`, { params: { restaurantId } }));
        const tables = (tResp.data ?? []) as any[];
        for (const t of tables) tableMap.set(t.id, { tableNumber: t.tableNumber });
      } catch {
        // table lookup failure is non-critical; reservation data is still returned
      }
    }

    let enriched = reservations.map((r) => {
      const customer = userMap.get(r.userId) ?? null;

      const contact = (r as any).contactPhone?.trim?.() ? (r as any).contactPhone : null;
      const effectivePhone = contact ?? customer?.phoneNumber ?? null;

      const tableNumber =
        !r.tableId
          ? null
          : String(r.tableId).startsWith("cml")
            ? tableMap.get(r.tableId)?.tableNumber ?? null
            : String(r.tableId);

      return {
        ...r,
        customer,
        effectivePhone,
        tableNumber,
      };
    });

    if (q.tableNumber) {
      const tn = String(q.tableNumber).trim();
      enriched = enriched.filter((x) => String(x.tableNumber ?? "").toLowerCase() === tn.toLowerCase());
    }

    return enriched;
  }
}

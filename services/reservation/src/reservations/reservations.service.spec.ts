import { Test, TestingModule } from "@nestjs/testing";
import { ReservationsService } from "./reservations.service";
import { PrismaService } from "../prisma/prisma.service";
import { HttpService } from "@nestjs/axios";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { ReservationStatus } from "@prisma/client";
import { of } from "rxjs";

// ── Helpers ──────────────────────────────────────────────────────────────────

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString();
};

const past = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString();
};

const wayFuture = () => {
  const d = new Date();
  d.setDate(d.getDate() + 60);
  return d.toISOString();
};

// ── Mock factories ────────────────────────────────────────────────────────────

function makePrismaMock() {
  return {
    reservation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
}

function makeHttpMock() {
  return {
    get: jest.fn().mockReturnValue(of({ data: [] })),
    post: jest.fn().mockReturnValue(of({ data: [] })),
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe("ReservationsService", () => {
  let service: ReservationsService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let http: ReturnType<typeof makeHttpMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    http = makeHttpMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: HttpService, useValue: http },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create ──────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("creates a PENDING reservation with a valid future date", async () => {
      const created = { id: "r1", status: ReservationStatus.PENDING };
      prisma.reservation.create.mockResolvedValue(created);

      const result = await service.create("user_1", {
        restaurantId: "rest_1",
        guests: 2,
        reservedAt: tomorrow(),
      });

      expect(prisma.reservation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: ReservationStatus.PENDING }),
        }),
      );
      expect(result).toEqual(created);
    });

    it("throws BadRequestException when reservedAt is in the past", async () => {
      await expect(
        service.create("user_1", { restaurantId: "rest_1", guests: 2, reservedAt: past() }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when reservedAt is more than 30 days away", async () => {
      await expect(
        service.create("user_1", { restaurantId: "rest_1", guests: 2, reservedAt: wayFuture() }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException for an invalid date string", async () => {
      await expect(
        service.create("user_1", { restaurantId: "rest_1", guests: 2, reservedAt: "not-a-date" }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── cancelMine ──────────────────────────────────────────────────────────────

  describe("cancelMine", () => {
    const pendingRes = { id: "r1", userId: "user_1", status: ReservationStatus.PENDING };

    it("cancels the reservation when it belongs to the user and is PENDING", async () => {
      prisma.reservation.findUnique.mockResolvedValue(pendingRes);
      prisma.reservation.update.mockResolvedValue({ ...pendingRes, status: ReservationStatus.CANCELLED });

      await service.cancelMine("user_1", "r1");

      expect(prisma.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: ReservationStatus.CANCELLED } }),
      );
    });

    it("throws NotFoundException when reservation does not exist", async () => {
      prisma.reservation.findUnique.mockResolvedValue(null);
      await expect(service.cancelMine("user_1", "r99")).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException when reservation belongs to another user", async () => {
      prisma.reservation.findUnique.mockResolvedValue({ ...pendingRes, userId: "user_2" });
      await expect(service.cancelMine("user_1", "r1")).rejects.toThrow(ForbiddenException);
    });

    it("throws ConflictException when reservation is already CONFIRMED", async () => {
      prisma.reservation.findUnique.mockResolvedValue({ ...pendingRes, status: ReservationStatus.CONFIRMED });
      await expect(service.cancelMine("user_1", "r1")).rejects.toThrow(ConflictException);
    });
  });

  // ── confirm ─────────────────────────────────────────────────────────────────

  describe("confirm", () => {
    it("confirms a PENDING reservation", async () => {
      const res = { id: "r1", status: ReservationStatus.PENDING };
      prisma.reservation.findUnique.mockResolvedValue(res);
      prisma.reservation.update.mockResolvedValue({ ...res, status: ReservationStatus.CONFIRMED });

      await service.confirm("r1", "staff_1");

      expect(prisma.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: ReservationStatus.CONFIRMED }),
        }),
      );
    });

    it("throws NotFoundException when reservation does not exist", async () => {
      prisma.reservation.findUnique.mockResolvedValue(null);
      await expect(service.confirm("r99", "staff_1")).rejects.toThrow(NotFoundException);
    });

    it("throws ConflictException when already confirmed", async () => {
      prisma.reservation.findUnique.mockResolvedValue({ id: "r1", status: ReservationStatus.CONFIRMED });
      await expect(service.confirm("r1", "staff_1")).rejects.toThrow(ConflictException);
    });
  });

  // ── confirmWithTable ─────────────────────────────────────────────────────────

  describe("confirmWithTable", () => {
    const pendingRes = { id: "r1", status: ReservationStatus.PENDING, restaurantId: "rest_1" };

    it("confirms with table assignment when table is free", async () => {
      prisma.reservation.findUnique.mockResolvedValue(pendingRes);
      prisma.reservation.findFirst.mockResolvedValue(null); // no conflict
      prisma.reservation.update.mockResolvedValue({
        ...pendingRes,
        status: ReservationStatus.CONFIRMED,
        tableId: "tbl_1",
      });

      await service.confirmWithTable("r1", "tbl_1", "staff_1");

      expect(prisma.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tableId: "tbl_1", status: ReservationStatus.CONFIRMED }),
        }),
      );
    });

    it("throws ConflictException when table is currently occupied (not checked out)", async () => {
      prisma.reservation.findUnique.mockResolvedValue(pendingRes);
      prisma.reservation.findFirst.mockResolvedValue({ id: "r_existing" }); // occupied

      await expect(service.confirmWithTable("r1", "tbl_1", "staff_1")).rejects.toThrow(ConflictException);
    });

    it("throws NotFoundException when reservation does not exist", async () => {
      prisma.reservation.findUnique.mockResolvedValue(null);
      await expect(service.confirmWithTable("r99", "tbl_1", "staff_1")).rejects.toThrow(NotFoundException);
    });

    it("throws ConflictException when reservation is not PENDING", async () => {
      prisma.reservation.findUnique.mockResolvedValue({ ...pendingRes, status: ReservationStatus.CONFIRMED });
      await expect(service.confirmWithTable("r1", "tbl_1", "staff_1")).rejects.toThrow(ConflictException);
    });
  });

  // ── checkoutReservation ──────────────────────────────────────────────────────

  describe("checkoutReservation", () => {
    const confirmedRes = {
      id: "r1",
      status: ReservationStatus.CONFIRMED,
      tableId: "tbl_1",
      checkedOutAt: null,
    };

    it("checks out a confirmed reservation successfully", async () => {
      prisma.reservation.findUnique.mockResolvedValue(confirmedRes);
      prisma.reservation.update.mockResolvedValue({ ...confirmedRes, checkedOutAt: new Date() });

      await service.checkoutReservation("r1", "staff_1");

      expect(prisma.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ checkedOutBy: "staff_1" }),
        }),
      );
    });

    it("throws NotFoundException when reservation does not exist", async () => {
      prisma.reservation.findUnique.mockResolvedValue(null);
      await expect(service.checkoutReservation("r99", "staff_1")).rejects.toThrow(NotFoundException);
    });

    it("throws ConflictException when reservation is not CONFIRMED", async () => {
      prisma.reservation.findUnique.mockResolvedValue({ ...confirmedRes, status: ReservationStatus.PENDING });
      await expect(service.checkoutReservation("r1", "staff_1")).rejects.toThrow(ConflictException);
    });

    it("throws ConflictException when reservation has no table assigned", async () => {
      prisma.reservation.findUnique.mockResolvedValue({ ...confirmedRes, tableId: null });
      await expect(service.checkoutReservation("r1", "staff_1")).rejects.toThrow(ConflictException);
    });

    it("throws ConflictException when reservation is already checked out", async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        ...confirmedRes,
        checkedOutAt: new Date("2024-01-01"),
      });
      await expect(service.checkoutReservation("r1", "staff_1")).rejects.toThrow(ConflictException);
    });
  });

  // ── update ──────────────────────────────────────────────────────────────────

  describe("update", () => {
    const pendingRes = { id: "r1", userId: "user_1", status: ReservationStatus.PENDING };

    it("updates reservedAt to a valid future date", async () => {
      prisma.reservation.findUnique.mockResolvedValue(pendingRes);
      prisma.reservation.update.mockResolvedValue({ ...pendingRes, guests: 3 });

      await service.update("user_1", "r1", { reservedAt: tomorrow(), guests: 3 });

      expect(prisma.reservation.update).toHaveBeenCalled();
    });

    it("throws NotFoundException when reservation does not exist", async () => {
      prisma.reservation.findUnique.mockResolvedValue(null);
      await expect(service.update("user_1", "r99", { guests: 3 })).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException when reservation belongs to another user", async () => {
      prisma.reservation.findUnique.mockResolvedValue({ ...pendingRes, userId: "user_2" });
      await expect(service.update("user_1", "r1", { guests: 3 })).rejects.toThrow(ForbiddenException);
    });

    it("throws ConflictException when reservation is not PENDING", async () => {
      prisma.reservation.findUnique.mockResolvedValue({ ...pendingRes, status: ReservationStatus.CONFIRMED });
      await expect(service.update("user_1", "r1", { guests: 3 })).rejects.toThrow(ConflictException);
    });

    it("throws BadRequestException when new reservedAt is in the past", async () => {
      prisma.reservation.findUnique.mockResolvedValue(pendingRes);
      await expect(service.update("user_1", "r1", { reservedAt: past() })).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when new reservedAt is >30 days away", async () => {
      prisma.reservation.findUnique.mockResolvedValue(pendingRes);
      await expect(service.update("user_1", "r1", { reservedAt: wayFuture() })).rejects.toThrow(BadRequestException);
    });
  });

  // ── availability ─────────────────────────────────────────────────────────────

  describe("availability", () => {
    it("returns available tables that are not occupied", async () => {
      // tables from table service
      http.get.mockReturnValue(
        of({
          data: [
            { id: "tbl_1", restaurantId: "rest_1", tableNumber: "T1", capacity: 4, isActive: true },
            { id: "tbl_2", restaurantId: "rest_1", tableNumber: "T2", capacity: 4, isActive: true },
          ],
        }),
      );
      // tbl_1 is occupied (confirmed, not checked out)
      prisma.reservation.findMany.mockResolvedValue([{ tableId: "tbl_1" }]);

      const result = await service.availability({
        restaurantId: "rest_1",
        guests: 2,
        reservedAt: tomorrow(),
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("tbl_2");
    });

    it("returns empty array when all tables are occupied", async () => {
      http.get.mockReturnValue(
        of({
          data: [
            { id: "tbl_1", restaurantId: "rest_1", tableNumber: "T1", capacity: 4, isActive: true },
          ],
        }),
      );
      prisma.reservation.findMany.mockResolvedValue([{ tableId: "tbl_1" }]);

      const result = await service.availability({
        restaurantId: "rest_1",
        guests: 2,
        reservedAt: tomorrow(),
      });

      expect(result).toHaveLength(0);
    });

    it("throws BadRequestException for invalid reservedAt", async () => {
      await expect(
        service.availability({ restaurantId: "rest_1", guests: 2, reservedAt: "bad-date" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("returns only tables with sufficient capacity", async () => {
      http.get.mockReturnValue(
        of({
          data: [
            { id: "tbl_1", restaurantId: "rest_1", tableNumber: "T1", capacity: 2, isActive: true },
            { id: "tbl_2", restaurantId: "rest_1", tableNumber: "T2", capacity: 6, isActive: true },
          ],
        }),
      );
      prisma.reservation.findMany.mockResolvedValue([]);

      const result = await service.availability({
        restaurantId: "rest_1",
        guests: 4,
        reservedAt: tomorrow(),
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("tbl_2");
    });
  });
});

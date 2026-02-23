import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma, Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";

type UserWithRoles = Prisma.UserGetPayload<{ include: { roles: true } }>;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  findByEmail(email: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: { roles: true },
    });
  }

  findByPhone(phoneNumber: string): Promise<UserWithRoles | null> {
    const phone = (phoneNumber ?? "").trim();
    if (!phone) return Promise.resolve(null);

    return this.prisma.user.findFirst({
      where: { phoneNumber: phone },
      include: { roles: true },
    });
  }

  findById(id: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { roles: true },
    });
  }

  // Returns the public profile fields for the authenticated user.
  async getMyProfile(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });
    if (!u) throw new NotFoundException("User not found");

    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName ?? null,
      phoneNumber: u.phoneNumber ?? null,
      roles: u.roles.map((r) => r.role),
      restaurantId: u.restaurantId ?? null,
    };
  }

  // Updates mutable profile fields. If the email is being changed, current password is required.
  async updateMyProfile(
    userId: string,
    body: {
      fullName?: string | null;
      phoneNumber?: string | null;
      email?: string;
      currentPassword?: string;
    },
  ) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });
    if (!u) throw new NotFoundException("User not found");
    if (!(u as any).isActive) throw new ForbiddenException("Account is disabled");

    const nextFullName =
      body.fullName === undefined ? undefined : (body.fullName ?? "").trim() || null;

    const nextPhone =
      body.phoneNumber === undefined ? undefined : (body.phoneNumber ?? "").trim() || null;

    const nextEmail =
      body.email === undefined ? undefined : (body.email ?? "").trim().toLowerCase();

    // Changing email requires the current password for verification.
    if (nextEmail !== undefined && nextEmail !== u.email) {
      if (!body.currentPassword?.trim()) {
        throw new BadRequestException("Current password is required to change email");
      }
      const ok = await bcrypt.compare(body.currentPassword, (u as any).passwordHash);
      if (!ok) throw new ForbiddenException("Current password is incorrect");

      // unique email check
      const existsEmail = await this.prisma.user.findUnique({ where: { email: nextEmail } });
      if (existsEmail && existsEmail.id !== u.id) {
        throw new ConflictException("Email already in use");
      }
    }

    // unique phone check (if provided)
    if (nextPhone !== undefined && nextPhone !== u.phoneNumber) {
      if (nextPhone) {
        const existsPhone = await this.prisma.user.findFirst({
          where: { phoneNumber: nextPhone },
        });
        if (existsPhone && existsPhone.id !== u.id) {
          throw new ConflictException("Phone number already in use");
        }
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: nextFullName,
        phoneNumber: nextPhone,
        email: nextEmail,
      },
      include: { roles: true },
    });

    return {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName ?? null,
      phoneNumber: updated.phoneNumber ?? null,
      roles: updated.roles.map((r) => r.role),
      restaurantId: updated.restaurantId ?? null,
    };
  }

  // Verifies the current password then updates it to the new hash.
  async changeMyPassword(userId: string, currentPassword: string, newPassword: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException("User not found");

    const ok = await bcrypt.compare(currentPassword, (u as any).passwordHash);
    if (!ok) throw new ForbiddenException("Current password is incorrect");

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true };
  }

  // Returns all active staff users with their roles and restaurant assignment.
  async listStaffUsers() {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        roles: { some: { role: Role.STAFF } },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        restaurantId: true,
        isActive: true,
        roles: { select: { role: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async assignRestaurant(userId: string, restaurantId: string | null) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException("User not found");

    return this.prisma.user.update({
      where: { id: userId },
      data: { restaurantId },
      select: { id: true, email: true, restaurantId: true, isActive: true },
    });
  }

  saveRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    return this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  findValidRefreshToken(tokenHash: string) {
    return this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async revokeRefreshToken(tokenHash: string) {
    const res = await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return res.count > 0;
  }

  async createUser(data: {
    email: string;
    passwordHash: string;
    fullName?: string;
    phoneNumber?: string;
    role?: Role;
  }): Promise<UserWithRoles> {
    const role = data.role ?? Role.CUSTOMER;

    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber?.trim() ? data.phoneNumber.trim() : null,
        restaurantId: null,
        roles: { create: [{ role }] },
      },
      include: { roles: true },
    });
  }

  async findManyPublicByIds(ids: string[]) {
    if (!ids?.length) return [];
    const unique = Array.from(new Set(ids));

    return this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        isActive: true,
      },
    });
  }

  async listAllUsers() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        restaurantId: true,
        isActive: true,
        roles: { select: { role: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async setUserRoles(userId: string, roles: Role[]) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException("User not found");

    const cleanRoles = Array.from(new Set((roles ?? []).filter(Boolean)));
    if (cleanRoles.length === 0) cleanRoles.push(Role.CUSTOMER);

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId } }),
      this.prisma.userRole.createMany({
        data: cleanRoles.map((r) => ({ userId, role: r })),
        skipDuplicates: true,
      }),
    ]);

    const isStaff = cleanRoles.includes(Role.STAFF);
    if (!isStaff) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { restaurantId: null },
      });
    }

    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        restaurantId: true,
        roles: { select: { role: true } },
        isActive: true,
      },
    });
  }
}
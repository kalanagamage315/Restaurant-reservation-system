import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import * as bcrypt from "bcryptjs";
import { JwtService } from "@nestjs/jwt";
import { Prisma, Role } from "@prisma/client";
import type { StringValue } from "ms";
import * as crypto from "crypto";

type UserWithRoles = Prisma.UserGetPayload<{ include: { roles: true } }>;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  private hashToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  private generateRefreshToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  private refreshExpiryDate() {
    const days = Number(process.env.JWT_REFRESH_DAYS ?? "7");
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }

  private signAccessToken(user: UserWithRoles) {
    const roles = user.roles.map((r) => r.role);

    return this.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        roles,
        restaurantId: (user as any).restaurantId ?? null,
      },
      {
        secret: (process.env.JWT_ACCESS_SECRET ?? "dev_secret") as string,
        expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? "15m") as StringValue,
      },
    );
  }

  async register(body: {
    email: string;
    password: string;
    fullName?: string;
    phoneNumber?: string;
    role?: Role;
  }) {
    const email = body.email.trim().toLowerCase();
    const phone = body.phoneNumber?.trim() || undefined;

    const existsEmail = await this.users.findByEmail(email);
    if (existsEmail) throw new ForbiddenException("Email already in use");

    if (phone) {
      const existsPhone = await this.users.findByPhone(phone);
      if (existsPhone) throw new ForbiddenException("Phone number already in use");
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    const user = await this.users.createUser({
      email,
      passwordHash,
      fullName: body.fullName,
      phoneNumber: phone,
      role: body.role ?? Role.CUSTOMER,
    });

    const accessToken = this.signAccessToken(user);

    const refreshToken = this.generateRefreshToken();
    const tokenHash = this.hashToken(refreshToken);

    await this.users.saveRefreshToken(user.id, tokenHash, this.refreshExpiryDate());

    return {
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles.map((r) => r.role),
        restaurantId: (user as any).restaurantId ?? null,
        phoneNumber: (user as any).phoneNumber ?? null,
        fullName: (user as any).fullName ?? null,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(body: { email: string; password: string }) {
    const email = body.email.trim().toLowerCase();

    const user = await this.users.findByEmail(email);
    if (!user || !(user as any).isActive) throw new UnauthorizedException("Invalid credentials");

    const ok = await bcrypt.compare(body.password, (user as any).passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");

    const accessToken = this.signAccessToken(user);

    const refreshToken = this.generateRefreshToken();
    const tokenHash = this.hashToken(refreshToken);

    await this.users.saveRefreshToken(user.id, tokenHash, this.refreshExpiryDate());

    return {
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles.map((r) => r.role),
        restaurantId: (user as any).restaurantId ?? null,
        phoneNumber: (user as any).phoneNumber ?? null,
        fullName: (user as any).fullName ?? null,
      },
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    const record = await this.users.findValidRefreshToken(tokenHash);
    if (!record) throw new UnauthorizedException("Invalid refresh token");

    const user = await this.users.findById(record.userId);
    if (!user || !(user as any).isActive) throw new UnauthorizedException("Invalid refresh token");

    const accessToken = this.signAccessToken(user);
    return { accessToken };
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const ok = await this.users.revokeRefreshToken(tokenHash);
    return { success: ok };
  }
}

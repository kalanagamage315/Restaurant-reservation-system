import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { JwtService } from "@nestjs/jwt";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";

// ── Helpers ───────────────────────────────────────────────────────────────────

const HASHED_PW = bcrypt.hashSync("Password123!", 10);

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user_1",
    email: "test@example.com",
    passwordHash: HASHED_PW,
    isActive: true,
    restaurantId: null,
    phoneNumber: null,
    fullName: "Test User",
    roles: [{ role: "CUSTOMER" }],
    ...overrides,
  };
}

// ── Mock factories ────────────────────────────────────────────────────────────

function makeUsersMock() {
  return {
    findByEmail: jest.fn(),
    findByPhone: jest.fn(),
    findById: jest.fn(),
    createUser: jest.fn(),
    saveRefreshToken: jest.fn(),
    findValidRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
  };
}

function makeJwtMock() {
  return {
    sign: jest.fn().mockReturnValue("mock_access_token"),
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe("AuthService", () => {
  let service: AuthService;
  let users: ReturnType<typeof makeUsersMock>;
  let jwt: ReturnType<typeof makeJwtMock>;

  beforeEach(async () => {
    users = makeUsersMock();
    jwt = makeJwtMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── register ──────────────────────────────────────────────────────────────

  describe("register", () => {
    it("registers a new user and returns tokens", async () => {
      const user = makeUser();
      users.findByEmail.mockResolvedValue(null);
      users.findByPhone.mockResolvedValue(null);
      users.createUser.mockResolvedValue(user);
      users.saveRefreshToken.mockResolvedValue({});

      const result = await service.register({
        email: "test@example.com",
        password: "Password123!",
        fullName: "Test User",
      });

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(result.user.email).toBe("test@example.com");
    });

    it("normalises email to lowercase before lookup", async () => {
      users.findByEmail.mockResolvedValue(null);
      users.findByPhone.mockResolvedValue(null);
      users.createUser.mockResolvedValue(makeUser());
      users.saveRefreshToken.mockResolvedValue({});

      await service.register({ email: "TEST@EXAMPLE.COM", password: "Password123!" });

      expect(users.findByEmail).toHaveBeenCalledWith("test@example.com");
    });

    it("throws ForbiddenException when email is already in use", async () => {
      users.findByEmail.mockResolvedValue(makeUser());

      await expect(
        service.register({ email: "test@example.com", password: "Password123!" }),
      ).rejects.toThrow(ForbiddenException);

      expect(users.createUser).not.toHaveBeenCalled();
    });

    it("throws ForbiddenException when phone number is already in use", async () => {
      users.findByEmail.mockResolvedValue(null);
      users.findByPhone.mockResolvedValue(makeUser({ phoneNumber: "+94771234567" }));

      await expect(
        service.register({
          email: "new@example.com",
          password: "Password123!",
          phoneNumber: "+94771234567",
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe("login", () => {
    it("returns tokens for valid credentials", async () => {
      users.findByEmail.mockResolvedValue(makeUser());
      users.saveRefreshToken.mockResolvedValue({});

      const result = await service.login({
        email: "test@example.com",
        password: "Password123!",
      });

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
    });

    it("throws UnauthorizedException for wrong password", async () => {
      users.findByEmail.mockResolvedValue(makeUser());

      await expect(
        service.login({ email: "test@example.com", password: "WrongPassword" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when user does not exist", async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: "nobody@example.com", password: "Password123!" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when account is deactivated", async () => {
      users.findByEmail.mockResolvedValue(makeUser({ isActive: false }));

      await expect(
        service.login({ email: "test@example.com", password: "Password123!" }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── refresh ───────────────────────────────────────────────────────────────

  describe("refresh", () => {
    it("returns a new access token for a valid refresh token", async () => {
      users.findValidRefreshToken.mockResolvedValue({ userId: "user_1" });
      users.findById.mockResolvedValue(makeUser());

      const result = await service.refresh("valid_refresh_token");

      expect(result).toHaveProperty("accessToken");
    });

    it("throws UnauthorizedException for an invalid/expired refresh token", async () => {
      users.findValidRefreshToken.mockResolvedValue(null);

      await expect(service.refresh("bad_token")).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when the associated user is inactive", async () => {
      users.findValidRefreshToken.mockResolvedValue({ userId: "user_1" });
      users.findById.mockResolvedValue(makeUser({ isActive: false }));

      await expect(service.refresh("valid_token")).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────

  describe("logout", () => {
    it("revokes the refresh token on logout", async () => {
      users.revokeRefreshToken.mockResolvedValue(true);

      const result = await service.logout("some_refresh_token");

      expect(result).toEqual({ success: true });
      expect(users.revokeRefreshToken).toHaveBeenCalled();
    });

    it("returns success: false when no token was found to revoke", async () => {
      users.revokeRefreshToken.mockResolvedValue(false);

      const result = await service.logout("unknown_token");

      expect(result).toEqual({ success: false });
    });
  });
});

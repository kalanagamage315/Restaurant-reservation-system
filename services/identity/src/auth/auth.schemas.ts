import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2).optional(),
  role: z.enum(["ADMIN", "STAFF", "CUSTOMER"]).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const LogoutSchema = z.object({
  refreshToken: z.string().min(10),
});


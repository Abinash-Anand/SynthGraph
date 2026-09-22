import { z } from "zod";

const email = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .max(254, "That email address is too long.")
  .email("Enter a valid email address.");

// Mirrors the backend's RegisterDto: @IsEmail() + @MinLength(8).
export const registerSchema = z.object({
  email,
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type RegisterRequest = z.infer<typeof registerSchema>;
export type RegisterFieldErrors = Partial<Record<keyof RegisterRequest, string>>;

// Mirrors the backend's LoginDto: @IsEmail() + @MinLength(1) (no strength
// floor on login — that's enforced at registration, not here).
export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required."),
});

export type LoginRequest = z.infer<typeof loginSchema>;
export type LoginFieldErrors = Partial<Record<keyof LoginRequest, string>>;

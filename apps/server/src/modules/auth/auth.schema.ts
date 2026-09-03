import { z } from "zod";

const emailSchema = z.string().email("Enter a valid email address");
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128);

export const signupSchema = z
  .object({
    displayName: z.string().min(1, "Enter your name").max(50),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    deviceId: z.string().min(1).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
  deviceId: z.string().min(1).optional(),
});

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export const confirmPasswordResetSchema = z
  .object({
    email: emailSchema,
    token: z.string().min(6),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

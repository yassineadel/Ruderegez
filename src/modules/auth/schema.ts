import { z } from "zod";

/**
 * Zod validates at RUNTIME (an attacker can send anything to a Server Action)
 * and generates the TypeScript type, so it is never written twice.
 */
export const signupSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const verifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().length(6, "The code is 6 digits"),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
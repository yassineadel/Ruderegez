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

// ============================================================================
//  PASSWORD RESET (FR-05)
// ============================================================================

/** Step 1 — "I forgot my password, here is my email." */
export const requestResetSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email"),
});

export type RequestResetInput = z.infer<typeof requestResetSchema>;

/**
 * Step 2 — "Here is the token from my link and my new password."
 *
 * The token is min(1) only. Its real validation is whether it matches a row
 * in the database, which is the service's job, not Zod's. Length rules here
 * would only tell an attacker what shape of token to forge.
 */
export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
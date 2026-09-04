import { hashPassword } from "@/lib/password";
import { sendEmail } from "@/lib/email";
import {
  generateOtp,
  hashOtp,
  otpExpiry,
  generateResetToken,
  hashResetToken,
  resetExpiry,
} from "./tokens";
import {
  verificationEmail,
  duplicateSignupEmail,
  passwordResetEmail,
  passwordChangedEmail,
} from "./emails";
import type {
  SignupInput,
  VerifyOtpInput,
  RequestResetInput,
  ResetPasswordInput,
} from "./schema";
import {
  createSignupToken,
  createVerifiedUser,
  deleteSignupToken,
  findSignupToken,
  findUserByEmail,
  createResetToken,
  deleteResetTokens,
  findResetToken,
  updateUserPassword,
} from "./repository";

// ============================================================================
//  SIGNUP
// ============================================================================

export async function startSignup(input: SignupInput): Promise<void> {
  const { name, email, password } = input;

  const passwordHash = await hashPassword(password);

  // An account already exists - tell the REAL owner, tell the requester nothing.
  const existing = await findUserByEmail(email);
  if (existing && (existing.emailVerified || existing.passwordHash)) {
    const dupmail = duplicateSignupEmail();
    await sendEmail({ to: email, subject: dupmail.subject, html: dupmail.html });
    return;
  }

  await deleteSignupToken(email);

  const generatedOtp = generateOtp();
  const hashedotp = hashOtp(generatedOtp);

  // Row first, email second: a code that exists but wasn't delivered is
  // recoverable; a delivered code with no row is permanently broken.
  await createSignupToken({
    email,
    tokenHash: hashedotp,
    expires: otpExpiry(),
    payload: { name, passwordHash },
  });

  const veremail = verificationEmail(generatedOtp);
  await sendEmail({ to: email, subject: veremail.subject, html: veremail.html });
}

export async function verifySignup(input: VerifyOtpInput): Promise<void> {
  const { email, code } = input;

  const record = await findSignupToken(email);
  if (!record) {
    throw new Error("INVALID_CODE");
  }

  const submittedHash = hashOtp(code);

  if (submittedHash !== record.token) {
    throw new Error("INVALID_CODE");
  } else if (record.expires < new Date()) {
    await deleteSignupToken(email);
    throw new Error("INVALID_CODE");
  }

  const payload = record.payload as { name: string; passwordHash: string };

  await createVerifiedUser({
    name: payload.name,
    email: record.identifier,
    passwordHash: payload.passwordHash,
  });

  await deleteSignupToken(email);
}

// ============================================================================
//  PASSWORD RESET (FR-05)
// ============================================================================

function baseUrl(): string {
  return (
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/**
 * STEP 1 - issue a reset link.
 *
 * Returns void in EVERY case, including when there is no such account. The
 * caller cannot distinguish "sent" from "no account", which is the whole
 * point: otherwise this endpoint becomes a way to test which email addresses
 * are registered, one request at a time.
 */
export async function requestPasswordReset(input: RequestResetInput): Promise<void> {
  const { email } = input;

  const user = await findUserByEmail(email);

  // No account, Google-only account (nothing to reset), or a blocked account.
  // All three: do nothing, say nothing.
  if (!user || !user.passwordHash || user.isBlocked) {
    return;
  }

  // Requesting a new link kills the old one - a reset email should never leave
  // two working links in an inbox.
  await deleteResetTokens(email);

  const rawToken = generateResetToken();

  await createResetToken({
    email,
    tokenHash: hashResetToken(rawToken),
    expires: resetExpiry(),
  });

  // RAW token in the URL. The database only ever saw the hash.
  const url = `${baseUrl()}/reset-password?token=${rawToken}`;
  const mail = passwordResetEmail(url);
  await sendEmail({ to: email, subject: mail.subject, html: mail.html });
}

/**
 * STEP 2 - consume the link and set the new password.
 *
 * Unlike step 1 this DOES throw, because by now the user is holding a link we
 * gave them. "That link has expired" is useful, and it leaks nothing an
 * attacker did not already have.
 */
export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const { token, password } = input;

  const record = await findResetToken(hashResetToken(token));
  if (!record) {
    throw new Error("INVALID_TOKEN");
  }

  if (record.expires < new Date()) {
    await deleteResetTokens(record.identifier);
    throw new Error("INVALID_TOKEN");
  }

  const user = await findUserByEmail(record.identifier);
  if (!user || user.isBlocked) {
    await deleteResetTokens(record.identifier);
    throw new Error("INVALID_TOKEN");
  }

  const passwordHash = await hashPassword(password);
  await updateUserPassword(user.id, passwordHash);

  // Burn the token - single use, always.
  await deleteResetTokens(record.identifier);

  const mail = passwordChangedEmail();
  await sendEmail({ to: user.email, subject: mail.subject, html: mail.html });
}
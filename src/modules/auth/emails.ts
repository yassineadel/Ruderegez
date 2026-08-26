/**
 * Email templates for the auth flow.
 * Kept deliberately plain — real email HTML gets polished on Day 12.
 */

const wrap = (body: string) => `
  <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #333;">
    <h2 style="font-weight: 500;">Ruderegez</h2>
    ${body}
    <p style="font-size: 12px; color: #888; margin-top: 32px;">
      This is an automated message. Please do not reply.
    </p>
  </div>
`;

/** FR-02 — the code a new account must enter before it can be used. */
export function verificationEmail(code: string): { subject: string; html: string } {
  return {
    subject: "Your Ruderegez verification code",
    html: wrap(`
      <p>Enter this code to verify your email address:</p>
      <p style="font-size: 30px; letter-spacing: 6px; font-weight: 600; margin: 24px 0;">
        ${code}
      </p>
      <p>The code expires in 10 minutes.</p>
      <p>If you did not sign up, you can safely ignore this email.</p>
    `),
  };
}

/**
 * Sent to the REAL owner when someone attempts to register with an address
 * that already has an account.
 *
 * This exists so signup can reply identically whether or not the email is
 * taken — otherwise anyone could discover which addresses have accounts by
 * trying them one at a time (account enumeration).
 *
 * Contains no code and no action link. Informational only.
 */
export function duplicateSignupEmail(): { subject: string; html: string } {
  return {
    subject: "Someone tried to sign up with your email",
    html: wrap(`
      <p>Someone attempted to create a Ruderegez account using this email
      address. An account already exists, so nothing has changed.</p>
      <p>If this was you, sign in as normal. If you have forgotten your
      password, use the password reset option on the sign-in page.</p>
      <p>If this was not you, no action is needed.</p>
    `),
  };
}
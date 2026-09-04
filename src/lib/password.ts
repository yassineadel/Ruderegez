// ============================================================================
//  PASSWORD HASHING - Argon2id
// ============================================================================
//  Memory-hard, unlike bcrypt which is only CPU-hard. Each hash needs ~19 MB
//  of RAM, so an attacker cannot run thousands of guesses in parallel on a GPU.
//
//  The "id" variant is a hybrid of Argon2i (side-channel resistant) and
//  Argon2d (GPU resistant). Current OWASP recommendation.
//
//  DO NOT call these from middleware.ts - Next.js middleware runs on the Edge
//  runtime, which has no native module support. Server Actions and route
//  handlers only.
// ============================================================================

import { hash, verify, type Algorithm } from "@node-rs/argon2";

// OWASP baseline: m=19456 KiB, t=2, p=1. Target ~300ms per hash.
// Too fast is weak; too slow turns your own login endpoint into a DoS vector.

const ARGON2ID = 2 as Algorithm;

const OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19456, // KiB
  timeCost: 2,       // iterations
  parallelism: 1,
};

/**
 * The returned string is self-describing - it encodes the algorithm, version,
 * all three parameters, AND the salt. This is why the User table has no `salt`
 * column: adding one misunderstands the library.
 */
export function hashPassword(plaintext: string): Promise<string> {
  return hash(plaintext, OPTIONS);
}

/**
 * Never throws on a wrong password - returns false. It only throws if the
 * stored hash is malformed, which is data corruption, not a failed login.
 */
export async function verifyPassword(
  storedHash: string,
  plaintext: string,
): Promise<boolean> {
  try {
    return await verify(storedHash, plaintext);
  } catch {
    return false;
  }
}   
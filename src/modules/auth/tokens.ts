import { createHash, randomInt , randomBytes } from "crypto";


export function generateOtp():string{
return(
    String(randomInt(100000,1000000))
);
}

export function hashOtp (code:string):string{
   return createHash("sha256").update(code).digest("hex");
}


export function otpExpiry():Date{

    const tenMins= 10*60*1000;

  return(new Date(Date.now()+tenMins));
}



export function generateResetToken(): string {
  // base64url - safe inside a query string with no escaping.
  return randomBytes(32).toString("base64url");
}
 
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
 
export function resetExpiry(): Date {
  // Shorter than signup. A reset link sitting unused in an inbox is a liability.
  const thirtyMins = 30 * 60 * 1000;
  return new Date(Date.now() + thirtyMins);
}
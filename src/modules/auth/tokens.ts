import { createHash, randomInt } from "crypto";


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

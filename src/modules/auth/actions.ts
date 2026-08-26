"use server";
//import { fa } from "zod/locales";
import { signupSchema ,verifyOtpSchema } from "./schema";
import { startSignup , verifySignup} from "./service";
//import { error } from "console";

export async function signupAction(raw: unknown) {
    try{
    const parsed = signupSchema.safeParse(raw);
    if(!parsed.success){
        return{ok :false as const,error: parsed.error.issues[0].message}
    }
    await startSignup(parsed.data);
    return{ok:true as const};
    }catch(err){
     const code = err instanceof Error ? err.message : "UNKNOWN";
    return { ok: false as const, error: toUserMessage(code) };
    }
}


export async function verifyAction(raw: unknown) {
    try{
    const parsed = verifyOtpSchema.safeParse(raw);
    if(!parsed.success){
        return{ok :false as const,error: parsed.error.issues[0].message}
    }
    await verifySignup(parsed.data);
    return{ok:true as const}
    }catch(err){
     const code = err instanceof Error ? err.message : "UNKNOWN";
    return { ok: false as const, error: toUserMessage(code) };
    }
}











function toUserMessage(code: string): string {
  const messages: Record<string, string> = {
    INVALID_CODE: "That code is invalid or has expired.",
  };
  return messages[code] ?? "Something went wrong. Please try again.";
}
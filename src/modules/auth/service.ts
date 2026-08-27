import { hashPassword } from "@/lib/password";
import { sendEmail } from "@/lib/email";
import { generateOtp, hashOtp, otpExpiry } from "./tokens";
import { verificationEmail, duplicateSignupEmail } from "./emails";
import type { SignupInput, VerifyOtpInput } from "./schema";
import { createSignupToken, createVerifiedUser, deleteSignupToken, findSignupToken, findUserByEmail } from "./repository";


export async function startSignup( input: SignupInput ) : Promise<void> {

const{name, email, password} = input;


 //hash password
 const passwordHash = await hashPassword(password); 
 

 // check if there is an existing email like this one and STOP
const existing = await findUserByEmail(email); 

 if (existing && (existing.emailVerified || existing.passwordHash)){
  const dupmail= duplicateSignupEmail();
  await sendEmail({to: email , subject:dupmail.subject,html: dupmail.html});
   return;
 }
 

 //delete any pending record for this email
 await deleteSignupToken(email);

 //generate a code and send it to the email
 const generatedOtp = generateOtp();
 const hashedotp = hashOtp(generatedOtp);
 
//store in verificationtoken with payload
 await createSignupToken({ email, tokenHash: hashedotp, expires: otpExpiry(), payload: { name, passwordHash } });

 const veremail= verificationEmail(generatedOtp);
 await sendEmail({to:email,subject:veremail.subject,html:veremail.html});
  
}


export async function verifySignup(input: VerifyOtpInput): Promise<void> {

//recieve the email and code
 const {email, code} = input;

 //FETCH THE RECORD AND USE IT
 const record = await findSignupToken(email);


 //check if there is pending record
if(!record){
    throw new Error("INVALID_CODE")
}

//hash the otp and compare it
const newhashedOTp = hashOtp(code);

if(newhashedOTp !== record.token){
     throw new Error("INVALID_CODE")
}else if(record.expires < new Date()){
     await deleteSignupToken(email);
     throw new Error("INVALID_CODE");
}

const payload = record.payload as {name:string ; passwordHash:string};


await createVerifiedUser({name: payload.name , email , passwordHash: payload.passwordHash});

await deleteSignupToken(email);


}


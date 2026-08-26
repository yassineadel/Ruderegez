import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { sendEmail } from "@/lib/email";
import { generateOtp, hashOtp, otpExpiry } from "./tokens";
import { verificationEmail, duplicateSignupEmail } from "./emails";
import type { SignupInput, VerifyOtpInput } from "./schema";


export async function startSignup( input: SignupInput ) : Promise<void> {

const{name, email, password} = input;


 //hash password
 const passwordHash = await hashPassword(password); 
 

 // check if there is an existing email like this one and STOP
const existing = await prisma.user.findUnique({where:{email}}); 
const dupmail= duplicateSignupEmail();
 if (existing?.emailVerified){
  await sendEmail({to: email , subject:dupmail.subject,html: dupmail.html});
   return;
 }
 

 //delete any pending record for this email
 await prisma.verificationToken.deleteMany({ where: { identifier: email } });

 //generate a code and send it to the email
 const generatedOtp = generateOtp();
 const hashedotp = hashOtp(generatedOtp);
 
 const veremail= verificationEmail(generatedOtp);
 await sendEmail({to:email,subject:veremail.subject,html:veremail.html});
 
 //store in verificationtoken with payload
  await prisma.verificationToken.create({
  data: { identifier: email, token: hashedotp, expires: otpExpiry(), payload: {name , passwordHash} },
});

}


export async function verifySignup(input: VerifyOtpInput): Promise<void> {

//recieve the email and code
 const {email, code} = input;

 //FETCH THE RECORD AND USE IT
 const record = await prisma.verificationToken.findFirst({where:{identifier: email}});


 //check if there is pending record
if(!record){
    throw new Error("INVALID CODE OR CODE EXPIRED")
    return;
}


//hash the otp and compare it
const newhashedOTp = hashOtp(code);





if(newhashedOTp !== record?.token){
     throw new Error("INVALID CODE OR CODE EXPIRED")
}else if(record.expires < new Date()){
     await prisma.verificationToken.deleteMany({ where: { identifier: email } });
     throw new Error("INVALID CODE OR CODE EXPIRED");
}

const payload = record.payload as {name:string ; passwordHash:string};


await prisma.user.create({
    data:{
        name:payload.name,
        email:record.identifier ,
        passwordHash:payload.passwordHash,
        emailVerified: new Date()
    }
})
await prisma.verificationToken.deleteMany({ where: { identifier: email } });


}


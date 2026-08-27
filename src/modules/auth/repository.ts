import { prisma } from "@/lib/db";
import type { User, VerificationToken,Prisma } from "@/generated/prisma/client";



export function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email },
  });
}


export function deleteSignupToken(email:string): Promise<Prisma.BatchPayload>{
     return prisma.verificationToken.deleteMany({
        where:{identifier:email , type:"SIGNUP"},
    });
}

export function findSignupToken(email :string): Promise<VerificationToken | null >{
    return prisma.verificationToken.findFirst({
        where:{identifier:email , type:"SIGNUP"},
    });
}

export function createSignupToken(data: {
  email: string;
  tokenHash: string;
  expires: Date;
  payload: { name: string; passwordHash: string };
}): Promise<VerificationToken> {
  return prisma.verificationToken.create({
    data: {
      identifier: data.email,
      token: data.tokenHash,
      expires: data.expires,
      payload: data.payload,
      type: "SIGNUP",
    },
  });
}

export function createVerifiedUser(data: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<User> {
  return prisma.user.create({
    data: { ...data, emailVerified: new Date() },
  });
}



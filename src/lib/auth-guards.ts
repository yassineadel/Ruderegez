import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";


export async function requireUser() {
//1. Get the current session
const session = await auth();
//2. If there is no session, or no user in it → throw "UNAUTHORIZED"
if(!session?.user){
    throw new Error("UNAUTHORIZED");
}
//3. Look up that user in the database by their id
const foundSession = await prisma.user.findUnique({where:{id:session.user.id}});
//4. If not found, or they are blocked → throw "BLOCKED"
if(!foundSession || foundSession.isBlocked){
    throw new Error("BLOCKED");
}
//5. Return the user
return foundSession;
}

export async function requireAdmin() {
// 1. Call requireUser() and keep what it returns
const user = await requireUser();
//2. If their role is not "ADMIN" → throw "FORBIDDEN"
if(user.role !== "ADMIN"){
    throw new Error("FORBIDDEN");
}
//3. Return the user
return user;
}

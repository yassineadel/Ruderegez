import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Lets Auth.js read/write your User and Account tables.
  // Used by Google. Credentials bypasses it (library limitation).
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "jwt",           // forced by Credentials - Option A
    maxAge: 15 * 60,           // 15 min. Blocking takes effect within this.
  },

  pages: {
    signIn: "/sign-in",        // your page, not Auth.js's default
  },

  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true,   // FR-04, see note below
    }),

    Credentials({
      credentials: { email: {}, password: {} },

      // Returns a user object on success, null on failure.
      // Auth.js turns whatever you return into the session.
      async authorize(creds) {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });

        // Every failure returns null - same response for "no such user",
        // "wrong password", "not verified", "blocked". No enumeration.
        if (!user?.passwordHash) return null;
        if (!user.emailVerified) return null;
        if (user.isBlocked) return null;

        const ok = await verifyPassword(user.passwordHash, password);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],

  callbacks: {
    // Runs when the token is created and on every refresh.
    // Whatever you put here is signed into the cookie.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },

    // Shapes what your code sees when it calls auth().
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
});
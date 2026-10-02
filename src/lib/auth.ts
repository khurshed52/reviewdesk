import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { rateLimit, requestAddress } from "@/lib/rate-limit";
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        await rateLimit("login-account", parsed.data.email, 10, 900);
        await rateLimit("login-ip", await requestAddress(), 100, 900);
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        // A fixed bcrypt hash keeps nonexistent accounts on the password verification path.
        const valid = await compare(
          parsed.data.password,
          user?.passwordHash ??
            "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW",
        );
        if (!user || !user.passwordHash || !valid) return null;
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      if (!token.sub) return null;
      // A signed JWT is not proof that its database account still exists.
      const currentUser = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { id: true },
      });
      return currentUser ? token : null;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});

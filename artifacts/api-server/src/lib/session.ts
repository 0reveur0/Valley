import session from "express-session";

const SESSION_SECRET = process.env.SESSION_SECRET ?? "valley-dev-secret-change-in-prod";

export const sessionMiddleware = session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
});

declare module "express-session" {
  interface SessionData {
    userId: string;
    userEmail: string;
    userRole: "Admin" | "User";
    membershipType: "Free" | "Premium";
    credits: number;
  }
}

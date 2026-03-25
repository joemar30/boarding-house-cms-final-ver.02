import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

// Dev user for local development when LOCAL_DEV_AUTH is enabled
const DEV_USER: User = {
  id: 1,
  openId: "dev-local-user",
  name: "Dev Admin",
  email: "admin@localhost",
  loginMethod: "local",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Local dev auth bypass: auto-login as dev user when LOCAL_DEV_AUTH is set
  if (!user && process.env.LOCAL_DEV_AUTH === "true") {
    // Check if the dev-login cookie is present
    const cookies = opts.req.headers.cookie || "";
    if (cookies.includes("dev_logged_in=true")) {
      user = DEV_USER;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}


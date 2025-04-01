import "express-session";

declare module "express-session" {
  interface Session {
    userId: string;
    username: string;
    displayName: string;
    createdAt: Date;
    updatedAt: Date;
  }
}

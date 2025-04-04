import "express-session";

declare module "express-session" {
  interface Session {
    user: {
      id: string;
      username: string;
      displayName: string;
      createdAt: Date;
      updatedAt: Date;
    };
    userDeckIds: string[];
  }
}

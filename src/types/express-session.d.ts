import "express-session";
import { Lobby } from "../models/redis/LobbyModel";

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
    lobby: Lobby | "none";
  }
}

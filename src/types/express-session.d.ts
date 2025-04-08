import "express-session";

declare module "express-session" {
  interface Session {
    user: {
      id: string;
      displayName: string;
      username: string;
      createdAt: Date;
      updatedAt: Date;
    };
    userDecksIds: string[];
    lobbyId: string;
    gameId: string;
  }
}

import BaseLogger from "../utils/logger";
import { GameModel } from "../models/redis/GameModel";
import { SocketError } from "../websockets/types";
import { Session } from "express-session";

export default class GameController {
  constructor(
    private readonly logger: BaseLogger,
    private readonly gameModel: GameModel,
  ) {}

  async removePlayer(gameId: string, playerId: string) {
    console.log("removePlayer", gameId, playerId);
    return;
  }

  async leaveCurrentGame(session: Session) {
    if (session.gameId === "none") {
      throw new SocketError("client_error", "User is not in a game");
    }

    const gameId = session.gameId;
    try {
      await this.gameModel.removePlayer(gameId, session.user.id);
    } catch (error) {
      throw new SocketError("server_error", `Error leaving game: (${error})`);
    }

    session.gameId = "none";
    return { session, gameId };
  }
}

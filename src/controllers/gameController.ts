import BaseLogger from "../utils/logger";
import { GameModel } from "../models/redis/GameModel";
import { SocketError } from "../websockets/types";
import { Session } from "express-session";
import { PlayerNumber } from "../services/GameService/components/Game";
import { GameService } from "../services/GameService/GameService";
export default class GameController {
  constructor(
    private readonly logger: BaseLogger,
    private readonly gameModel: GameModel,
    private readonly gameService: GameService,
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

  async debugDamageEnemyPlayer(gameId: string, playerNumber: PlayerNumber) {
    try {
      return await this.gameService.debugDamageEnemyPlayer(
        gameId,
        playerNumber,
      );
    } catch (error) {
      throw new SocketError(
        "server_error",
        `Error damaging enemy player: (${error})`,
      );
    }
  }
}

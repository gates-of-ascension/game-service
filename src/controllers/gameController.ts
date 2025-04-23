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

  async removeUserSessionGame(session: Session) {
    if (session.gameId === "none") {
      throw new SocketError(
        "client_error",
        "Cannot remove user from game, user is not in a game",
      );
    }

    const gameId = session.gameId;
    const game = await this.gameModel.removePlayer(gameId, session.user.id);

    session.gameId = "none";
    return game;
  }

  async debugDamageEnemyPlayer(gameId: string, playerNumber: PlayerNumber) {
    try {
      return await this.gameService.debugDamageEnemyPlayer(gameId, {
        initiator: playerNumber,
        target: playerNumber === 1 ? 2 : 1,
      });
    } catch (error) {
      throw new SocketError(
        "server_error",
        `Error damaging enemy player: (${error})`,
      );
    }
  }
}

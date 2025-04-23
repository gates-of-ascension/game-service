import BaseLogger from "../utils/logger";
import { GameModel } from "../models/redis/GameModel";
import { SocketError } from "../websockets/types";
import { Session } from "express-session";
import { PlayerNumber } from "../services/GameService/components/Game";
import { GameService } from "../services/GameService/GameService";
import { StateChanges } from "../services/GameService/components/StateChangesManager";
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
    let game = null;
    try {
      game = await this.gameModel.removePlayer(gameId, session.user.id);
    } catch (error) {
      this.logger.error(`Error removing player from game: (${error})`);
    }

    let gameStateChanges: StateChanges[] = [];
    if (game) {
      try {
        gameStateChanges = await this.gameService.leaveGame(
          gameId,
          session.user.id,
        );
      } catch (error) {
        this.logger.error(`Error leaving game: (${error})`);
      }
    }

    session.gameId = "none";
    return { game, gameStateChanges };
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

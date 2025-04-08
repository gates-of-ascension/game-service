import BaseLogger from "../utils/logger";
import { GameModel } from "../models/redis/GameModel";

export default class GameController {
  constructor(
    private readonly logger: BaseLogger,
    private readonly gameModel: GameModel,
  ) {}

  async removePlayer(gameId: string, playerId: string) {
    console.log("removePlayer", gameId, playerId);
    return;
  }
}

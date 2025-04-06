import { Session } from "express-session";
import BaseLogger from "../utils/logger";
import { Game, GameModel } from "../models/redis/GameModel";

export default class GameController {
  constructor(
    private readonly logger: BaseLogger,
    private readonly gameModel: GameModel,
  ) {}

  async createGame(session: Session, game: Game) {
    console.log("createGame", session, game);
    return;
  }

  async removePlayer(gameId: string, playerId: string) {
    console.log("removePlayer", gameId, playerId);
    return;
  }
}

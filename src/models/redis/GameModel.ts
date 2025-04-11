import { RedisClient } from "../../initDatastores";
import BaseLogger from "../../utils/logger";
import BaseRedisModel from "./BaseRedisModel";
import { v4 as uuidv4 } from "uuid";
import { GameSession, GameSessionUser } from "../../websockets/types";

export type CreateGameOptions = {
  lobbyId: string;
  players: GameSessionUser[];
  gameData: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
};

export class GameModel extends BaseRedisModel<GameSession> {
  constructor(redisClient: RedisClient, logger: BaseLogger) {
    super(redisClient, "game", logger);
  }

  async create(game: CreateGameOptions): Promise<GameSession> {
    const createdGame = {
      ...game,
      id: uuidv4(),
    };
    await this.redisClient.set(
      this.getKey(createdGame.id),
      JSON.stringify(createdGame),
    );
    return createdGame;
  }

  async get(id: string): Promise<GameSession | null> {
    const data = await this.redisClient.get(this.getKey(id));
    if (!data) return null;
    return JSON.parse(data) as GameSession;
  }

  async update(id: string, data: GameSession): Promise<void> {
    const game = await this.get(id);
    if (!game) throw new Error(`Game with id (${id}) not found`);

    const updatedGame = {
      ...game,
      ...data,
      updatedAt: new Date(),
    };

    await this.redisClient.set(this.getKey(id), JSON.stringify(updatedGame));
  }

  async delete(id: string): Promise<void> {
    await this.redisClient.del(this.getKey(id));
  }

  async removePlayer(gameId: string, playerId: string): Promise<void> {
    const game = await this.get(gameId);
    if (!game) throw new Error(`Game with id (${gameId}) not found`);

    game.players = game.players.filter((p) => p.id !== playerId);

    if (game.players.length === 0) {
      this.logger.warn(`Game with id (${gameId}) is now empty, deleting...`);
      await this.delete(gameId);
    } else {
      await this.update(gameId, game);
    }
  }
}

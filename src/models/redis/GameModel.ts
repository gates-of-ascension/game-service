import { RedisClient } from "../../initDatastores";
import BaseLogger from "../../utils/logger";
import BaseRedisModel from "./BaseRedisModel";
import { v4 as uuidv4 } from "uuid";

export type GamePlayer = {
  id: string;
  displayName: string;
};

export type Game = {
  id: string;
  lobbyId: string;
  players: GamePlayer[];
  state: "starting" | "in_progress" | "completed";
  gameData: Record<string, unknown>;
  startedAt: number;
  updatedAt: number;
};

export type CreateGameOptions = {
  lobbyId: string;
  players: GamePlayer[];
  id?: string;
  gameData: Record<string, unknown>;
};

export class GameModel extends BaseRedisModel<Game> {
  constructor(redisClient: RedisClient, logger: BaseLogger) {
    super(redisClient, "game", logger);
  }

  async create(data: CreateGameOptions): Promise<string> {
    const game = {
      ...data,
      id: data.id || uuidv4(),
      players: data.players,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };
    await this.redisClient.set(this.getKey(game.id), JSON.stringify(game));
    return game.id;
  }

  async get(id: string): Promise<Game | null> {
    const data = await this.redisClient.get(this.getKey(id));
    if (!data) return null;
    return JSON.parse(data) as Game;
  }

  async update(id: string, data: Game): Promise<void> {
    const game = await this.get(id);
    if (!game) throw new Error(`Game with id (${id}) not found`);

    const updatedGame = {
      ...game,
      ...data,
      updatedAt: Date.now(),
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
      this.logger.warn(`Game with id (${gameId}) is empty, deleting...`);
      await this.delete(gameId);
    } else {
      await this.update(gameId, game);
    }
  }
}

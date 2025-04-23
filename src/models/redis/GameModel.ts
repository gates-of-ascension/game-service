import { RedisClient } from "../../initDatastores";
import BaseLogger from "../../utils/logger";
import BaseRedisModel from "./BaseRedisModel";
import { v4 as uuidv4 } from "uuid";
import { GameSession, GameSessionUser } from "../../websockets/types";

export type CreateGameOptions = {
  lobbyId: string;
  players: GameSessionUser[];
  gameData: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

export class GameModel extends BaseRedisModel<GameSession> {
  private readonly defaultTTL: number;

  constructor(redisClient: RedisClient, logger: BaseLogger) {
    super(redisClient, "game", logger);
    this.defaultTTL = 60 * 60 * 24 * 30; // 30 days
  }

  async setGameActive(gameId: string, active: boolean): Promise<void> {
    if (active) {
      await this.redisClient.sAdd("active_games", gameId);
    } else {
      await this.redisClient.sRem("active_games", gameId);
    }
  }

  async getActiveGames(): Promise<{ id: string; players: string[] }[]> {
    const activeGames = await this.redisClient.sMembers("active_games");
    if (activeGames.length === 0) return [];
    const gamesData = await this.redisClient.mGet(
      activeGames.map((id) => this.getKey(id)),
    );
    return gamesData
      .filter((data) => data !== null)
      .map((data) => {
        const game = JSON.parse(data) as GameSession;
        return {
          id: game.id,
          players: game.players.map((p) => p.id),
        };
      });
  }

  async create(game: CreateGameOptions): Promise<GameSession> {
    const createdGame = {
      ...game,
      id: uuidv4(),
    };
    await this.redisClient.set(
      this.getKey(createdGame.id),
      JSON.stringify(createdGame),
      {
        EX: this.defaultTTL,
      },
    );
    return createdGame as GameSession;
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

  async removePlayer(
    gameId: string,
    playerId: string,
  ): Promise<GameSession | null> {
    const game = await this.get(gameId);
    if (!game) {
      this.logger.warn(
        `Game with id (${gameId}) not found, skipping player removal...`,
      );
      return null;
    }

    game.players = game.players.filter((p) => p.id !== playerId);

    if (game.players.length === 0) {
      this.logger.warn(`Game with id (${gameId}) is now empty, deleting...`);
      await this.delete(gameId);
      return null;
    } else {
      await this.update(gameId, game);
    }

    return game;
  }
}

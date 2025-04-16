import { Sequelize } from "@sequelize/core";
import { GameModel as RedisGameStore } from "../models/redis/GameModel";
import BaseLogger from "../utils/logger";
import { formatSequelizeError } from "../utils/sequelizeErrorHelper";
import { Game as postgresGameModel } from "../models/postgres/Game";
import { GamePlayer as postgresGamePlayerModel } from "../models/postgres/GamePlayer";
import { GameStateHistory as postgresGameStateHistoryModel } from "../models/postgres/GameStateHistory";
import { Game } from "./components/Game";
export class GameService {
  private readonly redisGameStore: RedisGameStore;
  private readonly logger: BaseLogger;
  private activeGameAndPlayers: Map<string, string[]>;
  private gameIdToGameMap: Map<string, Game>;
  private readonly sequelize: Sequelize;

  constructor(options: {
    redisGameStore: RedisGameStore;
    logger: BaseLogger;
    sequelize: Sequelize;
  }) {
    this.logger = options.logger;
    this.redisGameStore = options.redisGameStore;
    this.activeGameAndPlayers = new Map();
    this.sequelize = options.sequelize;
    this.gameIdToGameMap = new Map();
  }

  async init() {
    this.logger.debug(
      `Iniitalizing game service, checking for active games...`,
    );
    const activeGames = await this.redisGameStore.getActiveGames();
    activeGames.forEach((game) => {
      this.activeGameAndPlayers.set(game.id, game.players);
    });
    // activeGames.forEach((game) => {
    //   this.gameIdToGameMap.set(game.id, new Game({ id: game.id }));
    // });
    this.logger.debug(`Found ${this.activeGameAndPlayers.size} active games`);
  }

  async createActiveGame(gameId: string, players: string[]) {
    await this.redisGameStore.setGameActive(gameId, true);
    this.activeGameAndPlayers.set(gameId, players);
  }

  async createGameState(gameId: string, state: Record<string, unknown>) {
    await postgresGameStateHistoryModel.create({
      gameId,
      state,
      createdAt: new Date(),
    });
  }

  async createGame(game: {
    lobbyId: string;
    players: { id: string; displayName: string; joinedAt: Date }[];
    gameData: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  }) {
    try {
      return await this.sequelize.transaction(async () => {
        const createdGame = await this.redisGameStore.create(game);
        this.activeGameAndPlayers.set(
          createdGame.id,
          createdGame.players.map((p) => p.id),
        );
        await this.createActiveGame(
          createdGame.id,
          createdGame.players.map((p) => p.id),
        );

        await postgresGameModel.create({
          id: createdGame.id,
          turns: 0,
          createdAt: createdGame.createdAt,
          updatedAt: createdGame.updatedAt,
          isActive: true,
        });

        await Promise.all([
          postgresGamePlayerModel.bulkCreate(
            createdGame.players.map((p) => ({
              gameId: createdGame.id,
              userId: p.id,
              result: "in_progress",
            })),
            {
              updateOnDuplicate: ["result"],
            },
          ),
          postgresGameStateHistoryModel.create({
            gameId: createdGame.id,
            state: { turn: 0 },
            createdAt: createdGame.createdAt,
          }),
        ]);

        const newGame = new Game({ id: createdGame.id });
        await newGame.initializeGame(
          createdGame.players.map((p, index) => ({
            id: p.id,
            playerNumber: index + 1,
          })),
        );

        this.gameIdToGameMap.set(createdGame.id, newGame);

        return createdGame;
      });
    } catch (error) {
      const errorResponse = formatSequelizeError(error as Error, this.logger);
      console.error(errorResponse);
      throw errorResponse;
    }
  }
}

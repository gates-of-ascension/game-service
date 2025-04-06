import BaseLogger from "./utils/logger";
import UsersController from "./controllers/usersController";
import CardsController from "./controllers/cardsController";
import UserDecksController from "./controllers/userDecksController";
import Sequelize from "@sequelize/core";
import { RedisClient } from "./initDatastores";
import LobbyController from "./controllers/lobbyController";
import GameController from "./controllers/gameController";
import { LobbyModel } from "./models/redis/LobbyModel";
import { GameModel } from "./models/redis/GameModel";
export interface Controllers {
  usersController: UsersController;
  cardsController: CardsController;
  userDecksController: UserDecksController;
  lobbyController: LobbyController;
  gameController: GameController;
}

export default async function createControllers(params: {
  logger: BaseLogger;
  sequelize: Sequelize;
  redisClient: RedisClient;
  lobbyModel: LobbyModel;
  gameModel: GameModel;
}): Promise<Controllers> {
  const { logger, sequelize, redisClient, lobbyModel, gameModel } = params;

  const usersController = new UsersController(logger, redisClient);
  const cardsController = new CardsController(logger);
  const userDecksController = new UserDecksController(logger, sequelize);
  const lobbyController = new LobbyController(logger, lobbyModel);
  const gameController = new GameController(logger, gameModel);
  return {
    usersController,
    cardsController,
    userDecksController,
    lobbyController,
    gameController,
  };
}

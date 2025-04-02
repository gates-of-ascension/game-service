import BaseLogger from "./utils/logger";
import UsersController from "./controllers/usersController";
import CardsController from "./controllers/cardsController";
import UserDecksController from "./controllers/userDecksController";
import Sequelize from "@sequelize/core";
import { RedisClient } from "./initDatastores";
import LobbiesController from "./controllers/lobbiesController";
import { LobbyModel } from "./models/redis/LobbyModel";
export interface Controllers {
  usersController: UsersController;
  cardsController: CardsController;
  userDecksController: UserDecksController;
  lobbiesController: LobbiesController;
}

export default async function createControllers(params: {
  logger: BaseLogger;
  sequelize: Sequelize;
  redisClient: RedisClient;
  lobbyModel: LobbyModel;
}): Promise<Controllers> {
  const { logger, sequelize, redisClient, lobbyModel } = params;

  const usersController = new UsersController(logger, redisClient);
  const cardsController = new CardsController(logger);
  const userDecksController = new UserDecksController(logger, sequelize);
  const lobbiesController = new LobbiesController(logger, lobbyModel);
  return {
    usersController,
    cardsController,
    userDecksController,
    lobbiesController,
  };
}

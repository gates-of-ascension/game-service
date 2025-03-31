import BaseLogger from "./utils/logger";
import UsersController from "./controllers/usersController";
import CardsController from "./controllers/cardsController";
import UserDecksController from "./controllers/userDecksController";
import Sequelize from "@sequelize/core";
export interface Controllers {
  usersController: UsersController;
  cardsController: CardsController;
  userDecksController: UserDecksController;
}

export default async function createControllers(params: {
  logger: BaseLogger;
  sequelize: Sequelize;
}): Promise<Controllers> {
  const { logger, sequelize } = params;

  const usersController = new UsersController(logger);
  const cardsController = new CardsController(logger);
  const userDecksController = new UserDecksController(logger, sequelize);
  return {
    usersController,
    cardsController,
    userDecksController,
  };
}

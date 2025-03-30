import BaseLogger from "./utils/logger";
import UsersController from "./controllers/usersController";
import CardsController from "./controllers/cardsController";
import UserDecksController from "./controllers/userDecksController";
export interface Controllers {
  usersController: UsersController;
  cardsController: CardsController;
  userDecksController: UserDecksController;
}

export default async function createControllers(params: {
  logger: BaseLogger;
}): Promise<Controllers> {
  const { logger } = params;

  const usersController = new UsersController(logger);
  const cardsController = new CardsController(logger);
  const userDecksController = new UserDecksController(logger);
  return {
    usersController,
    cardsController,
    userDecksController,
  };
}

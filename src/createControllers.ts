import BaseLogger from "./utils/logger";
import UsersController from "./controllers/usersController";

export interface Controllers {
  usersController: UsersController;
}

export default async function createControllers(params: {
  logger: BaseLogger;
}): Promise<Controllers> {
  const { logger } = params;

  const usersController = new UsersController(logger);
  return {
    usersController,
  };
}

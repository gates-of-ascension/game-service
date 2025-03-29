import BaseLogger from "../utils/logger";
import User from "../models/User";
import { ApiError } from "../middleware/apiError";
import { formatSequelizeError } from "../utils/sequelizeErrorHelper";

export default class UsersController {
  constructor(private readonly logger: BaseLogger) {}

  async getUserById(userId: string) {
    let user;
    try {
      user = await User.findByPk(userId);
    } catch (error) {
      const errorResponse = formatSequelizeError(error as Error, this.logger);
      throw new ApiError(errorResponse.status, errorResponse.message);
    }

    if (!user) {
      throw new ApiError(404, `User ${userId} not found`);
    }

    return user;
  }

  async createUser(displayName: string, username: string, password: string) {
    let newUser;
    try {
      newUser = await User.create({ displayName, username, password });
    } catch (error) {
      const errorResponse = formatSequelizeError(error as Error, this.logger);
      throw new ApiError(errorResponse.status, errorResponse.message);
    }

    return newUser;
  }
}

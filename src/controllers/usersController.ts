import BaseLogger from "../utils/logger";
import User from "../models/user";
import { ApiError } from "../utils/apiError";

export default class UsersController {
  constructor(private readonly logger: BaseLogger) {}

  async getUserById(userId: string) {
    let user;
    try {
      user = await User.findUserById(userId);
    } catch (error) {
      throw new ApiError(
        500,
        `Failed to get user ${userId} due to error: (${error})`,
      );
    }

    if (!user) {
      throw new ApiError(404, `User ${userId} not found`);
    }

    return user;
  }
}

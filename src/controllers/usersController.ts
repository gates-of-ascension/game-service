import BaseLogger from "../utils/logger";
import User from "../models/User";
import { ApiError } from "../middleware/apiError";
import { formatSequelizeError } from "../utils/sequelizeErrorHelper";
import { CreateUserRequestBody, UpdateUserRequestBody } from "../types/user";
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
      throw new ApiError(
        404,
        `Could not find user with id (${userId}), user not found`,
      );
    }

    return user;
  }

  async createUser(requestBody: CreateUserRequestBody) {
    let newUser;
    const createUserOptions = {} as CreateUserRequestBody;

    if (requestBody.displayName) {
      createUserOptions.displayName = requestBody.displayName;
    }
    if (requestBody.username) {
      createUserOptions.username = requestBody.username;
    }
    if (requestBody.password) {
      createUserOptions.password = requestBody.password;
    }

    try {
      newUser = (await User.create(createUserOptions, {
        returning: true,
      })) as User;
    } catch (error) {
      const errorResponse = formatSequelizeError(error as Error, this.logger);
      throw new ApiError(errorResponse.status, errorResponse.message);
    }

    return newUser.toJSON();
  }

  async updateUser(userId: string, requestBody: UpdateUserRequestBody) {
    let updatedUser;
    const updateUserOptions = {} as UpdateUserRequestBody;

    if (requestBody.displayName) {
      updateUserOptions.displayName = requestBody.displayName;
    }
    if (requestBody.username) {
      updateUserOptions.username = requestBody.username;
    }
    if (requestBody.password) {
      updateUserOptions.password = requestBody.password;
    }

    try {
      updatedUser = (await User.update(updateUserOptions, {
        where: { id: userId },
        returning: true,
      })) as [number, User[]];
    } catch (error) {
      const errorResponse = formatSequelizeError(error as Error, this.logger);
      throw new ApiError(errorResponse.status, errorResponse.message);
    }

    if (updatedUser[0] === 0) {
      throw new ApiError(
        404,
        `Could not update user with id (${userId}), user not found`,
      );
    }

    return updatedUser[1][0].toJSON();
  }

  async deleteUser(userId: string) {
    let deletedUser;
    try {
      deletedUser = await User.destroy({ where: { id: userId } });
    } catch (error) {
      const errorResponse = formatSequelizeError(error as Error, this.logger);
      throw new ApiError(errorResponse.status, errorResponse.message);
    }

    if (!deletedUser) {
      throw new ApiError(
        404,
        `Could not delete user with id (${userId}), user not found`,
      );
    }

    return deletedUser;
  }
}

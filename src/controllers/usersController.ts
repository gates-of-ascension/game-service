import BaseLogger from "../utils/logger";
import User from "../models/postgres/User";
import { ApiError } from "../middleware/apiError";
import { formatSequelizeError } from "../utils/sequelizeErrorHelper";
import { CreateUserRequestBody, UpdateUserRequestBody } from "../types/user";
import bcrypt from "bcrypt";
import { RedisClient } from "../initDatastores";
import UserDeck from "../models/postgres/UserDeck";

export default class UsersController {
  constructor(
    private readonly logger: BaseLogger,
    private readonly redisClient: RedisClient,
  ) {}

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

    const returnUser = user.toJSON();

    return {
      id: returnUser.id,
      displayName: returnUser.displayName,
      username: returnUser.username,
      createdAt: returnUser.createdAt,
      updatedAt: returnUser.updatedAt,
    };
  }

  async signup(requestBody: CreateUserRequestBody) {
    const createUserOptions = {} as CreateUserRequestBody;

    createUserOptions.displayName = requestBody.displayName;
    createUserOptions.username = requestBody.username;
    createUserOptions.password = await bcrypt.hash(requestBody.password, 10);

    let newUser;
    try {
      newUser = await User.create(createUserOptions, {
        returning: true,
      });
    } catch (error) {
      const errorResponse = formatSequelizeError(error as Error, this.logger);
      throw new ApiError(errorResponse.status, errorResponse.message);
    }

    const returnUser = newUser.toJSON();

    return {
      id: returnUser.id,
      displayName: returnUser.displayName,
      username: returnUser.username,
      createdAt: returnUser.createdAt,
      updatedAt: returnUser.updatedAt,
    };
  }

  async login(requestBody: {
    username: string;
    password: string;
    lobbyId?: string;
  }) {
    let user;
    try {
      user = await User.findOne({
        where: { username: requestBody.username },
      });
    } catch (error) {
      const errorResponse = formatSequelizeError(error as Error, this.logger);
      throw new ApiError(errorResponse.status, errorResponse.message);
    }

    if (!user) {
      throw new ApiError(401, "Invalid username or password");
    }

    let isPasswordValid;
    try {
      isPasswordValid = await bcrypt.compare(
        requestBody.password,
        user.password,
      );
    } catch (error) {
      const errorResponse = formatSequelizeError(error as Error, this.logger);
      throw new ApiError(errorResponse.status, errorResponse.message);
    }

    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid username or password");
    }

    let userDecks;
    try {
      userDecks = await UserDeck.findAll({
        where: { userId: user.id },
        attributes: ["id"],
        raw: true,
      });
    } catch (error) {
      const errorResponse = formatSequelizeError(error as Error, this.logger);
      throw new ApiError(errorResponse.status, errorResponse.message);
    }

    let lobbyId = "none";
    if (requestBody.lobbyId) {
      try {
        const lobby = await this.redisClient.get(
          `lobby:${requestBody.lobbyId}`,
        );
        this.logger.debug(
          `User (${user.username}) lobby (${requestBody.lobbyId}) found in redis: (${lobby})`,
        );
        if (!lobby) {
          this.logger.error(
            `User (${user.username}) lobby (${requestBody.lobbyId}) not found in redis, returning none`,
          );
          lobbyId = "none";
        } else {
          lobbyId = requestBody.lobbyId;
        }
      } catch (error) {
        const errorResponse = formatSequelizeError(error as Error, this.logger);
        throw new ApiError(errorResponse.status, errorResponse.message);
      }
    }

    this.logger.debug(
      `User (${user.username}) logged in, returning lobby (${lobbyId})`,
    );

    return {
      user: {
        id: user.id,
        displayName: user.displayName,
        username: user.username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      userDecksIds: userDecks.map((userDeck) => userDeck.id),
      lobbyId,
    };
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

    const returnUser = updatedUser[1][0].toJSON();

    return {
      id: returnUser.id,
      displayName: returnUser.displayName,
      username: returnUser.username,
      createdAt: returnUser.createdAt,
      updatedAt: returnUser.updatedAt,
    };
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

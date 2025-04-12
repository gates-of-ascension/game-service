import BaseLogger from "../utils/logger";
import User from "../models/postgres/User";
import { ApiError } from "../middleware/apiError";
import { formatSequelizeError } from "../utils/sequelizeErrorHelper";
import { CreateUserRequestBody, UpdateUserRequestBody } from "../types/user";
import bcrypt from "bcrypt";
import { RedisClient } from "../initDatastores";
import UserDeck from "../models/postgres/UserDeck";
import { Session } from "express-session";
import {
  UserSessionData,
  UserSessionStore,
} from "../models/redis/UserSessionStore";

export default class UsersController {
  constructor(
    private readonly logger: BaseLogger,
    private readonly redisClient: RedisClient,
    private readonly userSessionStore: UserSessionStore,
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
    session: Session;
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
    const userDecksIds = userDecks.map((userDeck) => userDeck.id);

    const userSession = {
      user: {
        id: user.id,
        displayName: user.displayName,
        username: user.username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      userDecksIds,
      lobbyId: "none",
      gameId: "none",
    } as UserSessionData;

    let lobbyId = "none";
    let gameId = "none";
    try {
      const { lobbyId: newLobbyId, gameId: newGameId } =
        await this.userSessionStore.transferUserSession(
          user.id,
          requestBody.session.id,
        );
      lobbyId = newLobbyId;
      gameId = newGameId;
    } catch (error) {
      this.logger.error(
        `Error during transfer of previous user session (${user.username}) from redis: (${error})`,
      );
    }
    userSession.lobbyId = lobbyId;
    userSession.gameId = gameId;

    return userSession;
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

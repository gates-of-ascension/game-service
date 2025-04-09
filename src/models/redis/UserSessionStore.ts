// src/utils/customRedisStore.ts
import { RedisStore } from "connect-redis";
import { RedisClient } from "../../initDatastores";
import BaseLogger from "../../utils/logger";
import { LobbyModel } from "./LobbyModel";

export interface UserSessionData {
  sessionId: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    createdAt: Date;
    updatedAt: Date;
  };
  userDecksIds: string[];
  lobbyId: string;
  gameId: string;
}

export class UserSessionStore extends RedisStore {
  private readonly redisClient: RedisClient;
  private readonly logger: BaseLogger;
  private readonly defaultTTL: number;
  private readonly lobbyModel: LobbyModel;

  constructor(options: {
    client: RedisClient;
    prefix: string;
    logger: BaseLogger;
    lobbyModel: LobbyModel;
  }) {
    super({
      client: options.client,
      prefix: options.prefix,
    });
    this.redisClient = options.client;
    this.logger = options.logger;
    this.defaultTTL = 60 * 60 * 24 * 30; // 30 days
    this.lobbyModel = options.lobbyModel;
  }

  async getUserActiveSession(userId: string): Promise<string | null> {
    try {
      const userSessionKey = `user_active_session:${userId}`;
      return await this.redisClient.get(userSessionKey);
    } catch (error) {
      this.logger.error(
        `Error getting active session for user (${userId}): (${error})`,
      );
      return null;
    }
  }

  async setUserActiveSession(userId: string, sessionId: string): Promise<void> {
    try {
      const userSessionKey = `user_active_session:${userId}`;
      await this.redisClient.set(userSessionKey, sessionId, {
        EX: this.defaultTTL,
      });
    } catch (error) {
      this.logger.error(
        `Error setting active session for user (${userId}): (${error})`,
      );
    }
  }

  async setUserActiveSocket(userId: string, socketId: string): Promise<void> {
    try {
      const userActiveSocketKey = `user_active_socket:${userId}`;
      await this.redisClient.set(userActiveSocketKey, socketId, {
        EX: this.defaultTTL,
      });
    } catch (error) {
      this.logger.error(`Error setting user socket (${userId}): (${error})`);
    }
  }

  async getUserActiveSocket(userId: string): Promise<string | null> {
    try {
      const userActiveSocketKey = `user_active_socket:${userId}`;
      return await this.redisClient.get(userActiveSocketKey);
    } catch (error) {
      this.logger.error(`Error getting user socket (${userId}): (${error})`);
      return null;
    }
  }

  async deleteUserActiveSocket(userId: string): Promise<void> {
    try {
      const userActiveSocketKey = `user_active_socket:${userId}`;
      await this.redisClient.del(userActiveSocketKey);
    } catch (error) {
      this.logger.error(`Error deleting user socket (${userId}): (${error})`);
    }
  }

  async getUserSession(sessionId: string): Promise<UserSessionData | null> {
    const sessionData = await this.redisClient.get(
      `${this.prefix}${sessionId}`,
    );
    if (!sessionData) {
      return null;
    }

    const session = JSON.parse(sessionData);

    return {
      sessionId: sessionId,
      user: session.user,
      userDecksIds: session.userDecksIds,
      lobbyId: session.lobbyId || "none",
      gameId: session.gameId || "none",
    };
  }

  async transferUserSession(
    userId: string,
    newSessionId: string,
  ): Promise<string> {
    /*
    The only variable we need from redis is the lobbyId. The rest of the data
    is stored in postgres.
    */

    let lobbyId = "none";
    const oldSessionId = await this.getUserActiveSession(userId);
    if (oldSessionId) {
      const oldSessionData = await this.getUserSession(oldSessionId);
      if (oldSessionData?.lobbyId) {
        lobbyId = oldSessionData.lobbyId;
        const lobby = await this.lobbyModel.get(lobbyId);
        if (!lobby) {
          this.logger.error(
            `Lobby (${lobbyId}) not found, setting lobbyId to none`,
          );
          lobbyId = "none";
        }
      }
    }

    await this.redisClient.del(`user_active_session:${userId}`);

    await this.redisClient.set(`user_active_session:${userId}`, newSessionId, {
      EX: this.defaultTTL,
    });

    if (oldSessionId) {
      await this.destroy(oldSessionId);
    }

    return lobbyId;
  }

  async setGameIdForUser(userId: string, gameId: string): Promise<void> {
    const sessionId = await this.getUserActiveSession(userId);
    if (sessionId) {
      const userSession = await this.getUserSession(sessionId);
      if (userSession) {
        await this.redisClient.set(
          `session:${sessionId}`,
          JSON.stringify({
            ...userSession,
            gameId,
          }),
        );
      }
    }
  }

  async forceLogout(userId: string): Promise<void> {
    try {
      const sessionId = await this.getUserActiveSession(userId);

      if (sessionId) {
        await this.destroy(sessionId);

        await this.redisClient.del(`user_active_session:${userId}`);
      }
    } catch (error) {
      this.logger.error(
        `Error forcing logout for user (${userId}): (${error})`,
      );
    }
  }
}

import { RedisClient } from "../../initDatastores";
import BaseLogger from "../../utils/logger";
import BaseRedisModel from "./BaseRedisModel";
import { v4 as uuidv4 } from "uuid";
import { CreateLobbyOptions } from "../../websockets/types";
import { LobbySession } from "../../websockets/types";

export class LobbyModel extends BaseRedisModel<LobbySession> {
  private readonly defaultTTL: number;

  constructor(redisClient: RedisClient, logger: BaseLogger) {
    super(redisClient, "lobby", logger);
    this.defaultTTL = 60 * 60 * 24 * 30; // 30 days
  }

  async create(
    data: CreateLobbyOptions,
    ownerId: string,
    ownerDisplayName: string,
  ): Promise<LobbySession> {
    const lobby: LobbySession = {
      ...data,
      id: uuidv4(),
      owner: {
        id: ownerId,
        displayName: ownerDisplayName,
        isReady: false,
        joinedAt: new Date(),
      },
      users: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.redisClient.set(this.getKey(lobby.id), JSON.stringify(lobby), {
      EX: this.defaultTTL,
    });
    await this.redisClient.sAdd("active_lobbies", lobby.id);
    return lobby;
  }

  async get(id: string): Promise<LobbySession | null> {
    const data = await this.redisClient.get(this.getKey(id));
    if (!data) return null;
    return JSON.parse(data) as LobbySession;
  }

  async update(id: string, data: LobbySession): Promise<void> {
    const updatedLobby = {
      ...data,
      updatedAt: new Date(),
    };

    await this.redisClient.set(this.getKey(id), JSON.stringify(updatedLobby), {
      EX: this.defaultTTL,
    });
  }

  async delete(id: string): Promise<void> {
    await this.redisClient.del(this.getKey(id));
    await this.redisClient.sRem("active_lobbies", id);
  }

  async getActiveLobbies(): Promise<LobbySession[]> {
    const lobbyIds = await this.redisClient.sMembers("active_lobbies");
    if (lobbyIds.length === 0) return [];
    const lobbiesData = await this.redisClient.mGet(
      lobbyIds.map((id) => this.getKey(id)),
    );
    const lobbies = lobbiesData
      .filter((data) => data !== null)
      .map((data) => JSON.parse(data) as LobbySession);
    return lobbies;
  }

  async setLobbyActive(lobbyId: string, active: boolean): Promise<void> {
    if (active) {
      await this.redisClient.sAdd("active_lobbies", lobbyId);
    } else {
      await this.redisClient.sRem("active_lobbies", lobbyId);
    }
  }

  async addUser(
    lobby: LobbySession,
    userId: string,
    displayName: string,
  ): Promise<LobbySession> {
    lobby.users.push({
      id: userId,
      displayName,
      isReady: false,
      joinedAt: new Date(),
    });

    await this.update(lobby.id, lobby);

    return lobby;
  }

  async removeUser(
    lobbyId: string,
    userId: string,
  ): Promise<{ lobby: LobbySession | null; isLobbyDeleted: boolean }> {
    const lobby = await this.get(lobbyId);
    let isLobbyDeleted = false;
    if (!lobby) {
      this.logger.warn(
        `Lobby with id (${lobbyId}) not found, skipping user removal...`,
      );
      return { lobby: null, isLobbyDeleted };
    }

    if (lobby.owner.id === userId) {
      this.logger.warn(
        `Lobby with id (${lobbyId}) owner (${userId}) left, selecting new owner...`,
      );
      if (lobby.users.length === 1) {
        lobby.owner = lobby.users[0];
        await this.update(lobbyId, lobby);
      } else {
        await this.delete(lobbyId);
        isLobbyDeleted = true;
      }
    } else {
      lobby.users = lobby.users.filter((u) => u.id !== userId);
      await this.update(lobbyId, lobby);
    }

    return { lobby, isLobbyDeleted };
  }

  async setUserReady(
    lobbyId: string,
    userId: string,
    ready: boolean,
  ): Promise<LobbySession> {
    const lobby = await this.get(lobbyId);
    if (!lobby) throw new Error(`Lobby with id (${lobbyId}) not found`);

    if (lobby.owner.id === userId) {
      lobby.owner.isReady = ready;
      await this.update(lobbyId, lobby);
      return lobby;
    }

    const userIndex = lobby.users.findIndex((u) => u.id === userId);
    if (userIndex === -1)
      throw new Error(
        `User with id (${userId}) not found in lobby with id (${lobbyId})`,
      );

    lobby.users[userIndex].isReady = ready;

    await this.update(lobbyId, lobby);
    return lobby;
  }
}

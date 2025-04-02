import { RedisClient } from "../../initDatastores";
import BaseLogger from "../../utils/logger";
import BaseRedisModel from "./BaseRedisModel";
import { v4 as uuidv4 } from "uuid";
export type LobbyUser = {
  id: string;
  username: string;
  ready: boolean;
  joinedAt: number;
};

export type Lobby = {
  id: string;
  name: string;
  ownerId: string;
  users: LobbyUser[];
  settings: Record<string, string>;
  createdAt: number;
  updatedAt: number;
};

export type CreateLobbyOptions = {
  name: string;
  ownerId: string;
  settings: Record<string, string>;
};

const DEFAULT_MAX_PLAYERS = 2;

export class LobbyModel extends BaseRedisModel<Lobby> {
  constructor(redisClient: RedisClient, logger: BaseLogger) {
    super(redisClient, "lobby", logger);
  }

  async create(data: CreateLobbyOptions, userId: string): Promise<void> {
    const lobby = {
      ...data,
      id: uuidv4(),
      users: [userId],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await this.redisClient.set(this.getKey(lobby.id), JSON.stringify(lobby));
    await this.redisClient.sAdd("active_lobbies", lobby.id);
  }

  async get(id: string): Promise<Lobby | null> {
    const data = await this.redisClient.get(this.getKey(id));
    if (!data) return null;
    return JSON.parse(data) as Lobby;
  }

  async update(id: string, data: Lobby, userId: string): Promise<void> {
    const lobby = await this.get(id);
    if (!lobby) throw new Error(`Lobby with id (${id}) not found`);

    if (lobby.ownerId !== userId) {
      throw new Error(
        `Lobby with id (${id}) is not owned by user with id (${userId})`,
      );
    }

    const updatedLobby = {
      ...lobby,
      ...data,
      updatedAt: Date.now(),
    };

    await this.redisClient.set(this.getKey(id), JSON.stringify(updatedLobby));
  }

  async userDelete(id: string, userId: string): Promise<void> {
    const lobby = await this.get(id);
    if (!lobby) throw new Error(`Lobby with id (${id}) not found`);

    if (lobby.ownerId !== userId) {
      throw new Error(
        `Lobby with id (${id}) is not owned by user with id (${userId})`,
      );
    }

    await this.redisClient.del(this.getKey(id));
    await this.redisClient.sRem("active_lobbies", id);
  }

  async delete(id: string): Promise<void> {
    await this.redisClient.del(this.getKey(id));
    await this.redisClient.sRem("active_lobbies", id);
  }

  async getActiveLobbies(): Promise<Lobby[]> {
    const lobbyIds = await this.redisClient.sMembers("active_lobbies");
    if (lobbyIds.length === 0) return [];
    const lobbiesData = await this.redisClient.mGet(
      lobbyIds.map((id) => this.getKey(id)),
    );
    const lobbies = lobbiesData
      .filter((data) => data !== null)
      .map((data) => JSON.parse(data) as Lobby);
    return lobbies;
  }

  async setLobbyActive(lobbyId: string, active: boolean): Promise<void> {
    if (active) {
      await this.redisClient.sAdd("active_lobbies", lobbyId);
    } else {
      await this.redisClient.sRem("active_lobbies", lobbyId);
    }
  }

  async addUser(lobbyId: string, userId: string): Promise<void> {
    const lobby = await this.get(lobbyId);
    if (!lobby) throw new Error(`Lobby with id (${lobbyId}) not found`);

    if (lobby.users.length >= DEFAULT_MAX_PLAYERS) {
      throw new Error(`Lobby with id (${lobbyId}) is already full!`);
    }

    const existingUserIndex = lobby.users.findIndex(
      (user) => user.id === userId,
    );
    if (existingUserIndex !== -1) {
      lobby.users[existingUserIndex] = {
        ...lobby.users[existingUserIndex],
        ready: false,
        joinedAt: Date.now(),
      };
    } else {
      lobby.users.push({
        id: userId,
        username: userId,
        ready: false,
        joinedAt: Date.now(),
      });
    }

    await this.update(lobbyId, lobby, userId);
  }

  async removeUser(lobbyId: string, userId: string): Promise<void> {
    const lobby = await this.get(lobbyId);
    if (!lobby) throw new Error(`Lobby with id (${lobbyId}) not found`);

    lobby.users = lobby.users.filter((u) => u.id !== userId);

    if (lobby.users.length === 0) {
      this.logger.warn(
        `Lobby with id (${lobbyId}) was already empty, deleting...`,
      );
      await this.delete(lobbyId);
    } else if (lobby.ownerId === userId) {
      this.logger.info(
        `Lobby with id (${lobbyId}) owner (${userId}) left, selecting new owner...`,
      );
      lobby.ownerId = lobby.users[0].id;
      await this.update(lobbyId, lobby, userId);
    } else {
      await this.update(lobbyId, lobby, userId);
    }
  }

  async setUserReady(
    lobbyId: string,
    userId: string,
    ready: boolean,
  ): Promise<void> {
    const lobby = await this.get(lobbyId);
    if (!lobby) throw new Error(`Lobby with id (${lobbyId}) not found`);

    const userIndex = lobby.users.findIndex((u) => u.id === userId);
    if (userIndex === -1)
      throw new Error(
        `User with id (${userId}) not found in lobby with id (${lobbyId})`,
      );

    lobby.users[userIndex].ready = ready;

    await this.update(lobbyId, lobby, userId);
  }
}

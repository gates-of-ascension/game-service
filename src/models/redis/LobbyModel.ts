import { RedisClient } from "../../initDatastores";
import BaseLogger from "../../utils/logger";
import BaseRedisModel from "./BaseRedisModel";
import { v4 as uuidv4 } from "uuid";

export type LobbyUser = {
  id: string;
  displayName: string;
  isReady: boolean;
  joinedAt: number;
};

export type LobbyOwner = {
  id: string;
  displayName: string;
  isReady: boolean;
  joinedAt: number;
};

export type Lobby = {
  id: string;
  name: string;
  owner: LobbyOwner;
  users: LobbyUser[];
  settings: Record<string, string>;
  createdAt: number;
  updatedAt: number;
};

export type CreateLobbyOptions = {
  name: string;
  settings: Record<string, string>;
};

const DEFAULT_MAX_PLAYERS = 2;

export class LobbyModel extends BaseRedisModel<Lobby> {
  private readonly defaultTTL: number;

  constructor(redisClient: RedisClient, logger: BaseLogger) {
    super(redisClient, "lobby", logger);
    this.defaultTTL = 60 * 60 * 24 * 30; // 30 days
  }

  async create(
    data: CreateLobbyOptions,
    ownerId: string,
    ownerDisplayName: string,
  ): Promise<Lobby> {
    const lobby: Lobby = {
      ...data,
      id: uuidv4(),
      owner: {
        id: ownerId,
        displayName: ownerDisplayName,
        isReady: false,
        joinedAt: Date.now(),
      },
      users: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await this.redisClient.set(this.getKey(lobby.id), JSON.stringify(lobby), {
      EX: this.defaultTTL,
    });
    await this.redisClient.sAdd("active_lobbies", lobby.id);
    return lobby;
  }

  async get(id: string): Promise<Lobby | null> {
    const data = await this.redisClient.get(this.getKey(id));
    if (!data) return null;
    return JSON.parse(data) as Lobby;
  }

  async update(id: string, data: Lobby, userId: string): Promise<void> {
    const lobby = await this.get(id);
    if (!lobby) throw new Error(`Lobby with id (${id}) not found`);

    if (lobby.owner.id !== userId) {
      throw new Error(
        `Lobby with id (${id}) is not owned by user with id (${userId})`,
      );
    }

    const updatedLobby = {
      ...lobby,
      ...data,
      updatedAt: Date.now(),
    };

    await this.redisClient.set(this.getKey(id), JSON.stringify(updatedLobby), {
      EX: this.defaultTTL,
    });
  }

  async userDelete(id: string, userId: string): Promise<void> {
    const lobby = await this.get(id);
    if (!lobby) throw new Error(`Lobby with id (${id}) not found`);

    if (lobby.owner.id !== userId) {
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

  async addUser(
    lobbyId: string,
    userId: string,
    displayName: string,
  ): Promise<void> {
    const lobby = await this.get(lobbyId);
    if (!lobby) throw new Error(`Lobby with id (${lobbyId}) not found`);

    if (lobby.users.length >= DEFAULT_MAX_PLAYERS) {
      throw new Error(`Lobby with id (${lobbyId}) is already full!`);
    }

    const isUserInLobby = lobby.users.some((user) => user.id === userId);
    if (isUserInLobby) {
      throw new Error(
        `User with id (${userId}) already in lobby with id (${lobbyId})`,
      );
    }

    lobby.users.push({
      id: userId,
      displayName,
      isReady: false,
      joinedAt: Date.now(),
    });

    await this.update(lobbyId, lobby, userId);
  }

  async removeUser(lobbyId: string, userId: string): Promise<void> {
    const lobby = await this.get(lobbyId);
    if (!lobby) {
      this.logger.warn(
        `Lobby with id (${lobbyId}) not found, skipping user removal...`,
      );
      return;
    }

    lobby.users = lobby.users.filter((u) => u.id !== userId);

    if (lobby.users.length === 0) {
      this.logger.warn(
        `Lobby with id (${lobbyId}) is now empty, deleting lobby...`,
      );
      await this.delete(lobbyId);
    } else if (lobby.owner.id === userId) {
      this.logger.info(
        `Lobby with id (${lobbyId}) owner (${userId}) left, selecting new owner...`,
      );
      if (lobby.users.length === 1) {
        lobby.owner = lobby.users[0];
        await this.update(lobbyId, lobby, userId);
      } else {
        await this.delete(lobbyId);
      }
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

    if (lobby.owner.id === userId) {
      lobby.owner.isReady = ready;
      await this.update(lobbyId, lobby, userId);
      return;
    }

    const userIndex = lobby.users.findIndex((u) => u.id === userId);
    if (userIndex === -1)
      throw new Error(
        `User with id (${userId}) not found in lobby with id (${lobbyId})`,
      );

    lobby.users[userIndex].isReady = ready;

    await this.update(lobbyId, lobby, userId);
  }
}

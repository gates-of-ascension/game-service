import { Server, Socket } from "socket.io";
import BaseLogger from "../../utils/logger";
import BaseChannel from "./baseChannel";
import { LobbyModel, Lobby } from "../../models/redis/LobbyModel";
import { GameModel } from "../../models/redis/GameModel";
import { RedisStore } from "connect-redis";
import { createLobbySchema } from "../../validation/websockets/lobbies";

class LobbyChannel extends BaseChannel {
  private lobbyModel: LobbyModel;
  private gameModel: GameModel;
  private redisStore: RedisStore;
  constructor(
    logger: BaseLogger,
    io: Server,
    redisStore: RedisStore,
    lobbyModel: LobbyModel,
    gameModel: GameModel,
  ) {
    super(logger, io);
    this.lobbyModel = lobbyModel;
    this.gameModel = gameModel;
    this.redisStore = redisStore;
  }

  async registerEvents(socket: Socket) {
    socket.on("create_lobby", async (lobby: Lobby) => {
      const { error } = createLobbySchema.validate(lobby);
      if (error) {
        this.logSocketError(socket, "validation_error", error.message);
        return;
      }

      this.handleCreateLobby(socket, lobby);
    });

    socket.on("remove_current_lobby", () => {
      this.removeUserSessionLobby(socket);
    });

    socket.on("join_lobby", (lobbyId: string, userId: string) => {
      this.handleJoinLobby(socket, lobbyId, userId);
    });

    socket.on("leave_lobby", (lobbyId: string, userId: string) => {
      this.handleLeaveLobby(socket, lobbyId, userId);
    });

    socket.on(
      "update_lobby",
      (lobbyId: string, lobby: Lobby, userId: string) => {
        this.handleUpdateLobby(socket, lobbyId, lobby, userId);
      },
    );

    socket.on("delete_lobby", (lobbyId: string, userId: string) => {
      this.handleDeleteLobby(socket, lobbyId, userId);
    });

    socket.on("start_game", (lobbyId: string, userId: string) => {
      this.handleStartGame(socket, lobbyId, userId);
    });
  }

  private async handleCreateLobby(socket: Socket, lobby: Lobby) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const session = (socket.request as any).session;
      if (session.lobby) {
        this.logSocketError(
          socket,
          "client_error",
          "Cannot create lobby while in another lobby",
        );
        return;
      }

      const createdLobby = await this.lobbyModel.create(lobby, session.user.id);

      session.lobby = createdLobby;
      this.joinRoom(socket, createdLobby.id);
      this.logger.debug(
        `User (${socket.id}) created lobby (${createdLobby.id})`,
      );
      socket.emit("lobby_created", createdLobby);
    } catch (error) {
      socket.emit("server_error", `Error creating lobby: (${error})`);
    }
  }

  private async removeUserSessionLobby(socket: Socket) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = (socket.request as any).session;
    if (session.lobby) {
      try {
        await this.lobbyModel.removeUser(session.lobby.id, session.user.id);
      } catch (error) {
        const err = error as Error;
        this.logSocketError(
          socket,
          "server_error",
          `Cannot remove user from lobby: (${err.message})`,
        );
      }
      session.lobby = undefined;
      socket.emit("user_session_lobby_removed");
    } else {
      this.logSocketError(
        socket,
        "client_error",
        "Cannot remove lobby, user is not in a lobby",
      );
    }
  }

  private async handleJoinLobby(
    socket: Socket,
    lobbyId: string,
    userId: string,
  ) {
    try {
      this.logger.debug(`User (${socket.id}) joined lobby (${lobbyId})`);
      await this.lobbyModel.addUser(lobbyId, userId);
      this.joinRoom(socket, lobbyId);
    } catch (error) {
      socket.emit("error", `Error joining lobby: (${error})`);
    }
  }

  private async handleLeaveLobby(
    socket: Socket,
    lobbyId: string,
    userId: string,
  ) {
    try {
      await this.lobbyModel.removeUser(lobbyId, userId);
      this.leaveRoom(socket, lobbyId);
      this.logger.debug(`User (${socket.id}) left lobby (${lobbyId})`);
    } catch (error) {
      socket.emit("error", `Error leaving lobby: (${error})`);
    }
  }

  private async handleUpdateLobby(
    socket: Socket,
    lobbyId: string,
    lobby: Lobby,
    userId: string,
  ) {
    try {
      await this.lobbyModel.update(lobbyId, lobby, userId);
      this.logger.debug(`User (${socket.id}) updated lobby (${lobbyId})`);
    } catch (error) {
      socket.emit("error", `Error updating lobby: (${error})`);
    }
  }

  private async handleDeleteLobby(
    socket: Socket,
    lobbyId: string,
    userId: string,
  ) {
    try {
      await this.lobbyModel.userDelete(lobbyId, userId);
      this.logger.debug(`User (${socket.id}) deleted lobby (${lobbyId})`);
    } catch (error) {
      socket.emit("error", `Error deleting lobby: (${error})`);
    }
  }

  private async handleStartGame(
    socket: Socket,
    lobbyId: string,
    userId: string,
  ) {
    // TODO: transaction
    try {
      const lobby = await this.lobbyModel.get(lobbyId);
      if (!lobby) {
        throw new Error(`Lobby (${lobbyId}) not found`);
      }
      if (lobby.users.length < 2) {
        throw new Error(`Lobby (${lobbyId}) has less than 2 users`);
      }
      if (lobby.ownerId !== userId) {
        throw new Error(
          `User (${userId}) is not the owner of lobby (${lobbyId})`,
        );
      }
      this.logger.debug(`User (${userId}) started game (${lobbyId})`);
      const game = await this.gameModel.create(
        {
          lobbyId,
          players: lobby.users.map((user) => ({
            id: user.id,
          })),
          gameData: {},
        },
        userId,
      );
      await this.lobbyModel.setLobbyActive(lobbyId, false);
      this.emitToRoom(lobbyId, "game-started", game);
    } catch (error) {
      socket.emit("error", `Error starting game: (${error})`);
      await this.lobbyModel.setLobbyActive(lobbyId, true);
    }
  }
}

export default LobbyChannel;

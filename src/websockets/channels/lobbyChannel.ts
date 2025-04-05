import { Server, Socket } from "socket.io";
import BaseLogger from "../../utils/logger";
import BaseChannel from "./baseChannel";
import { LobbyModel, Lobby } from "../../models/redis/LobbyModel";
import { GameModel } from "../../models/redis/GameModel";
import { RedisStore } from "connect-redis";
import { createLobbySchema } from "../../validation/websockets/lobbies";
import { LobbyChannelSocket } from "../types";

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

  async registerEvents(socket: LobbyChannelSocket) {
    socket.on("create_lobby", async (lobby: Lobby) => {
      const { error } = createLobbySchema.validate(lobby);
      if (error) {
        this.logSocketError(socket, "validation_error", error.message);
        return;
      }

      this.handleCreateLobby(socket, lobby);
    });

    socket.on("leave_current_lobby", () => {
      this.removeUserSessionLobby(socket);
    });

    socket.on("join_lobby", (lobbyId: string) => {
      this.handleJoinLobby(socket, lobbyId);
    });

    socket.on("update_lobby", (lobby: Lobby) => {
      this.handleUpdateLobby(socket, lobby);
    });

    socket.on("delete_lobby", () => {
      this.handleDeleteLobby(socket);
    });

    socket.on("start_game", () => {
      this.handleStartGame(socket);
    });
  }

  private async handleCreateLobby(socket: Socket, lobby: Lobby) {
    try {
      const session = socket.request.session;
      if (session.lobby !== "none") {
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
      session.save();
      socket.emit("lobby_created", createdLobby);
    } catch (error) {
      socket.emit("server_error", `Error creating lobby: (${error})`);
    }
  }

  private async removeUserSessionLobby(socket: Socket) {
    const session = socket.request.session;
    if (session.lobby !== "none") {
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
      session.lobby = "none";
      session.save();
      socket.emit("user_session_lobby_removed");
    } else {
      this.logSocketError(
        socket,
        "client_error",
        "Cannot remove lobby, user is not in a lobby",
      );
    }
  }

  private async handleJoinLobby(socket: LobbyChannelSocket, lobbyId: string) {
    try {
      this.logger.debug(`User (${socket.id}) joined lobby (${lobbyId})`);
      await this.lobbyModel.addUser(lobbyId, socket.data.userId);
      this.joinRoom(socket, lobbyId);
    } catch (error) {
      socket.emit("server_error", `Error joining lobby: (${error})`);
    }
  }

  private async handleUpdateLobby(socket: LobbyChannelSocket, lobby: Lobby) {
    try {
      await this.lobbyModel.update(lobby.id, lobby, socket.data.userId);
      this.logger.debug(`User (${socket.id}) updated lobby (${lobby.id})`);
    } catch (error) {
      socket.emit("server_error", `Error updating lobby: (${error})`);
    }
  }

  private async handleDeleteLobby(socket: LobbyChannelSocket) {
    const session = socket.request.session;
    if (session.lobby === "none") {
      socket.emit("client_error", "User is not in a lobby");
      return;
    }

    if (session.lobby.ownerId !== session.user.id) {
      socket.emit("client_error", "User is not the owner of the lobby");
      return;
    }

    try {
      const lobbyId = session.lobby.id;
      await this.lobbyModel.userDelete(lobbyId, socket.data.userId);
      session.lobby = "none";
      socket.emit("user_session_lobby_removed");
      this.logger.debug(`User (${socket.id}) deleted lobby (${lobbyId})`);
    } catch (error) {
      socket.emit("server_error", `Error deleting lobby: (${error})`);
    }
  }

  private async handleStartGame(socket: LobbyChannelSocket) {
    // TODO: transaction
    const session = socket.request.session;
    if (session.lobby === "none") {
      socket.emit("client_error", "User is not in a lobby");
      return;
    }
    if (session.lobby.users.length < 2) {
      socket.emit("client_error", "Lobby has less than 2 users");
      return;
    }
    if (session.lobby.ownerId !== session.user.id) {
      socket.emit("client_error", "User is not the owner of the lobby");
      return;
    }
    try {
      this.logger.debug(
        `User (${session.user.id}) started game (${session.lobby.id})`,
      );
      const game = await this.gameModel.create(
        {
          lobbyId: session.lobby.id,
          players: session.lobby.users.map((user) => ({
            id: user.id,
          })),
          gameData: {},
        },
        session.user.id,
      );
      await this.lobbyModel.setLobbyActive(session.lobby.id, false);
      this.emitToRoom(session.lobby.id, "game-started", game);
    } catch (error) {
      socket.emit("server_error", `Error starting game: (${error})`);
      await this.lobbyModel.setLobbyActive(session.lobby.id, true);
    }
  }
}

export default LobbyChannel;

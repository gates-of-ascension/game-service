import { Server, Socket } from "socket.io";
import BaseLogger from "../../utils/logger";
import BaseChannel from "./baseChannel";
import { RedisStore } from "connect-redis";
import {
  createLobbySchema,
  setUserReadySchema,
} from "../../validation/websockets/lobbies";
import { LobbyChannelSocket, SocketError } from "../types";
import LobbyController from "../../controllers/lobbyController";
import { Lobby } from "../../models/redis/LobbyModel";

class LobbyChannel extends BaseChannel {
  private lobbyController: LobbyController;
  private redisStore: RedisStore;
  constructor(
    logger: BaseLogger,
    io: Server,
    redisStore: RedisStore,
    lobbyController: LobbyController,
  ) {
    super(logger, io);
    this.lobbyController = lobbyController;
    this.redisStore = redisStore;
  }

  async registerEvents(socket: LobbyChannelSocket) {
    socket.on("create_lobby", (lobby: Lobby) => {
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

    socket.on("set_user_ready", (ready: { isReady: boolean }) => {
      const { error } = setUserReadySchema.validate(ready);
      if (error) {
        this.logSocketError(socket, "validation_error", error.message);
        return;
      }

      this.setUserReady(socket, ready.isReady);
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

  private handleError(socket: Socket, error: Error | SocketError) {
    this.logSocketError(socket, error.name, error.message);
    if (error instanceof SocketError) {
      socket.emit(error.name, error.message);
    } else {
      socket.emit("server_error", `Error creating lobby: (${error})`);
    }
  }

  private async handleCreateLobby(socket: Socket, lobby: Lobby) {
    try {
      const session = socket.request.session;
      const createdLobbyResult = await this.lobbyController.createLobby(
        session,
        lobby,
      );

      const { lobby: createdLobby, session: updatedSession } =
        createdLobbyResult;

      this.joinRoom(socket, createdLobby.id);
      this.logger.debug(
        `User (${socket.id}) created lobby (${createdLobby.id})`,
      );
      updatedSession.save();
      socket.emit("lobby_created", createdLobby);
    } catch (error) {
      this.handleError(socket, error as Error | SocketError);
    }
  }

  private async setUserReady(socket: LobbyChannelSocket, ready: boolean) {
    const session = socket.request.session;
    try {
      await this.lobbyController.setUserReady(session, ready);
      socket.emit("user_ready", session.lobbyId, session.user.id, ready);
    } catch (error) {
      this.handleError(socket, error as Error | SocketError);
    }
  }

  private async removeUserSessionLobby(socket: Socket) {
    const session = socket.request.session;
    let sessionResult;
    try {
      sessionResult =
        await this.lobbyController.removeUserSessionLobby(session);
      session.lobbyId = sessionResult.lobbyId;
      session.save();
      socket.emit("user_session_lobby_removed");
    } catch (error) {
      this.handleError(socket, error as Error | SocketError);
      return;
    }
  }

  private async handleJoinLobby(socket: LobbyChannelSocket, lobbyId: string) {
    const session = socket.request.session;
    try {
      await this.lobbyController.joinLobby(session, lobbyId);
      this.joinRoom(socket, lobbyId);
      socket.emit("lobby_joined", lobbyId);
      this.logger.debug(`User (${socket.id}) joined lobby (${lobbyId})`);
    } catch (error) {
      this.handleError(socket, error as Error | SocketError);
    }
  }

  private async handleDeleteLobby(socket: LobbyChannelSocket) {
    const session = socket.request.session;

    try {
      const lobbyId = session.lobbyId;
      await this.lobbyController.deleteLobby(session, lobbyId);
      session.lobbyId = "none";
      socket.emit("lobby_deleted", lobbyId);
      this.logger.debug(
        `User (${session.user.username}) deleted lobby (${lobbyId})`,
      );
      session.save();
    } catch (error) {
      socket.emit("server_error", `Error deleting lobby: (${error})`);
    }
  }

  private async handleStartGame(socket: LobbyChannelSocket) {
    // TODO: transaction
    const session = socket.request.session;
    try {
      this.logger.debug(
        `User (${session.user.id}) started game (${session.lobbyId})`,
      );
      this.emitToRoom(session.lobbyId, "game_started", {});
    } catch (error) {
      this.handleError(socket, error as Error | SocketError);
    }
  }

  private async handleUpdateLobby(socket: LobbyChannelSocket, lobby: Lobby) {
    console.log("handleUpdateLobby", socket, lobby);
    return;
  }
}

export default LobbyChannel;

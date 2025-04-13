import { Server } from "socket.io";
import BaseLogger from "../../utils/logger";
import BaseChannel from "./baseChannel";
import {
  createLobbySchema,
  joinLobbySchema,
  setUserReadySchema,
} from "../../validation/websockets/lobbies";
import {
  LobbyChannelSocket,
  SocketError,
  LobbyChannelServerToClientEvents,
  CreateLobbyOptions,
  UpdateLobbyOptions,
} from "../types";
import LobbyController from "../../controllers/lobbyController";
import { UserSessionStore } from "../../models/redis/UserSessionStore";

class LobbyChannel extends BaseChannel<LobbyChannelServerToClientEvents> {
  private lobbyController: LobbyController;
  private userSessionStore: UserSessionStore;

  constructor(
    logger: BaseLogger,
    io: Server,
    lobbyController: LobbyController,
    userSessionStore: UserSessionStore,
  ) {
    super(logger, io);
    this.lobbyController = lobbyController;
    this.userSessionStore = userSessionStore;
  }

  async registerEvents(socket: LobbyChannelSocket) {
    socket.on("create_lobby", (message: CreateLobbyOptions) => {
      const { error } = createLobbySchema.validate(message);
      if (error) {
        this.logSocketError(socket, "validation_error", error.message);
        return;
      }

      this.handleCreateLobby(socket, message);
    });

    socket.on("leave_current_lobby", () => {
      this.removeUserSessionLobby(socket);
    });

    socket.on("set_user_ready", (message: { isReady: boolean }) => {
      const { error } = setUserReadySchema.validate(message);
      if (error) {
        this.logSocketError(socket, "validation_error", error.message);
        return;
      }

      this.setUserReady(socket, message.isReady);
    });

    socket.on("join_lobby", (message: { lobbyId: string }) => {
      const { error } = joinLobbySchema.validate(message);
      if (error) {
        this.logSocketError(socket, "validation_error", error.message);
        return;
      }

      this.handleJoinLobby(socket, message.lobbyId);
    });

    socket.on("update_lobby", (message: UpdateLobbyOptions) => {
      this.handleUpdateLobby(socket, message);
    });

    socket.on("delete_lobby", () => {
      this.handleDeleteLobby(socket);
    });

    socket.on("start_game", () => {
      this.handleStartGame(socket);
    });
  }

  // async handleCreateLobbyStream(socket: LobbyChannelSocket, lobby: Lobby) {
  //   const session = socket.request.session;
  //   try {
  //     await this.lobbyController.createLobbyStream(session, lobby);
  //     session.save();
  //   } catch (error) {
  //     this.handleError(socket, error as Error | SocketError);
  //   }
  // }

  private async handleCreateLobby(
    socket: LobbyChannelSocket,
    lobby: CreateLobbyOptions,
  ) {
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
      socket.emit("user_session_updated", {
        session: {
          lobby: createdLobby,
        },
        event_name: "lobby_created",
      });
    } catch (error) {
      this.handleError(socket, error as Error | SocketError);
    }
  }

  private async setUserReady(socket: LobbyChannelSocket, ready: boolean) {
    const session = socket.request.session;
    try {
      const lobby = await this.lobbyController.setUserReady(session, ready);
      this.emitToRoom(session.lobbyId, "user_session_updated", {
        session: {
          lobby,
        },
        event_name: "user_ready",
      });
    } catch (error) {
      this.handleError(socket, error as Error | SocketError);
    }
  }

  private async removeUserSessionLobby(socket: LobbyChannelSocket) {
    const session = socket.request.session;
    try {
      const lobby = await this.lobbyController.removeUserSessionLobby(session);
      session.save();
      this.leaveRoom(socket, session.lobbyId);

      // If no lobby was returned, it means either:
      // 1. The lobby didn't exist
      // 2. The lobby was deleted (owner left with no other users)
      if (!lobby) {
        socket.emit("user_session_updated", {
          session: {
            lobby: {},
          },
          event_name: "user_session_lobby_removed",
        });
        return;
      } else {
        socket.emit("user_session_updated", {
          session: {
            lobby: {},
          },
          event_name: "user_session_lobby_removed",
        });
      }

      this.emitToRoom(lobby.id, "user_session_updated", {
        session: {
          lobby,
        },
        event_name: "user_left",
      });
      this.leaveRoom(socket, lobby.id);
    } catch (error) {
      this.handleError(socket, error as Error | SocketError);
    }
  }

  private async handleJoinLobby(socket: LobbyChannelSocket, lobbyId: string) {
    const session = socket.request.session;
    try {
      const lobby = await this.lobbyController.joinLobby(session, lobbyId);
      this.joinRoom(socket, lobbyId);
      this.emitToRoom(lobbyId, "user_session_updated", {
        session: {
          lobby,
        },
        event_name: "user_joined",
      });
      session.save();
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
      this.emitToRoom(lobbyId, "user_session_updated", {
        session: {
          lobby: undefined,
        },
        event_name: "lobby_deleted",
      });
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
      const { game, secondUserInLobby } =
        await this.lobbyController.startGame(session);
      this.emitToRoom(session.lobbyId, "user_session_updated", {
        session: {
          game,
        },
        event_name: "game_started",
      });
      this.emitToRoom(secondUserInLobby, "user_session_updated", {
        session: { game },
        event_name: "game_started",
      });
    } catch (error) {
      this.handleError(socket, error as Error | SocketError);
    }
  }

  private async handleUpdateLobby(
    socket: LobbyChannelSocket,
    lobby: UpdateLobbyOptions,
  ) {
    console.log("handleUpdateLobby", socket, lobby);
    return;
  }
}

export default LobbyChannel;

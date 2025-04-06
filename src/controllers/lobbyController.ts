import { Session } from "express-session";
import { ApiError } from "../middleware/apiError";
import { Lobby, LobbyModel } from "../models/redis/LobbyModel";
import BaseLogger from "../utils/logger";
import { SocketError } from "../websockets/types";

export default class LobbyController {
  constructor(
    private readonly logger: BaseLogger,
    private readonly lobbyModel: LobbyModel,
  ) {}

  async getActiveLobbies() {
    let lobbies;
    try {
      lobbies = await this.lobbyModel.getActiveLobbies();
    } catch (error) {
      throw new ApiError(
        500,
        `Failed to get active lobbies from redis: (${error})`,
      );
    }
    return lobbies;
  }

  async createLobby(session: Session, lobby: Lobby) {
    if (session.lobbyId !== "none") {
      throw new SocketError(
        "client_error",
        "Cannot create lobby while in another lobby",
      );
    }

    try {
      const createdLobby = await this.lobbyModel.create(lobby, session.user.id);

      session.lobbyId = createdLobby.id;
      return { lobby: createdLobby, session };
    } catch (error) {
      throw new SocketError("server_error", `Error creating lobby: (${error})`);
    }
  }

  async removeUserSessionLobby(session: Session) {
    if (session.lobbyId === "none") {
      throw new SocketError(
        "client_error",
        "Cannot remove user from lobby, user is not in a lobby",
      );
    }

    try {
      await this.lobbyModel.removeUser(session.lobbyId, session.user.id);
    } catch (error) {
      throw new SocketError(
        "server_error",
        `Error removing user from lobby: (${error})`,
      );
    }

    session.lobbyId = "none";
    return session;
  }

  async joinLobby(session: Session, lobbyId: string) {
    if (session.lobbyId !== "none") {
      throw new SocketError(
        "client_error",
        "Cannot join lobby while in another lobby",
      );
    }

    try {
      await this.lobbyModel.addUser(lobbyId, session.user.id);
    } catch (error) {
      throw new SocketError("server_error", `Error joining lobby: (${error})`);
    }

    session.lobbyId = lobbyId;
    return session;
  }

  async deleteLobby(session: Session, lobbyId: string) {
    if (session.lobbyId === "none") {
      throw new SocketError(
        "client_error",
        "Cannot delete lobby while not in a lobby",
      );
    }

    const lobby = await this.lobbyModel.get(lobbyId);
    if (!lobby) {
      throw new SocketError("client_error", "Lobby not found");
    }

    if (lobby.ownerId !== session.user.id) {
      throw new SocketError(
        "client_error",
        "User is not the owner of the lobby",
      );
    }

    const secondUserInLobby = lobby.users.find(
      (user) => user.id !== session.user.id,
    );

    try {
      await this.lobbyModel.delete(lobbyId);
    } catch (error) {
      throw new SocketError("server_error", `Error deleting lobby: (${error})`);
    }

    session.lobbyId = "none";
    return { session, secondUserInLobby };
  }

  async startGame(session: Session, lobbyId: string) {
    if (session.lobbyId === "none") {
      throw new SocketError(
        "client_error",
        "Cannot start game while not in a lobby",
      );
    }

    const lobby = await this.lobbyModel.get(session.lobbyId);
    if (!lobby) {
      throw new SocketError("client_error", "Lobby not found");
    }

    if (lobby.ownerId !== session.user.id) {
      throw new SocketError(
        "client_error",
        "User is not the owner of the lobby",
      );
    }

    if (lobby.users.length < 2) {
      throw new SocketError("client_error", "Lobby has less than 2 users");
    }

    lobby.users.forEach((user) => {
      if (!user.ready) {
        throw new SocketError(
          "client_error",
          `User (${user.username}) is not ready`,
        );
      }
    });
    // const game = await this.gameModel.create(session.user.id, lobbyId);
    // try {
    //   await this.lobbyModel.setLobbyActive(lobbyId, false);
    // } catch (error) {
    //   throw new SocketError("server_error", `Error starting game: (${error})`);
    // }
    return { session, lobbyId };
  }
}

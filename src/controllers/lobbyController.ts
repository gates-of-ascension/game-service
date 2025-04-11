import { Session } from "express-session";
import { ApiError } from "../middleware/apiError";
import { Lobby, LobbyModel } from "../models/redis/LobbyModel";
import BaseLogger from "../utils/logger";
import { SocketError } from "../websockets/types";
import { GameModel } from "../models/redis/GameModel";
import { v4 as uuidv4 } from "uuid";
import { StreamPublisher } from "../streams/streamPublisher";

export default class LobbyController {
  constructor(
    private readonly logger: BaseLogger,
    private readonly lobbyModel: LobbyModel,
    private readonly gameModel: GameModel,
    private readonly streamPublisher: StreamPublisher,
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

  // async createLobbyStream(session: Session, lobby: Lobby) {
  //   this.streamPublisher.publish("user:events", {
  //     type: "create_lobby",
  //     data: JSON.stringify(lobby),
  //   });
  // }

  async createLobby(session: Session, lobby: Lobby) {
    if (session.lobbyId !== "none") {
      throw new SocketError(
        "client_error",
        "Cannot create lobby while in another lobby",
      );
    }

    try {
      const createdLobby = await this.lobbyModel.create(
        lobby,
        session.user.id,
        session.user.displayName,
      );

      session.lobbyId = createdLobby.id;
      return { lobby: createdLobby, session };
    } catch (error) {
      throw new SocketError("server_error", `Error creating lobby: (${error})`);
    }
  }

  async setUserReady(session: Session, ready: boolean) {
    if (session.lobbyId === "none") {
      throw new SocketError(
        "client_error",
        "Cannot set user ready while not in a lobby",
      );
    }

    try {
      await this.lobbyModel.setUserReady(
        session.lobbyId,
        session.user.id,
        ready,
      );
    } catch (error) {
      throw new SocketError(
        "server_error",
        `Error setting user ready: (${error})`,
      );
    }
  }

  async removeUserSessionLobby(session: Session) {
    if (session.lobbyId === "none") {
      throw new SocketError(
        "client_error",
        "Cannot remove user from lobby, user is not in a lobby",
      );
    }

    const lobbyId = session.lobbyId;
    try {
      await this.lobbyModel.removeUser(lobbyId, session.user.id);
    } catch (error) {
      throw new SocketError(
        "server_error",
        `Error removing user from lobby: (${error})`,
      );
    }

    session.lobbyId = "none";
    return { session, lobbyId };
  }

  async joinLobby(session: Session, lobbyId: string) {
    if (session.lobbyId !== "none") {
      throw new SocketError(
        "client_error",
        "Cannot join lobby while in another lobby",
      );
    }

    try {
      await this.lobbyModel.addUser(
        lobbyId,
        session.user.id,
        session.user.displayName,
      );
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

    if (lobby.owner.id !== session.user.id) {
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

  async startGame(session: Session) {
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

    if (lobby.owner.id !== session.user.id) {
      throw new SocketError(
        "client_error",
        "User is not the owner of the lobby",
      );
    }

    if (lobby.users.length !== 1) {
      throw new SocketError("client_error", "Lobby has less than 2 users");
    }

    lobby.users.forEach((user) => {
      if (!user.isReady) {
        throw new SocketError(
          "client_error",
          `User (${user.displayName}) is not ready`,
        );
      }
    });

    const gameId = uuidv4();
    const gamePlayers = [
      {
        id: session.user.id,
        displayName: session.user.displayName,
      },
    ];
    lobby.users.forEach((user) => {
      gamePlayers.push({
        id: user.id,
        displayName: user.displayName,
      });
    });

    const gameData = {
      lobbyId: session.lobbyId,
      id: gameId,
      players: gamePlayers,
      gameData: {},
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };
    try {
      await this.gameModel.create(gameData);
    } catch (error) {
      throw new SocketError("server_error", `Error starting game: (${error})`);
    }

    try {
      await this.lobbyModel.setLobbyActive(session.lobbyId, false);
    } catch (error) {
      throw new SocketError("server_error", `Error starting game: (${error})`);
    }

    session.gameId = gameId;

    return { session, game: gameData, secondUserInLobby: lobby.users[0].id };
  }
}

import { Session } from "express-session";
import { ApiError } from "../middleware/apiError";
import { LobbyModel } from "../models/redis/LobbyModel";
import BaseLogger from "../utils/logger";
import { CreateLobbyOptions, SocketError } from "../websockets/types";
import { GameModel } from "../models/redis/GameModel";

const DEFAULT_MAX_USERS = 1;

export default class LobbyController {
  constructor(
    private readonly logger: BaseLogger,
    private readonly lobbyModel: LobbyModel,
    private readonly gameModel: GameModel,
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

  async createLobby(session: Session, lobby: CreateLobbyOptions) {
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

    const lobby = await this.lobbyModel.get(session.lobbyId);
    if (!lobby) {
      throw new SocketError("client_error", "Lobby not found");
    }

    if (lobby.owner.id === session.user.id) {
      lobby.owner.isReady = ready;
    } else {
      const userIndex = lobby.users.findIndex(
        (user) => user.id === session.user.id,
      );
      lobby.users[userIndex].isReady = ready;
    }

    let updatedLobby;
    try {
      updatedLobby = await this.lobbyModel.update(session.lobbyId, lobby);
    } catch (error) {
      throw new SocketError(
        "server_error",
        `Error setting user ready: (${error})`,
      );
    }

    return updatedLobby;
  }

  async removeUserSessionLobby(session: Session) {
    if (session.lobbyId === "none") {
      throw new SocketError(
        "client_error",
        "Cannot remove user from lobby, user is not in a lobby",
      );
    }

    const lobby = await this.lobbyModel.removeUser(
      session.lobbyId,
      session.user.id,
    );
    session.lobbyId = "none";
    return lobby;
  }

  async joinLobby(session: Session, lobbyId: string) {
    if (session.lobbyId !== "none") {
      throw new SocketError(
        "client_error",
        "Cannot join lobby while in another lobby",
      );
    }

    const lobby = await this.lobbyModel.get(lobbyId);
    if (!lobby) {
      throw new SocketError("client_error", "Lobby not found");
    }

    if (lobby.owner.id === session.user.id) {
      throw new SocketError("client_error", "User is the owner of the lobby");
    }

    if (lobby.users.find((user) => user.id === session.user.id)) {
      throw new SocketError("client_error", "User is already in the lobby");
    }

    if (lobby.users.length >= DEFAULT_MAX_USERS) {
      throw new SocketError("client_error", "Lobby is full");
    }

    let joinedLobby;
    try {
      joinedLobby = await this.lobbyModel.addUser(
        lobby,
        session.user.id,
        session.user.displayName,
      );
    } catch (error) {
      throw new SocketError("server_error", `Error joining lobby: (${error})`);
    }

    session.lobbyId = joinedLobby.id;

    return joinedLobby;
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

    const gamePlayers = [
      {
        id: session.user.id,
        displayName: session.user.displayName,
        joinedAt: new Date(),
      },
    ];
    lobby.users.forEach((user) => {
      gamePlayers.push({
        id: user.id,
        displayName: user.displayName,
        joinedAt: new Date(),
      });
    });

    const gameData = {
      lobbyId: session.lobbyId,
      players: gamePlayers,
      gameData: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let createdGame;
    try {
      createdGame = await this.gameModel.create(gameData);
    } catch (error) {
      throw new SocketError("server_error", `Error starting game: (${error})`);
    }

    try {
      await this.lobbyModel.setLobbyActive(session.lobbyId, false);
    } catch (error) {
      throw new SocketError("server_error", `Error starting game: (${error})`);
    }

    return { game: createdGame, secondUserInLobby: lobby.users[0].id };
  }
}

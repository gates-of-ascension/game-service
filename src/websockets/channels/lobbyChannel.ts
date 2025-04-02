import { Server, Socket } from "socket.io";
import BaseLogger from "../../utils/logger";
import BaseChannel from "./baseChannel";
import { LobbyModel, Lobby } from "../../models/redis/LobbyModel";
import { GameModel } from "../../models/redis/GameModel";

class LobbyChannel extends BaseChannel {
  private lobbyModel: LobbyModel;
  private gameModel: GameModel;
  constructor(
    logger: BaseLogger,
    io: Server,
    lobbyModel: LobbyModel,
    gameModel: GameModel,
  ) {
    super(logger, io);
    this.lobbyModel = lobbyModel;
    this.gameModel = gameModel;
  }

  async registerEvents(socket: Socket) {
    socket.on("create-lobby", (lobby: Lobby, userId: string) => {
      this.handleCreateLobby(socket, lobby, userId);
    });

    socket.on("join-lobby", (lobbyId: string, userId: string) => {
      this.handleJoinLobby(socket, lobbyId, userId);
    });

    socket.on("leave-lobby", (lobbyId: string, userId: string) => {
      this.handleLeaveLobby(socket, lobbyId, userId);
    });

    socket.on(
      "update-lobby",
      (lobbyId: string, lobby: Lobby, userId: string) => {
        this.handleUpdateLobby(socket, lobbyId, lobby, userId);
      },
    );

    socket.on("delete-lobby", (lobbyId: string, userId: string) => {
      this.handleDeleteLobby(socket, lobbyId, userId);
    });

    socket.on("start-game", (lobbyId: string, userId: string) => {
      this.handleStartGame(socket, lobbyId, userId);
    });
  }

  private async handleCreateLobby(
    socket: Socket,
    lobby: Lobby,
    userId: string,
  ) {
    try {
      await this.lobbyModel.create(lobby, userId);
      this.joinRoom(socket, lobby.id);
      this.logger.debug(`User (${socket.id}) created lobby (${lobby.id})`);
    } catch (error) {
      socket.emit("error", `Error creating lobby: (${error})`);
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

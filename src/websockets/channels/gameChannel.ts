import BaseChannel from "./baseChannel";
import { Server } from "socket.io";
import BaseLogger from "../../utils/logger";
import GameController from "../../controllers/gameController";
import {
  GameChannelServerToClientEvents,
  GameChannelSocket,
  SocketError,
} from "../types";
import LobbyController from "../../controllers/lobbyController";
class GameChannel extends BaseChannel<GameChannelServerToClientEvents> {
  private gameController: GameController;
  private lobbyController: LobbyController;

  constructor(
    logger: BaseLogger,
    io: Server,
    gameController: GameController,
    lobbyController: LobbyController,
  ) {
    super(logger, io);
    this.gameController = gameController;
    this.lobbyController = lobbyController;
  }

  async registerEvents(socket: GameChannelSocket) {
    socket.on("leave_current_game", () => {
      this.handleLeaveCurrentGame(socket);
    });
  }

  private async handleLeaveCurrentGame(socket: GameChannelSocket) {
    const session = socket.request.session;
    try {
      this.logger.debug(
        `User (${session.user.username}) is leaving current game (${session.gameId})`,
      );
      const gameLeaveResult =
        await this.gameController.leaveCurrentGame(session);
      session.gameId = gameLeaveResult.gameId;
      session.save();
      this.emitToRoom(gameLeaveResult.gameId, "player_left", {
        gameId: gameLeaveResult.gameId,
        playerId: session.user.id,
      });
      socket.emit("user_session_game_removed");

      this.logger.debug(
        `User (${session.user.username}) is now leaving the lobby (${session.lobbyId})`,
      );
      const lobbyLeaveResult =
        await this.lobbyController.removeUserSessionLobby(session);
      session.lobbyId = lobbyLeaveResult.lobbyId;
      session.save();
      this.emitToRoom(lobbyLeaveResult.lobbyId, "user_left", {
        userId: session.user.id,
        displayName: session.user.displayName,
      });
      socket.emit("user_session_lobby_removed");
    } catch (error) {
      this.handleError(socket, error as Error | SocketError);
    }
  }
}

export default GameChannel;

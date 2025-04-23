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
import { PlayerNumber } from "../../services/GameService/components/Game";

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
      this.removeUserSessionGame(socket);
    });

    socket.on(
      "debug_damage_enemy_player",
      (gameId: string, playerNumber: PlayerNumber) => {
        this.handleDebugDamageEnemyPlayer(socket, gameId, playerNumber);
      },
    );
  }

  private async handleDebugDamageEnemyPlayer(
    socket: GameChannelSocket,
    gameId: string,
    playerNumber: PlayerNumber,
  ) {
    try {
      await this.gameController.debugDamageEnemyPlayer(gameId, playerNumber);
    } catch (error) {
      this.handleError(socket, error as Error | SocketError);
    }
  }

  private async removeUserSessionGame(socket: GameChannelSocket) {
    const session = socket.request.session;
    try {
      const { game, gameStateChanges } =
        await this.gameController.removeUserSessionGame(session);
      session.save();

      // If no game was returned, it means either:
      // 1. The game didn't exist
      // 2. The game was deleted (owner left with no other users)
      if (!game) {
        socket.emit("user_session_updated", {
          session: {
            game: {},
          },
          event_name: "user_session_game_removed",
        });
        socket.emit("game_state_updated", {
          gameStateChanges,
        });
        return;
      }
      this.emitToRoom(game.id, "game_state_updated", {
        gameStateChanges,
      });
      socket.emit("user_session_updated", {
        session: {
          game: {},
        },
        event_name: "user_session_game_removed",
      });
      this.leaveRoom(socket, game.id);

      this.emitToRoom(game.id, "user_session_updated", {
        session: {
          game,
        },
        event_name: "user_left",
      });
    } catch (error) {
      this.handleError(socket, error as Error | SocketError);
    }
  }
}

export default GameChannel;

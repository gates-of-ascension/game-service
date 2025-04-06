import BaseChannel from "./baseChannel";
import { Server, Socket } from "socket.io";
import BaseLogger from "../../utils/logger";
import GameController from "../../controllers/gameController";

class GameChannel extends BaseChannel {
  private gameController: GameController;

  constructor(logger: BaseLogger, io: Server, gameController: GameController) {
    super(logger, io);
    this.gameController = gameController;
  }

  async registerEvents(socket: Socket) {
    socket.on("remove-player", (gameId: string, playerId: string) => {
      this.handleRemovePlayer(socket, gameId, playerId);
    });
  }

  private async handleRemovePlayer(
    socket: Socket,
    gameId: string,
    playerId: string,
  ) {
    try {
      await this.gameController.removePlayer(gameId, playerId);
      this.logger.debug(
        `User (${socket.id}) removed player (${playerId}) from game (${gameId})`,
      );
    } catch (error) {
      socket.emit("error", `Error removing player from game: (${error})`);
    }
  }
}

export default GameChannel;

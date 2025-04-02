import { GameModel } from "../../models/redis/GameModel";
import BaseChannel from "./baseChannel";
import { Server, Socket } from "socket.io";
import BaseLogger from "../../utils/logger";

class GameChannel extends BaseChannel {
  private gameModel: GameModel;

  constructor(logger: BaseLogger, io: Server, gameModel: GameModel) {
    super(logger, io);
    this.gameModel = gameModel;
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
      await this.gameModel.removePlayer(gameId, playerId);
      this.logger.debug(
        `User (${socket.id}) removed player (${playerId}) from game (${gameId})`,
      );
    } catch (error) {
      socket.emit("error", `Error removing player from game: (${error})`);
    }
  }
}

export default GameChannel;

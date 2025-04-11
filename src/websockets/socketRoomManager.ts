import { Server } from "socket.io";
import BaseLogger from "../utils/logger";
import { UserSessionStore } from "../models/redis/UserSessionStore";

export class SocketRoomManager {
  private readonly logger: BaseLogger;
  private readonly io: Server;
  private readonly userSessionStore: UserSessionStore;

  constructor(options: {
    logger: BaseLogger;
    io: Server;
    userSessionStore: UserSessionStore;
  }) {
    this.logger = options.logger;
    this.io = options.io;
    this.userSessionStore = options.userSessionStore;
  }

  async addToRoom(userId: string, roomId: string) {
    const socketId = await this.userSessionStore.getUserActiveSocket(userId);
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.join(roomId);
        this.logger.debug(`Added user ${userId} to room ${roomId}`);
      }
    }
  }

  async removeFromRoom(userId: string, roomId: string) {
    const socketId = await this.userSessionStore.getUserActiveSocket(userId);
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.leave(roomId);
        this.logger.debug(`Removed user ${userId} from room ${roomId}`);
      }
    }
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server, Socket } from "socket.io";
import BaseLogger from "../../utils/logger";

export default abstract class BaseChannel<
  Events extends Record<string, (...args: any[]) => void>,
> {
  constructor(
    protected logger: BaseLogger,
    protected io: Server,
  ) {}

  abstract registerEvents(socket: Socket): void;

  protected emitToRoom<K extends keyof Events & string>(
    roomId: string,
    event: K,
    data: Parameters<Events[K]>[0],
  ) {
    this.io.to(roomId).emit(event, data);
  }

  protected emitToUser<K extends keyof Events & string>(
    userId: string,
    event: K,
    data: Parameters<Events[K]>[0],
  ) {
    this.io.to(userId).emit(event, data);
  }

  protected joinRoom(socket: Socket, roomId: string) {
    socket.join(roomId);
  }

  protected leaveRoom(socket: Socket, roomId: string) {
    socket.leave(roomId);
  }

  protected logSocketError(
    socket: Socket,
    errorName: string,
    errorMessage: string,
  ) {
    this.logger.error(`Socket Error: (${errorName}) - (${errorMessage})`);
    socket.emit(errorName, errorMessage);
  }
}

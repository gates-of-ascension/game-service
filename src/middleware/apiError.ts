import { Request, Response, NextFunction } from "express";
import BaseLogger from "../utils/logger";
import { Socket } from "socket.io";

export class ApiError extends Error {
  public status: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.status = statusCode || 500;
  }
}

export class SocketError extends Error {
  public type: string;

  constructor(type: string, message: string) {
    super(message);
    this.type = type;
  }
}

export function apiErrorMiddleware(logger: BaseLogger) {
  return function (
    error: ApiError,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction,
  ) {
    const { message, status } = error;

    const url = `${req.method} ${req.url}`;
    logger.error(`Error at ${url}: ${message}`);
    const publicErrorMessage = message;

    if (error instanceof ApiError) {
      res.status(status).json({
        error: publicErrorMessage,
      });
    } else {
      res.status(500).json({ error: `Unexpected error: ${message}` });
    }
  };
}

export function socketErrorMiddleware(logger: BaseLogger) {
  return function (socket: Socket, next: (err?: Error) => void) {
    socket.on("error", (error: Error) => {
      const errorMessage = error.message;
      logger.error(`Socket error for socket ${socket.id}: ${errorMessage}`);

      if (error instanceof SocketError) {
        socket.emit("error", {
          type: error.type,
          message: error.message,
        });
      } else {
        socket.emit("error", {
          type: "server_error",
          message: "An unexpected error occurred",
        });
      }

      // Don't crash the server, just disconnect the problematic socket
      socket.disconnect();
    });

    next();
  };
}

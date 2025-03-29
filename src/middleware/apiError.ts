import { Request, Response, NextFunction } from "express";
import BaseLogger from "../utils/logger";

export class ApiError extends Error {
  public status: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.status = statusCode || 500;
  }
}

const errorMessages = {
  500: "Encountered an internal server error while processing the request.",
  400: "Encountered an error while processing the request from the client.",
};

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
    const publicErrorMessage =
      errorMessages[status as keyof typeof errorMessages];

    if (error instanceof ApiError) {
      res.status(status).json({
        error: publicErrorMessage,
      });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  };
}

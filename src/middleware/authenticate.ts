import { NextFunction, Request, Response } from "express";
import { ApiError } from "./apiError";

export default function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const session = req.session;
  if (!session.userId) {
    throw new ApiError(401, "User not authenticated.");
  }
  next();
}

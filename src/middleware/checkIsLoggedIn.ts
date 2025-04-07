import { NextFunction, Request, Response } from "express";

export function checkIsAlreadyLoggedIn(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.session.user) {
    return res.status(409).json({ message: "User already logged in" });
  }

  next();
}

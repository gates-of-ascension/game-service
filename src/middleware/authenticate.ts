import { NextFunction, Request, Response } from "express";
import { ApiError } from "./apiError";

export function createAuthMiddleware(options: {
  checkAuthentication?: boolean;
  checkUserId?: boolean;
  checkUserDeckId?: boolean;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const session = req.session;

    if (options.checkAuthentication && !session.user) {
      throw new ApiError(401, "User not authenticated.");
    }

    if (options.checkUserId && req.params.userId !== session.user.id) {
      throw new ApiError(
        403,
        "User is not authorized to access this resource.",
      );
    }

    if (options.checkUserDeckId) {
      const userDeckId = req.params.deckId;
      const isUserDeckIdValid = session.userDeckIds.includes(userDeckId);
      if (!isUserDeckIdValid) {
        throw new ApiError(
          403,
          "User is not authorized to access this resource.",
        );
      }
    }

    next();
  };
}

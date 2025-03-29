import { Request, Response, NextFunction } from "express";
import { ApiError } from "./apiError";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function validate(schema: any) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        await schema.body.validateAsync(req.body);
      }
      if (schema.params) {
        await schema.params.validateAsync(req.params);
      }
      if (schema.query) {
        await schema.query.validateAsync(req.query);
      }
      next();
    } catch (error) {
      next(new ApiError(400, (error as Error).message));
    }
  };
}

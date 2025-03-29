import { UniqueConstraintError } from "sequelize";
import BaseLogger from "./logger";

export function formatSequelizeError(error: Error, logger: BaseLogger) {
  const errorResponse = {
    message: error.message,
    status: 500,
  };

  if (error.name === "SequelizeUniqueConstraintError") {
    const uniqueConstraintError = error as UniqueConstraintError;
    errorResponse.message = uniqueConstraintError.errors
      .map((e) => e.message)
      .join(", ");
    errorResponse.status = 409;
  } else {
    logger.warn(`Unmapped sequelize error: (${error})`);
  }

  return errorResponse;
}

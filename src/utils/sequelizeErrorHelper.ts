import BaseLogger from "./logger";
import { ForeignKeyConstraintError } from "@sequelize/core";
import { UniqueConstraintError } from "@sequelize/core";

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
  } else if (error.name === "SequelizeForeignKeyConstraintError") {
    const sequelizeForeignKeyConstraintError =
      error as ForeignKeyConstraintError;
    errorResponse.message = sequelizeForeignKeyConstraintError.message;
    errorResponse.status = 404;
  } else {
    logger.warn(`Unmapped sequelize error: (${error})`);
  }

  return errorResponse;
}

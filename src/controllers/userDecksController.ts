import BaseLogger from "../utils/logger";
import UserDeck from "../models/UserDeck";
import { ApiError } from "../middleware/apiError";
import { formatSequelizeError } from "../utils/sequelizeErrorHelper";
import {
  CreateUserDeckRequestBody,
  CreateUserDeckCardRequestBody,
  UpdateUserDeckCardRequestBody,
  UpdateUserDeckRequestBody,
} from "../types/userDecks";
import UserDeckCard from "../models/UserDeckCard";
import Card from "../models/Card";
import { Op, Sequelize } from "@sequelize/core";

export default class UserDecksController {
  constructor(
    private readonly logger: BaseLogger,
    private readonly sequelize: Sequelize,
  ) {}

  async getUserDeckById(userDeckId: string) {
    let userDeck;
    try {
      userDeck = await UserDeck.findByPk(userDeckId);
    } catch (error) {
      const errorResponse = formatSequelizeError(error as Error, this.logger);
      throw new ApiError(errorResponse.status, errorResponse.message);
    }

    if (!userDeck) {
      throw new ApiError(
        404,
        `Could not find user deck with id (${userDeckId}), user deck not found`,
      );
    }

    return userDeck;
  }

  async getUserDeckCards(userDeckId: string) {
    let userDeckCards;
    try {
      userDeckCards = await UserDeckCard.findAll({
        where: { userDeckId },
        include: [
          {
            model: Card,
            attributes: ["name", "type"],
          },
        ],
      });
    } catch (error) {
      const errorResponse = formatSequelizeError(error as Error, this.logger);
      throw new ApiError(errorResponse.status, errorResponse.message);
    }

    if (userDeckCards.length === 0) {
      throw new ApiError(
        404,
        `Could not find user deck cards with id (${userDeckId}), user deck cards not found`,
      );
    }

    return userDeckCards.map((userDeckCard) => ({
      cardId: userDeckCard.cardId,
      quantity: userDeckCard.quantity,
    }));
  }

  async createUserDeck(requestBody: CreateUserDeckRequestBody) {
    let newUserDeck;
    const createUserDeckOptions = {} as CreateUserDeckRequestBody;

    if (requestBody.name) {
      createUserDeckOptions.name = requestBody.name;
    }

    if (requestBody.description) {
      createUserDeckOptions.description = requestBody.description;
    }

    try {
      newUserDeck = await UserDeck.create({
        ...createUserDeckOptions,
        userId: requestBody.userId,
      });
    } catch (error) {
      const errorResponse = formatSequelizeError(error as Error, this.logger);
      throw new ApiError(errorResponse.status, errorResponse.message);
    }

    return newUserDeck;
  }

  async createUserDeckCard(
    userDeckId: string,
    requestBody: CreateUserDeckCardRequestBody,
  ) {
    let newUserDeckCard;
    const createUserDeckCardOptions = {} as CreateUserDeckCardRequestBody;

    if (requestBody.cardId) {
      createUserDeckCardOptions.cardId = requestBody.cardId;
    }

    if (requestBody.quantity) {
      createUserDeckCardOptions.quantity = requestBody.quantity;
    }

    try {
      newUserDeckCard = await UserDeckCard.create({
        ...createUserDeckCardOptions,
        userDeckId,
      });
    } catch (error) {
      const errorResponse = formatSequelizeError(error as Error, this.logger);
      throw new ApiError(errorResponse.status, errorResponse.message);
    }

    return newUserDeckCard;
  }

  async updateUserDeck(
    userDeckId: string,
    requestBody: UpdateUserDeckRequestBody,
  ) {
    let updatedUserDeck;
    const updateUserDeckOptions = {} as UpdateUserDeckRequestBody;

    if (requestBody.name) {
      updateUserDeckOptions.name = requestBody.name;
    }

    if (requestBody.description) {
      updateUserDeckOptions.description = requestBody.description;
    }

    try {
      updatedUserDeck = (await UserDeck.update(updateUserDeckOptions, {
        where: { id: userDeckId },
        returning: true,
      })) as [number, UserDeck[]];
    } catch (error) {
      const errorResponse = formatSequelizeError(error as Error, this.logger);
      throw new ApiError(errorResponse.status, errorResponse.message);
    }

    if (updatedUserDeck[0] === 0) {
      throw new ApiError(
        404,
        `Could not update user deck with id (${userDeckId}), user deck not found`,
      );
    }

    return updatedUserDeck[1][0].toJSON();
  }

  async updateUserDeckCard(
    userDeckId: string,
    cardId: string,
    requestBody: UpdateUserDeckCardRequestBody,
  ) {
    let updatedUserDeckCard;
    const updateUserDeckCardOptions = {} as UpdateUserDeckCardRequestBody;

    if (requestBody.quantity) {
      updateUserDeckCardOptions.quantity = requestBody.quantity;
    }

    try {
      updatedUserDeckCard = (await UserDeckCard.update(
        updateUserDeckCardOptions,
        {
          where: { userDeckId, cardId },
          returning: true,
        },
      )) as [number, UserDeckCard[]];
    } catch (error) {
      const errorResponse = formatSequelizeError(error as Error, this.logger);
      throw new ApiError(errorResponse.status, errorResponse.message);
    }

    if (updatedUserDeckCard[0] === 0) {
      throw new ApiError(
        404,
        `Could not update user deck card with user deck id (${userDeckId}) and card id (${cardId}), user deck card not found`,
      );
    }

    return updatedUserDeckCard[1][0].toJSON();
  }

  async deleteUserDeck(userDeckId: string) {
    try {
      return await this.sequelize.transaction(async () => {
        await UserDeckCard.destroy({
          where: { userDeckId },
        });

        let deletedUserDeck;
        try {
          deletedUserDeck = await UserDeck.destroy({
            where: { id: userDeckId },
          });
        } catch (error) {
          const errorResponse = formatSequelizeError(
            error as Error,
            this.logger,
          );
          throw new ApiError(errorResponse.status, errorResponse.message);
        }

        if (!deletedUserDeck) {
          throw new ApiError(
            404,
            `Could not find user deck with id (${userDeckId}), user deck not found`,
          );
        }

        return deletedUserDeck;
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      const errorResponse = formatSequelizeError(error as Error, this.logger);
      throw new ApiError(errorResponse.status, errorResponse.message);
    }
  }

  async deleteUserDeckCard(userDeckId: string, cardId: string) {
    let deletedUserDeckCard;
    try {
      deletedUserDeckCard = await UserDeckCard.destroy({
        where: { userDeckId, cardId },
      });
    } catch (error) {
      const errorResponse = formatSequelizeError(error as Error, this.logger);
      throw new ApiError(errorResponse.status, errorResponse.message);
    }

    if (!deletedUserDeckCard) {
      throw new ApiError(
        404,
        `Could not find user deck card with user deck id (${userDeckId}) and card id (${cardId}), user deck card not found`,
      );
    }

    return deletedUserDeckCard;
  }

  async saveUserDeckCards(
    userDeckId: string,
    userDeckCards: {
      cardId: number;
      quantity: number;
    }[],
  ) {
    try {
      return await this.sequelize.transaction(async () => {
        const existingCardIds = userDeckCards.map(
          (userDeckCard) => userDeckCard.cardId,
        );

        await UserDeckCard.destroy({
          where: { userDeckId, cardId: { [Op.in]: existingCardIds } },
        });

        const userDeckCardsToCreate = userDeckCards.map((userDeckCard) => ({
          ...userDeckCard,
          userDeckId,
        }));

        const response = await UserDeckCard.bulkCreate(userDeckCardsToCreate, {
          updateOnDuplicate: ["quantity"],
          returning: true,
        });

        return response.map((userDeckCard) => {
          return {
            cardId: userDeckCard.cardId,
            quantity: userDeckCard.quantity,
          };
        });
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      const errorResponse = formatSequelizeError(error as Error, this.logger);
      throw new ApiError(errorResponse.status, errorResponse.message);
    }
  }
}

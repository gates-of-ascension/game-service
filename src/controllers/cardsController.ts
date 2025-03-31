import BaseLogger from "../utils/logger";
import Card from "../models/Card";
import { ApiError } from "../middleware/apiError";
import { formatSequelizeError } from "../utils/sequelizeErrorHelper";
import { CreateCardRequestBody, UpdateCardRequestBody } from "../types/cards";

export default class CardsController {
  constructor(private readonly logger: BaseLogger) {}

  async getCardById(cardId: string) {
    let card;

    try {
      card = await Card.findByPk(cardId);
    } catch (error) {
      const errorResponse = formatSequelizeError(error as Error, this.logger);
      throw new ApiError(errorResponse.status, errorResponse.message);
    }

    if (!card) {
      throw new ApiError(
        404,
        `Could not find card with id (${cardId}), card not found`,
      );
    }

    return card.toJSON();
  }

  async createCard(requestBody: CreateCardRequestBody) {
    let newCard;
    const createCardOptions = {} as CreateCardRequestBody;

    if (requestBody.name) {
      createCardOptions.name = requestBody.name;
    }
    if (requestBody.type) {
      createCardOptions.type = requestBody.type;
    }

    try {
      newCard = (await Card.create(createCardOptions, {
        returning: true,
      })) as Card;
    } catch (error) {
      const errorResponse = formatSequelizeError(error as Error, this.logger);
      throw new ApiError(errorResponse.status, errorResponse.message);
    }

    return newCard.toJSON();
  }

  async bulkUpsertCards(requestBody: { cards: CreateCardRequestBody[] }) {
    let newCards;

    try {
      newCards = await Card.bulkCreate(requestBody.cards, {
        returning: true,
        updateOnDuplicate: ["name", "type", "description"],
      });
    } catch (error) {
      const errorResponse = formatSequelizeError(error as Error, this.logger);
      throw new ApiError(errorResponse.status, errorResponse.message);
    }

    return newCards;
  }

  async updateCard(cardId: string, requestBody: UpdateCardRequestBody) {
    let updatedCard;
    const updateCardOptions = {} as UpdateCardRequestBody;

    if (requestBody.name) {
      updateCardOptions.name = requestBody.name;
    }
    if (requestBody.type) {
      updateCardOptions.type = requestBody.type;
    }

    try {
      updatedCard = (await Card.update(updateCardOptions, {
        where: { id: cardId },
        returning: true,
      })) as [number, Card[]];
    } catch (error) {
      const errorResponse = formatSequelizeError(error as Error, this.logger);
      throw new ApiError(errorResponse.status, errorResponse.message);
    }

    if (updatedCard[0] === 0) {
      throw new ApiError(
        404,
        `Could not update card with id (${cardId}), card not found`,
      );
    }

    return updatedCard[1][0].toJSON();
  }

  async deleteCard(cardId: string) {
    let deletedCard;
    try {
      deletedCard = await Card.destroy({ where: { id: cardId } });
    } catch (error) {
      const errorResponse = formatSequelizeError(error as Error, this.logger);
      throw new ApiError(errorResponse.status, errorResponse.message);
    }

    if (!deletedCard) {
      throw new ApiError(
        404,
        `Could not delete card with id (${cardId}), card not found`,
      );
    }

    return deletedCard;
  }
}

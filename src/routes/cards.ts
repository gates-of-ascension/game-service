import { Router } from "express";
import CardsController from "../controllers/cardsController";
import {
  createCardSchema,
  getCardSchema,
  updateCardSchema,
  deleteCardSchema,
  bulkUpsertCardsSchema,
} from "../validation/cards";
import validate from "../middleware/validation";

export default (cardsController: CardsController) => {
  const router = Router();

  router.get("/v1/cards/:id", validate(getCardSchema), async (req, res) => {
    const cardId = req.params.id;
    const card = await cardsController.getCardById(cardId);
    res.status(200).json(card);
  });

  router.post("/v1/cards", validate(createCardSchema), async (req, res) => {
    const { name, type } = req.body;
    const card = await cardsController.createCard({ name, type });
    res.status(201).json(card);
  });

  router.put("/v1/cards/:id", validate(updateCardSchema), async (req, res) => {
    const cardId = req.params.id;
    const { name, type } = req.body;
    const card = await cardsController.updateCard(cardId, { name, type });
    res.status(200).json(card);
  });

  router.put(
    "/v1/cards/",
    validate(bulkUpsertCardsSchema),
    async (req, res) => {
      const { cards } = req.body;
      const response = await cardsController.bulkUpsertCards({ cards });
      res.status(200).json({ cards: response });
    },
  );

  router.delete(
    "/v1/cards/:id",
    validate(deleteCardSchema),
    async (req, res) => {
      const cardId = req.params.id;
      await cardsController.deleteCard(cardId);
      res.status(200).send();
    },
  );

  return router;
};

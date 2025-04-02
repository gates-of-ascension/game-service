import { Router } from "express";
import UserDecksController from "../controllers/userDecksController";
import {
  createUserDeckSchema,
  updateUserDeckSchema,
  deleteUserDeckSchema,
  getUserDeckByIdSchema,
  getUserDeckCardsByUserDeckIdSchema,
  saveUserDeckCardsSchema,
} from "../validation/userDecks";
import validate from "../middleware/validation";

export default (userDecksController: UserDecksController) => {
  const router = Router();

  router.get(
    "/v1/user_decks/:id",
    validate(getUserDeckByIdSchema),
    async (req, res) => {
      const userDeckId = req.params.id;
      const userDeck = await userDecksController.getUserDeckById(userDeckId);
      res.status(200).json(userDeck);
    },
  );

  router.get(
    "/v1/user_decks/:id/cards",
    validate(getUserDeckCardsByUserDeckIdSchema),
    async (req, res) => {
      const userDeckId = req.params.id;
      const userDeckCards =
        await userDecksController.getUserDeckCards(userDeckId);
      res.status(200).json(userDeckCards);
    },
  );

  router.post(
    "/v1/user_decks",
    validate(createUserDeckSchema),
    async (req, res) => {
      const { name, description, userId } = req.body;
      const userDeck = await userDecksController.createUserDeck({
        name,
        description,
        userId,
      });
      res.status(201).json(userDeck);
    },
  );

  router.put(
    "/v1/user_decks/:id",
    validate(updateUserDeckSchema),
    async (req, res) => {
      const { name, description } = req.body;
      const userDeckId = req.params.id;
      const userDeck = await userDecksController.updateUserDeck(userDeckId, {
        name,
        description,
      });
      res.status(200).json(userDeck);
    },
  );

  router.put(
    "/v1/user_decks/:id/cards",
    validate(saveUserDeckCardsSchema),
    async (req, res) => {
      const { cards } = req.body;
      const userDeckId = req.params.id;
      const userDeckCards = await userDecksController.saveUserDeckCards(
        userDeckId,
        cards,
      );
      res.status(200).json({ cards: userDeckCards });
    },
  );

  router.delete(
    "/v1/user_decks/:id",
    validate(deleteUserDeckSchema),
    async (req, res) => {
      const userDeckId = req.params.id;
      await userDecksController.deleteUserDeck(userDeckId);
      res.status(200).send();
    },
  );

  return router;
};

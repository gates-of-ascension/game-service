import { Router } from "express";
import UserDecksController from "../controllers/userDecksController";
import {
  createUserDeckSchema,
  updateUserDeckSchema,
  deleteUserDeckSchema,
  getUserDeckByIdSchema,
  getUserDeckCardsByUserDeckIdSchema,
  saveUserDeckCardsSchema,
  getUserDecksSchema,
} from "../validation/userDecks";
import validate from "../middleware/validation";
import { createAuthMiddleware } from "../middleware/authenticate";

export default (userDecksController: UserDecksController) => {
  const router = Router();

  router.get(
    "/v1/users/:userId/decks/:deckId",
    createAuthMiddleware({
      checkAuthentication: true,
      checkUserId: true,
      checkUserDeckId: true,
    }),
    validate(getUserDeckByIdSchema),
    async (req, res) => {
      const userDeckId = req.params.deckId;
      const userDeck = await userDecksController.getUserDeckById(userDeckId);
      res.status(200).json(userDeck);
    },
  );

  router.get(
    "/v1/users/:userId/decks",
    createAuthMiddleware({
      checkAuthentication: true,
      checkUserId: true,
    }),
    validate(getUserDecksSchema),
    async (req, res) => {
      const userId = req.params.userId;
      const userDecks = await userDecksController.getUserDecks(userId);
      res.status(200).json(userDecks);
    },
  );

  router.get(
    "/v1/users/:userId/decks/:deckId/cards",
    createAuthMiddleware({
      checkAuthentication: true,
      checkUserId: true,
      checkUserDeckId: true,
    }),
    validate(getUserDeckCardsByUserDeckIdSchema),
    async (req, res) => {
      const userDeckId = req.params.deckId;
      const userDeckCards =
        await userDecksController.getUserDeckCards(userDeckId);
      res.status(200).json(userDeckCards);
    },
  );

  router.post(
    "/v1/users/:userId/decks",
    createAuthMiddleware({ checkAuthentication: true, checkUserId: true }),
    validate(createUserDeckSchema),
    async (req, res) => {
      const { name, description } = req.body;
      const userDeck = await userDecksController.createUserDeck({
        name,
        description,
        userId: req.params.userId,
      });
      req.session.userDeckIds.push(userDeck.id);
      res.status(201).json(userDeck);
    },
  );

  router.put(
    "/v1/users/:userId/decks/:deckId",
    createAuthMiddleware({
      checkAuthentication: true,
      checkUserId: true,
      checkUserDeckId: true,
    }),
    validate(updateUserDeckSchema),
    async (req, res) => {
      const { name, description } = req.body;
      const userDeckId = req.params.deckId;
      const userDeck = await userDecksController.updateUserDeck(userDeckId, {
        name,
        description,
      });
      res.status(200).json(userDeck);
    },
  );

  router.put(
    "/v1/users/:userId/decks/:deckId/cards",
    createAuthMiddleware({
      checkAuthentication: true,
      checkUserId: true,
      checkUserDeckId: true,
    }),
    validate(saveUserDeckCardsSchema),
    async (req, res) => {
      const { cards } = req.body;
      const userDeckId = req.params.deckId;
      const userDeckCards = await userDecksController.saveUserDeckCards(
        userDeckId,
        cards,
      );
      res.status(200).json({ cards: userDeckCards });
    },
  );

  router.delete(
    "/v1/users/:userId/decks/:deckId",
    createAuthMiddleware({
      checkAuthentication: true,
      checkUserId: true,
      checkUserDeckId: true,
    }),
    validate(deleteUserDeckSchema),
    async (req, res) => {
      const userDeckId = req.params.deckId;
      await userDecksController.deleteUserDeck(userDeckId);
      req.session.userDeckIds = req.session.userDeckIds.filter(
        (id) => id !== userDeckId,
      );
      res.status(200).send();
    },
  );

  return router;
};

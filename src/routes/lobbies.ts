import { Router } from "express";
import LobbiesController from "../controllers/lobbyController";
import { createAuthMiddleware } from "../middleware/authenticate";

export default (lobbiesController: LobbiesController) => {
  const router = Router();

  router.get(
    "/v1/lobbies/active",
    createAuthMiddleware({ checkAuthentication: true }),
    async (_req, res) => {
      const lobbies = await lobbiesController.getActiveLobbies();
      res.status(200).json(lobbies);
    },
  );

  return router;
};

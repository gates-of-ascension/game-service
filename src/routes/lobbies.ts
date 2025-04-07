import { Router } from "express";
import LobbyController from "../controllers/lobbyController";
import { createAuthMiddleware } from "../middleware/authenticate";

export default (lobbyController: LobbyController) => {
  const router = Router();

  router.get(
    "/v1/lobbies/active",
    createAuthMiddleware({ checkAuthentication: true }),
    async (_req, res) => {
      const lobbies = await lobbyController.getActiveLobbies();
      res.status(200).json(lobbies);
    },
  );

  return router;
};

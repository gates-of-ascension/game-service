import { Router } from "express";
import LobbiesController from "../controllers/lobbiesController";
import authenticate from "../middleware/authenticate";

export default (lobbiesController: LobbiesController) => {
  const router = Router();

  router.get("/v1/lobbies/active", authenticate, async (_req, res) => {
    const lobbies = await lobbiesController.getActiveLobbies();
    res.status(200).json(lobbies);
  });

  return router;
};

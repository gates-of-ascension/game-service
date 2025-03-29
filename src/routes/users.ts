import { Router } from "express";
import UsersController from "../controllers/usersController";

export default (usersController: UsersController) => {
  const router = Router();

  router.get("/v1/users/:id", async (req, res) => {
    const userId = req.params.id;
    const user = await usersController.getUserById(userId);

    res.status(200).json(user);
  });

  return router;
};

import { Router } from "express";
import UsersController from "../controllers/usersController";
import {
  createUserSchema,
  getUserSchema,
  updateUserSchema,
  deleteUserSchema,
} from "../validation/users";
import validate from "../middleware/validation";

export default (usersController: UsersController) => {
  const router = Router();

  router.get("/v1/users/:id", validate(getUserSchema), async (req, res) => {
    const userId = req.params.id;
    const user = await usersController.getUserById(userId);

    res.status(200).json(user);
  });

  router.post("/v1/users", validate(createUserSchema), async (req, res) => {
    const { displayName, username, password } = req.body;
    const user = await usersController.createUser(
      displayName,
      username,
      password,
    );
    res.status(201).json(user);
  });

  return router;
};

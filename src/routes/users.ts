import { Router } from "express";
import UsersController from "../controllers/usersController";
import {
  userSignupSchema,
  getUserSchema,
  updateUserSchema,
  deleteUserSchema,
  userLoginSchema,
} from "../validation/users";
import validate from "../middleware/validation";
import authenticate from "../middleware/authenticate";
import { ApiError } from "../middleware/apiError";

export default (usersController: UsersController) => {
  const router = Router();

  router.get(
    "/v1/users/:id",
    authenticate,
    validate(getUserSchema),
    async (req, res) => {
      const userId = req.params.id;
      if (userId !== req.session.userId) {
        throw new ApiError(
          403,
          "You are not authorized to access this resource.",
        );
      }
      const response = await usersController.getUserById(userId);

      res.status(200).json(response);
    },
  );

  router.post(
    "/v1/users/signup",
    validate(userSignupSchema),
    async (req, res) => {
      const { displayName, username, password } = req.body;
      const response = await usersController.signup({
        displayName,
        username,
        password,
      });
      res.status(201).json(response);
    },
  );

  router.post(
    "/v1/users/login",
    validate(userLoginSchema),
    async (req, res) => {
      const { username, password } = req.body;
      const response = await usersController.login({
        username,
        password,
      });
      req.session.userId = response.id;
      req.session.username = response.username;
      req.session.displayName = response.displayName;
      req.session.createdAt = response.createdAt;
      req.session.updatedAt = response.updatedAt;
      res.status(200).json({ message: "Logged in successfully" });
    },
  );

  router.put(
    "/v1/users/:id",
    authenticate,
    validate(updateUserSchema),
    async (req, res) => {
      const userId = req.params.id;
      if (userId !== req.session.userId) {
        throw new ApiError(
          403,
          "You are not authorized to access this resource.",
        );
      }
      const { displayName, username, password } = req.body;
      const response = await usersController.updateUser(userId, {
        displayName,
        username,
        password,
      });
      res.status(200).json(response);
    },
  );

  router.delete(
    "/v1/users/:id",
    authenticate,
    validate(deleteUserSchema),
    async (req, res) => {
      const userId = req.params.id;
      if (userId !== req.session.userId) {
        throw new ApiError(
          403,
          "You are not authorized to access this resource.",
        );
      }
      await usersController.deleteUser(userId);
      res.status(200).send();
    },
  );

  return router;
};

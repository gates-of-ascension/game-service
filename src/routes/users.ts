import { Router } from "express";
import UsersController from "../controllers/usersController";
import {
  userSignupSchema,
  getUserSchema,
  updateUserSchema,
  deleteUserSchema,
  userLoginSchema,
} from "../validation/REST/users";
import validate from "../middleware/validation";
import { createAuthMiddleware } from "../middleware/authenticate";
import { ApiError } from "../middleware/apiError";

export default (usersController: UsersController) => {
  const router = Router();

  router.get(
    "/v1/users/:userId",
    createAuthMiddleware({ checkAuthentication: true, checkUserId: true }),
    validate(getUserSchema),
    async (req, res) => {
      const userId = req.params.userId;
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
      const session = req.session;
      const response = await usersController.login({
        username,
        password,
        lobbyId: session.lobbyId,
      });

      session.user = response.user;
      session.userDecksIds = response.userDecksIds;
      session.lobbyId = response.lobbyId;

      req.session.save((err) => {
        if (err) {
          throw new ApiError(500, "Error saving session");
        }
        res.status(200).json({
          message: "Logged in successfully",
          user: {
            id: response.user.id,
            username: response.user.username,
            displayName: response.user.displayName,
          },
        });
      });
    },
  );

  router.put(
    "/v1/users/:userId",
    createAuthMiddleware({ checkAuthentication: true, checkUserId: true }),
    validate(updateUserSchema),
    async (req, res) => {
      const userId = req.params.userId;
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
    "/v1/users/:userId",
    createAuthMiddleware({ checkAuthentication: true, checkUserId: true }),
    validate(deleteUserSchema),
    async (req, res) => {
      const userId = req.params.userId;
      await usersController.deleteUser(userId);
      res.status(200).send();
    },
  );

  return router;
};

import Joi from "joi";

export const createLobbySchema = Joi.object({
  lobby: Joi.object().required(), // Define the lobby structure here
  userId: Joi.string().required(),
});

import Joi from "joi";

export const createLobbySchema = Joi.object({
  name: Joi.string().required(),
  settings: Joi.object().optional(),
});

export const setUserReadySchema = Joi.object({
  isReady: Joi.boolean().strict().required(),
});

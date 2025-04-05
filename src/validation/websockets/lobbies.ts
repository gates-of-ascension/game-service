import Joi from "joi";

export const createLobbySchema = Joi.object({
  lobby: Joi.object({
    name: Joi.string().required(),
    settings: Joi.object().optional(),
  }).required(),
});

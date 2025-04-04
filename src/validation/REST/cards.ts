import Joi from "joi";

export const createCardSchema = {
  body: Joi.object({
    name: Joi.string().required(),
    type: Joi.string().required(),
  }),
};

export const getCardSchema = {
  params: Joi.object({
    id: Joi.number().required(),
  }),
};

export const updateCardSchema = {
  params: Joi.object({
    id: Joi.number().required(),
  }),
  body: Joi.object({
    name: Joi.string().optional(),
    type: Joi.string().optional(),
  }).min(1),
};

export const deleteCardSchema = {
  params: Joi.object({
    id: Joi.number().required(),
  }),
};

export const bulkUpsertCardsSchema = {
  body: Joi.object({
    cards: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().required(),
          type: Joi.string().required(),
          description: Joi.string().optional(),
        }),
      )
      .min(1),
  }),
};

import Joi from "joi";

export const createUserDeckSchema = {
  body: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().optional(),
  }),
  params: Joi.object({
    userId: Joi.string().uuid().required(),
  }),
};

export const updateUserDeckSchema = {
  body: Joi.object({
    name: Joi.string().optional(),
    description: Joi.string().optional(),
  }).min(1),
  params: Joi.object({
    userId: Joi.string().uuid().required(),
    deckId: Joi.string().uuid().required(),
  }),
};

export const deleteUserDeckSchema = {
  params: Joi.object({
    userId: Joi.string().uuid().required(),
    deckId: Joi.string().uuid().required(),
  }),
};

export const getUserDeckByIdSchema = {
  params: Joi.object({
    userId: Joi.string().uuid().required(),
    deckId: Joi.string().uuid().required(),
  }),
};

export const getUserDecksSchema = {
  params: Joi.object({
    userId: Joi.string().uuid().required(),
  }),
};

export const getUserDeckCardsByUserDeckIdSchema = {
  params: Joi.object({
    userId: Joi.string().uuid().required(),
    deckId: Joi.string().uuid().required(),
  }),
};

export const createUserDeckCardSchema = {
  params: Joi.object({
    userId: Joi.string().uuid().required(),
    deckId: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    cardId: Joi.number().required(),
    quantity: Joi.number().required(),
  }),
};

export const updateUserDeckCardSchema = {
  params: Joi.object({
    userId: Joi.string().uuid().required(),
    deckId: Joi.string().uuid().required(),
    cardId: Joi.number().required(),
  }),
  body: Joi.object({
    quantity: Joi.number().required(),
  }),
};

export const deleteUserDeckCardSchema = {
  params: Joi.object({
    userId: Joi.string().uuid().required(),
    deckId: Joi.string().uuid().required(),
    cardId: Joi.number().required(),
  }),
};

export const saveUserDeckCardsSchema = {
  params: Joi.object({
    userId: Joi.string().uuid().required(),
    deckId: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    cards: Joi.array()
      .items(
        Joi.object({
          cardId: Joi.number().required(),
          quantity: Joi.number().required(),
        }),
      )
      .min(1),
  }),
};

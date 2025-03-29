import Joi from "joi";

export const createUserSchema = {
  body: Joi.object({
    displayName: Joi.string().required(),
    username: Joi.string().required(),
    password: Joi.string().required(),
  }),
};

export const updateUserSchema = {
  body: Joi.object({
    displayName: Joi.string().optional(),
    username: Joi.string().optional(),
    password: Joi.string().optional(),
  }),
};

export const getUserSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

export const deleteUserSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

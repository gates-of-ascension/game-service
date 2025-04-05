import Joi from "joi";

export const userSignupSchema = {
  body: Joi.object({
    displayName: Joi.string().required(),
    username: Joi.string().required(),
    password: Joi.string().required(),
  }),
};

export const userLoginSchema = {
  body: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
  }),
};

export const updateUserSchema = {
  params: Joi.object({
    userId: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    displayName: Joi.string().optional(),
    username: Joi.string().optional(),
    password: Joi.string().optional(),
  }).min(1),
};

export const getUserSchema = {
  params: Joi.object({
    userId: Joi.string().uuid().required(),
  }),
};

export const deleteUserSchema = {
  params: Joi.object({
    userId: Joi.string().uuid().required(),
  }),
};

export type CreateUserRequestBody = {
  displayName: string;
  username: string;
  password: string;
};

export type UpdateUserRequestBody = {
  displayName?: string;
  username?: string;
  password?: string;
};

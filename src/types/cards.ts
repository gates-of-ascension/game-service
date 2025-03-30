export type CreateCardRequestBody = {
  name: string;
  type: string;
};

export type UpdateCardRequestBody = {
  name?: string;
  type?: string;
};

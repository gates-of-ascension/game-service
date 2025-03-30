export interface CreateUserDeckRequestBody {
  name: string;
  description?: string;
  userId: string;
}

export interface UpdateUserDeckRequestBody {
  name?: string;
  description?: string;
}

export interface CreateUserDeckCardRequestBody {
  cardId: number;
  quantity: number;
}

export interface UpdateUserDeckCardRequestBody {
  quantity: number;
}

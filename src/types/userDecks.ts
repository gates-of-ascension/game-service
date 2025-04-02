export interface CreateUserDeckRequestBody {
  name: string;
  description?: string;
  userId: string;
}

export interface UpdateUserDeckRequestBody {
  name?: string;
  description?: string;
}

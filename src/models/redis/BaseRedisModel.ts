import { RedisClient } from "../../initDatastores";
import BaseLogger from "../../utils/logger";
export default abstract class BaseRedisModel<T> {
  constructor(
    protected redisClient: RedisClient,
    private keyPrefix: string,
    protected logger: BaseLogger,
  ) {}

  // sets the key for the model
  protected getKey(id: string): string {
    return `${this.keyPrefix}:${id}`;
  }

  abstract create(data: T, userId: string): Promise<string | void>;

  abstract get(id: string): Promise<T | null>;

  abstract update(id: string, data: T, userId: string): Promise<void>;

  abstract delete(id: string, userId: string): Promise<void>;
}

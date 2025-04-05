import { RedisClient } from "../../initDatastores";
import BaseLogger from "../../utils/logger";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
}

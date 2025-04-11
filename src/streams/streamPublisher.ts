import BaseLogger from "../utils/logger";
import { RedisClient } from "../initDatastores";
import { StreamName } from "./types";

export class StreamPublisher {
  private readonly logger: BaseLogger;
  private readonly redisClient: RedisClient;
  private userSequenceCounters: Map<string, number> = new Map();

  constructor(options: { logger: BaseLogger; redisClient: RedisClient }) {
    this.logger = options.logger;
    this.redisClient = options.redisClient;
  }

  async publish(streamName: StreamName, data: Record<string, string>) {
    const eventId = await this.redisClient.xAdd(streamName, "*", data);
    this.logger.debug(`Published event ${eventId} to stream ${streamName}`);
    return eventId;
  }

  getNextSequenceNumber(userId: string) {
    const currentSequenceNumber = this.userSequenceCounters.get(userId) ?? 0;
    const nextSequenceNumber = currentSequenceNumber + 1;
    this.userSequenceCounters.set(userId, nextSequenceNumber);
    return nextSequenceNumber;
  }
}

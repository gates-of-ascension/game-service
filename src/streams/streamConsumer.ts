import { RedisClient } from "../initDatastores";
import BaseLogger from "../utils/logger";
import { Server } from "socket.io";
import { SocketRoomManager } from "../websockets/socketRoomManager";

export class StreamConsumer {
  private readonly logger: BaseLogger;
  private readonly redisClient: RedisClient;
  private readonly consumerGroupName: string = "websocket-servers";
  private readonly consumerName: string;
  private readonly io: Server;
  private readonly socketRoomManager: SocketRoomManager;

  constructor(options: {
    logger: BaseLogger;
    redisClient: RedisClient;
    consumerName: string;
    io: Server;
    socketRoomManager: SocketRoomManager;
  }) {
    this.logger = options.logger;
    this.redisClient = options.redisClient;
    this.consumerName = options.consumerName;
    this.io = options.io;
    this.socketRoomManager = options.socketRoomManager;
  }

  async start() {
    await this.setupConsumerGroups();

    this.consumeUserEvents();
    this.consumeLobbyEvents();
    this.consumeGameEvents();
  }

  private async setupConsumerGroups() {
    try {
      await this.redisClient.xGroupCreate(
        "users:events",
        this.consumerGroupName,
        "0",
        { MKSTREAM: true },
      );
      await this.redisClient.xGroupCreate(
        "lobbies:events",
        this.consumerGroupName,
        "0",
        { MKSTREAM: true },
      );
      await this.redisClient.xGroupCreate(
        "games:events",
        this.consumerGroupName,
        "0",
        { MKSTREAM: true },
      );
    } catch (err) {
      this.logger.warn(
        `Error while creating consumer groups, they may already exist!: (${err})`,
      );
    }
  }

  private async consumeUserEvents() {
    while (true) {
      try {
        const streams = await this.redisClient.xReadGroup(
          this.consumerGroupName,
          this.consumerName,
          {
            key: "users:events",
            id: ">",
          },
          {
            COUNT: 10,
            BLOCK: 2000,
          },
        );

        if (streams && streams.length > 0) {
          for (const message of streams[0].messages) {
            const event = message.message;

            switch (event.type) {
              case "create_lobby":
                await this.socketRoomManager.addToRoom(
                  event.userId,
                  event.lobbyId,
                );

                this.io.to(event.userId).emit("lobby_created", event.data);
                break;
              default:
                this.logger.warn(
                  `Unknown user event: ${JSON.stringify(event)}`,
                );
            }

            await this.redisClient.xAck(
              "users:events",
              this.consumerGroupName,
              message.id,
            );
          }
        }
      } catch (err) {
        this.logger.error(`Error while consuming user events: (${err})`);
      }
    }
  }

  private async consumeLobbyEvents() {
    while (true) {
      try {
        const streams = await this.redisClient.xReadGroup(
          this.consumerGroupName,
          this.consumerName,
          {
            key: "lobbies:events",
            id: ">",
          },
          {
            COUNT: 10,
            BLOCK: 2000,
          },
        );

        if (streams && streams.length > 0) {
          for (const message of streams[0].messages) {
            const event = message.message;

            switch (event.type) {
              case "lobby_created":
                await this.socketRoomManager.addToRoom(
                  event.userId,
                  event.lobbyId,
                );

                this.io.to(event.userId).emit("lobby_created", event.data);
                break;
              default:
                this.logger.warn(
                  `Unknown lobby event: ${JSON.stringify(event)}`,
                );
            }

            await this.redisClient.xAck(
              "lobbies:events",
              this.consumerGroupName,
              message.id,
            );
          }
        }
      } catch (err) {
        this.logger.error(`Error while consuming lobby events: (${err})`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  private async consumeGameEvents() {
    while (true) {
      try {
        const stream = await this.redisClient.xReadGroup(
          this.consumerGroupName,
          this.consumerName,
          {
            key: "games:events",
            id: ">",
          },
          {
            COUNT: 10,
            BLOCK: 2000,
          },
        );

        if (stream) {
          for (const message of stream) {
            this.logger.debug(
              `Processing game event: ${JSON.stringify(message)}`,
            );
            // TODO: Handle game events
          }
        }
      } catch (err) {
        this.logger.error(`Error while consuming game events: (${err})`);
      }
    }
  }
}

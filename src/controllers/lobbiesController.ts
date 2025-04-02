import { ApiError } from "../middleware/apiError";
import { LobbyModel } from "../models/redis/LobbyModel";
import BaseLogger from "../utils/logger";

export default class LobbiesController {
  constructor(
    private readonly logger: BaseLogger,
    private readonly lobbyModel: LobbyModel,
  ) {}

  async getActiveLobbies() {
    let lobbies;
    try {
      lobbies = await this.lobbyModel.getActiveLobbies();
    } catch (error) {
      throw new ApiError(
        500,
        `Failed to get active lobbies from redis: (${error})`,
      );
    }
    return lobbies;
  }
}

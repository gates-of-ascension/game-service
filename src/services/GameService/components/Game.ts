import { GameState } from "./GameState";
import BaseLogger from "../../../utils/logger";

export type PlayerNumber = 1 | 2;

export type GamePlayerCreationOptions = {
  id: string;
  playerNumber: PlayerNumber;
};

export type PlayEffectCardAction = {
  cardId: string;
};

export type PlayEntityCardAction = {
  cardId: string;
  targets: string[];
};

export type CardTargetsEntityAction = {
  cardId: string;
  targets: string[];
};

export type DebugDamageEnemyPlayerAction = {
  playerNumber: PlayerNumber;
};

export type EndTurnAction = {
  playerNumber: PlayerNumber;
};

export class Game {
  public id: string;
  public gameState: GameState;
  public playerNumberToIdMap: Map<PlayerNumber, string>;
  private logger: BaseLogger;

  constructor(options: { id: string; logger: BaseLogger }) {
    this.logger = options.logger;
    this.id = options.id;
    this.gameState = new GameState({ gameId: this.id, logger: this.logger });
    this.playerNumberToIdMap = new Map();
  }

  async initializeGame(gamePlayers: GamePlayerCreationOptions[]) {
    gamePlayers.forEach((player) => {
      this.playerNumberToIdMap.set(player.playerNumber, player.id);
    });
    this.logger.info(`Initializing game ${this.id}`);
    await this.gameState.initializeGameState(gamePlayers);
    this.logger.info(`Game ${this.id} initialized`);
  }

  async playEffectCard(action: PlayEffectCardAction) {
    await this.gameState.playEffectCard(action.cardId);
  }

  async playEntityCard(action: PlayEntityCardAction) {
    await this.gameState.playEntityCard(action.cardId, action.targets);
  }

  async cardTargetsEntity(action: CardTargetsEntityAction) {
    await this.gameState.cardTargetsEntity(action.cardId, action.targets);
  }

  async debugDamageEnemyPlayer(action: DebugDamageEnemyPlayerAction) {
    await this.gameState.debugDamageEnemyPlayer(action.playerNumber);
  }

  async endTurn(action: EndTurnAction) {
    await this.gameState.endTurn(action.playerNumber);
  }
}

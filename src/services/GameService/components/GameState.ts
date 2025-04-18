import { Player } from "./Player";
import { Board } from "./Board";
import { Entity } from "./Entity";
import { GamePlayerCreationOptions, PlayerNumber } from "./Game";
import BaseLogger from "../../../utils/logger";
import { NotYourTurnError } from "../errors";
import { StateChanges, StateChangesManager } from "./StateChangesManager";

export type ActionResult = {
  winnerId?: string | null;
  loserId?: string | null;
};

export class GameState {
  public players: Player[];
  public gameId: string;
  public board: Board;
  public turn: number;
  public currentPlayerNumber: number;
  public winnerId: string | null;
  public loserId: string | null;
  private logger: BaseLogger;
  private stateChangeManager: StateChangesManager;
  private currentResponseQueue: StateChanges[];

  constructor(options: { gameId: string; logger: BaseLogger }) {
    this.gameId = options.gameId;
    this.board = new Board();
    this.players = [];
    this.turn = 0;
    this.currentPlayerNumber = 1;
    this.logger = options.logger;
    this.winnerId = null;
    this.loserId = null;
    this.stateChangeManager = new StateChangesManager();
    this.currentResponseQueue = [];
  }

  async createInitialPlayers(
    player1Options: { id: string },
    player2Options: { id: string },
  ) {
    const player1Entity = new Entity({
      id: player1Options.id,
      health: 30,
      maxHealth: 30,
      attack: 0,
      defense: 0,
      position: [0, 0],
    });

    const player2Entity = new Entity({
      id: player2Options.id,
      health: 30,
      maxHealth: 30,
      attack: 0,
      defense: 0,
      position: [3, 0],
    });

    const player1 = new Player({
      id: parseInt(player1Options.id),
      name: "Player 1",
      mana: 0,
    });

    const player2 = new Player({
      id: parseInt(player2Options.id),
      name: "Player 2",
      mana: 0,
    });

    this.players.push(player1, player2);

    return { player1Entity, player2Entity };
  }

  async initializeGameState(gamePlayers: GamePlayerCreationOptions[]) {
    const { player1Entity, player2Entity } = await this.createInitialPlayers(
      { id: gamePlayers[0].playerNumber.toString() },
      { id: gamePlayers[1].playerNumber.toString() },
    );

    await this.board.initializeBoard(player1Entity, player2Entity);
  }

  async endActionValidation() {
    const player1Entity = await this.board.getPlayerEntity(1);
    const player2Entity = await this.board.getPlayerEntity(2);

    if (player1Entity.health <= 0) {
      this.winnerId = player2Entity.id;
      this.loserId = player1Entity.id;
      this.stateChangeManager.processActionStateChanges({
        actionType: "game_over",
        winnerId: this.winnerId,
        loserId: this.loserId,
      });
    }

    if (player2Entity.health <= 0) {
      this.winnerId = player1Entity.id;
      this.loserId = player2Entity.id;
      this.stateChangeManager.processActionStateChanges({
        actionType: "game_over",
        winnerId: this.winnerId,
        loserId: this.loserId,
      });
    }

    await this.processActionStateChanges("endActionValidation");
  }

  async endTurn(playerNumber: number) {
    if (playerNumber !== this.currentPlayerNumber) {
      throw new NotYourTurnError(
        `Current player number is ${this.currentPlayerNumber}, but it is not your turn.`,
      );
    }

    await this.endActionValidation();

    this.turn++;
    this.logger.info(`Ending turn ${this.turn}`);
  }

  async processActionStateChanges(actionName: string) {
    const currentActionStateChanges =
      this.stateChangeManager.getCurrentActionStateChanges();
    if (currentActionStateChanges) {
      this.currentResponseQueue.push(currentActionStateChanges);
      this.stateChangeManager.initalizeActionStateChanges();
    } else {
      this.logger.debug(`No action state changes to process for ${actionName}`);
    }
  }

  async debugDamageEnemyPlayer(
    playerNumber: PlayerNumber,
  ): Promise<StateChanges[]> {
    const playerEntity = await this.board.getPlayerEntity(playerNumber);
    const [x, y] = await this.board.getEntityPosition(playerEntity.id);
    playerEntity.health -= 10;
    this.stateChangeManager.processActionStateChanges({
      board: [
        {
          x,
          y,
          entity: {
            id: playerEntity.id,
            position: playerEntity.position,
            health: playerEntity.health,
            maxHealth: playerEntity.maxHealth,
            attack: playerEntity.attack,
            defense: playerEntity.defense,
          },
        },
      ],
      actionType: "debug_damage_enemy_player",
    });
    await this.processActionStateChanges("debugDamageEnemyPlayer");
    this.logger.info(`Debug damage enemy player ${playerNumber}`);
    await this.endActionValidation();

    return this.currentResponseQueue;
  }

  async playEffectCard(cardId: string) {
    console.log("playEffectCard", cardId);
  }

  async playEntityCard(cardId: string, targets: string[]) {
    console.log("playEntityCard", cardId, targets);
  }

  async cardTargetsEntity(cardId: string, targets: string[]) {
    console.log("cardTargetsEntity", cardId, targets);
  }
}

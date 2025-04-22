import { EntityProperties } from "./Entity";
import { PlayerProperties } from "./Player";

export type BoardStateChange = {
  x: number;
  y: number;
  entity: EntityProperties;
};

export type StateChanges = {
  actionType: ActionType | null;
  board?: BoardStateChange[] | null;
  turn?: number | null;
  currentPlayerNumber?: number | null;
  winnerId?: string | null;
  loserId?: string | null;
  players?: PlayerProperties[] | null;
};

export type ActionType =
  | "play_effect_card"
  | "play_entity_card"
  | "debug_damage_enemy_player"
  | "end_turn"
  | "game_over";

export class StateChangesManager {
  private currentTurnStateChanges: StateChanges[];
  private currentActionStateChanges: StateChanges;

  constructor() {
    this.currentTurnStateChanges = this.initalizeTurnStateChanges();
    this.currentActionStateChanges = this.initalizeActionStateChanges();
  }

  initalizeActionStateChanges() {
    return {
      board: null,
      players: null,
      turn: null,
      currentPlayerNumber: null,
      winnerId: null,
      loserId: null,
      actionType: null,
    };
  }

  initalizeTurnStateChanges() {
    return [];
  }

  getCurrentActionStateChanges() {
    return this.currentActionStateChanges;
  }

  async clearCurrentActionStateChanges() {
    this.currentActionStateChanges = this.initalizeActionStateChanges();
  }

  getCurrentTurnStateChanges() {
    return this.currentTurnStateChanges;
  }

  async recordActionStateChanges(stateChanges: StateChanges) {
    this.currentActionStateChanges.actionType = stateChanges.actionType;

    if (stateChanges.board) {
      const boardChanges = stateChanges.board.map((change) => ({
        x: change.x,
        y: change.y,
        entity: change.entity,
      }));
      this.currentActionStateChanges.board = boardChanges;
    }

    if (stateChanges.players) {
      this.currentActionStateChanges.players = stateChanges.players;
    }

    if (stateChanges.turn) {
      this.currentActionStateChanges.turn = stateChanges.turn;
    }

    if (stateChanges.currentPlayerNumber) {
      this.currentActionStateChanges.currentPlayerNumber =
        stateChanges.currentPlayerNumber;
    }

    if (stateChanges.winnerId) {
      this.currentActionStateChanges.winnerId = stateChanges.winnerId;
    }

    if (stateChanges.loserId) {
      this.currentActionStateChanges.loserId = stateChanges.loserId;
    }

    this.currentTurnStateChanges.push(this.currentActionStateChanges);
  }
}

import { Entity } from "./Entity";

export class Board {
  public board: (Entity | null)[][];
  constructor() {
    this.board = [];
  }

  async initializeBoard(player1Entity: Entity, player2Entity: Entity) {
    this.board = [
      [player1Entity] as Entity[],
      [null, null, null, null, null] as (Entity | null)[],
      [null, null, null, null, null] as (Entity | null)[],
      [player2Entity] as Entity[],
    ];
  }

  async getBoard() {
    return this.board;
  }
}

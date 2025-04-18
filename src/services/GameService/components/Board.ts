import { Entity } from "./Entity";

export type BoardRow = [
  Entity | null,
  Entity | null,
  Entity | null,
  Entity | null,
  Entity | null,
];
export type BoardType = [
  [Entity], // First row - player 1
  BoardRow, // Second row
  BoardRow, // Third row
  [Entity], // Fourth row - player 2
];

export class Board {
  public board: BoardType;
  constructor() {
    // Create a default entity for initialization
    const defaultEntity = new Entity({
      id: "default",
      position: [0, 0],
      health: 100,
      maxHealth: 100,
      attack: 0,
      defense: 0,
    });
    this.board = [
      [defaultEntity],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [defaultEntity],
    ];
  }

  async initializeBoard(player1Entity: Entity, player2Entity: Entity) {
    this.board = [
      [player1Entity],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [player2Entity],
    ];
  }

  async getBoard() {
    return this.board;
  }

  async getEntity(x: number, y: number): Promise<Entity | null>;
  async getEntity(x: 0, y: 0): Promise<Entity>;
  async getEntity(x: 3, y: 0): Promise<Entity>;
  async getEntity(x: number, y: number): Promise<Entity | null> {
    return this.board[x][y];
  }

  async getPlayerEntity(playerNumber: 1 | 2): Promise<Entity> {
    return playerNumber === 1 ? this.board[0][0] : this.board[3][0];
  }

  async getPlayerEntityPosition(
    playerNumber: 1 | 2,
  ): Promise<[number, number]> {
    return playerNumber === 1 ? [0, 0] : [3, 0];
  }

  async getEntityPosition(entityId: string): Promise<[number, number]> {
    for (let x = 0; x < this.board.length; x++) {
      for (let y = 0; y < this.board[x].length; y++) {
        if (this.board[x][y]?.id === entityId) {
          return [x, y];
        }
      }
    }
    throw new Error(`Entity ${entityId} not found on board`);
  }
}

import { GameState } from "./GameState";

export type GamePlayerCreationOptions = {
  id: string;
  playerNumber: number;
};

export class Game {
  public id: string;
  public gameState: GameState;
  public playerNumberToIdMap: Map<number, string>;

  constructor(options: { id: string }) {
    this.id = options.id;
    this.gameState = new GameState({ gameId: this.id });
    this.playerNumberToIdMap = new Map();
  }

  async initializeGame(gamePlayers: GamePlayerCreationOptions[]) {
    gamePlayers.forEach((player) => {
      this.playerNumberToIdMap.set(player.playerNumber, player.id);
    });
    await this.gameState.initializeGameState(gamePlayers);
  }
}

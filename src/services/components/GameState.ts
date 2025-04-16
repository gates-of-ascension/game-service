import { Player } from "./Player";
import { Board } from "./Board";
import { Entity } from "./Entity";
import { GamePlayerCreationOptions } from "./Game";

export class GameState {
  public players: Player[];
  public gameId: string;
  public board: Board;

  constructor(options: { gameId: string }) {
    this.gameId = options.gameId;
    this.board = new Board();
    this.players = [];
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
}

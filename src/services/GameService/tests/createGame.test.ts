import {
  createGame,
  assertPlayer,
  assertPlayerEntity,
  assertEmptyRow,
} from "./utils";
import { BoardRow } from "../components/Board";

describe("createGame", () => {
  it("should create a game with a proper game state", async () => {
    const game = await createGame();
    expect(game).toBeDefined();

    const gameState = game.gameState;
    expect(gameState).toBeDefined();

    expect(gameState.players).toBeDefined();
    expect(gameState.players.length).toBe(2);
    assertPlayer(gameState.players[0], "pid-1", "Player 1", 0);
    assertPlayer(gameState.players[1], "pid-2", "Player 2", 0);

    // Assert board structure is correctly set up
    const board = gameState.board.board;
    expect(board).toBeDefined();

    // Assert player entities in the correct positions
    assertPlayerEntity(board[0][0], "pid-1");
    assertPlayerEntity(board[3][0], "pid-2");

    // Assert empty rows in the middle of the board
    assertEmptyRow(board[1] as BoardRow);
    assertEmptyRow(board[2] as BoardRow);
  });
});

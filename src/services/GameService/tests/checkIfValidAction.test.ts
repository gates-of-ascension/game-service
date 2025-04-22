import { GameOverError, NotYourTurnError } from "../errors";
import { createGame } from "./utils";

describe("checkIfValidAction", () => {
  it("should throw an error if the game is over", async () => {
    const game = await createGame();
    const gameState = game.gameState;
    await gameState.debugDamageEnemyPlayer(1, 2);
    await gameState.debugDamageEnemyPlayer(1, 2);
    await gameState.debugDamageEnemyPlayer(1, 2);

    expect(async () => {
      await gameState.debugDamageEnemyPlayer(1, 2);
    }).rejects.toThrow(GameOverError);
  });

  it("Should throw an error if it's not the current player's turn", async () => {
    const game = await createGame();
    const gameState = game.gameState;

    expect(async () => {
      await gameState.debugDamageEnemyPlayer(2, 1);
    }).rejects.toThrow(NotYourTurnError);
  });
});

import { createGame } from "./utils";

describe("debugDamageEnemyPlayer", () => {
  it("should damage the enemy player", async () => {
    const game = await createGame();
    const gameState = game.gameState;
    const board = gameState.board;
    const player2Entity = await board.getPlayerEntity(2);
    const player2EntityCopy = { ...player2Entity };

    const stateChanges = await gameState.debugDamageEnemyPlayer(2);

    expect({ ...player2Entity }).toEqual({
      ...player2EntityCopy,
      health: player2EntityCopy.health - 10,
    });
    expect(stateChanges.length).toBe(1);
    expect(stateChanges[0].actionType).toBe("debug_damage_enemy_player");
    expect(stateChanges[0].board).toEqual([
      {
        x: player2EntityCopy.position[0],
        y: player2EntityCopy.position[1],
        entity: { ...player2Entity },
      },
    ]);
    expect(gameState.currentResponseQueue.length).toBe(0);
  });

  it("should be able to end the game when the enemy player is defeated", async () => {
    const game = await createGame();
    const gameState = game.gameState;
    const board = gameState.board;
    const player2Entity = await board.getPlayerEntity(2);

    await gameState.debugDamageEnemyPlayer(2);
    await gameState.debugDamageEnemyPlayer(2);
    const stateChanges = await gameState.debugDamageEnemyPlayer(2);

    expect(gameState.winnerId).toBe("pid-1");
    expect(gameState.loserId).toBe("pid-2");
    expect(stateChanges.length).toBe(2);
    expect(stateChanges[0].actionType).toBe("debug_damage_enemy_player");
    expect(stateChanges[1].actionType).toBe("game_over");
  });
});

import BaseLogger from "../../../utils/logger";
import { BoardRow } from "../components/Board";
import { Entity } from "../components/Entity";
import { Game, PlayerNumber } from "../components/Game";
import { Player } from "../components/Player";
import path from "path";

const logger = new BaseLogger(path.join(__dirname, "../../../app.log"));

export async function createGame(
  gameCreateOptions: {
    gameId: string;
    players: { id: string; playerNumber: PlayerNumber }[];
  } = {
    gameId: "test-game-id",
    players: [
      { id: "test-player-id", playerNumber: 1 },
      { id: "test-player-id-2", playerNumber: 2 },
    ],
  },
) {
  const game = new Game({ id: gameCreateOptions.gameId, logger });
  await game.initializeGame(gameCreateOptions.players);
  return game;
}

export function assertPlayer(
  player: Player,
  expectedId: string,
  expectedName: string,
  expectedMana: number,
) {
  expect(player).toBeDefined();
  expect(player.id).toBe(expectedId);
  expect(player.name).toBe(expectedName);
  expect(player.mana).toBe(expectedMana);
}

export function assertPlayerEntity(
  entity: Entity,
  expectedId: string,
  expectedHealth: number = 30,
) {
  expect(entity).toBeDefined();
  expect(entity.id).toBe(expectedId);
  expect(entity.health).toBe(expectedHealth);
  expect(entity.maxHealth).toBe(30);
  expect(entity.attack).toBe(0);
  expect(entity.defense).toBe(0);
}

export function assertEmptyRow(row: BoardRow) {
  expect(row).toBeDefined();
  expect(row.length).toBe(5);
  expect(row).toEqual([null, null, null, null, null]);
}

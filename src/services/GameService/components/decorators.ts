/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { GameState } from "./GameState";
import { GameOverError } from "../errors";

export function checkIfValidAction() {
  return function (originalMethod: any, _context: ClassMethodDecoratorContext) {
    return function (this: GameState, ...args: any[]) {
      if (this.winnerId !== null || this.loserId !== null) {
        throw new GameOverError("Game is over");
      }

      return originalMethod.apply(this, args);
    };
  };
}

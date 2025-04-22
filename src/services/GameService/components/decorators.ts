/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { GameState } from "./GameState";
import { GameOverError, NotYourTurnError } from "../errors";

export function checkIfValidAction(
  _target: any,
  _propertyKey: string,
  descriptor: PropertyDescriptor,
) {
  const originalMethod = descriptor.value;

  descriptor.value = function (this: GameState, ...args: any[]) {
    const initiator = args[0];

    if (initiator !== this.currentPlayerNumber) {
      throw new NotYourTurnError(
        `Could not process action, it's not your turn.`,
      );
    }

    if (this.winnerId !== null || this.loserId !== null) {
      throw new GameOverError(
        "Could not process action, game is already over.",
      );
    }

    return originalMethod.apply(this, args);
  };
}

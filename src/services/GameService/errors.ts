export class NotYourTurnError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotYourTurnError";
  }
}

export class GameNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameNotFoundError";
  }
}

export class GameOverError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameOverError";
  }
}

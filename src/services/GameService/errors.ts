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

export class CouldNotProcessActionStateChangesError extends Error {
  public details: Record<string, unknown>;
  constructor(message: string, details: Record<string, unknown>) {
    super(message);
    this.name = "CouldNotProcessActionStateChangesError";
    this.details = details;
  }
}
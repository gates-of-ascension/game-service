import { Game } from "../models/redis/GameModel";
import { Lobby } from "../models/redis/LobbyModel";
import { Socket } from "socket.io";

export type SocketErrorName =
  | "client_error"
  | "server_error"
  | "validation_error"
  | "error";

export type LobbyChannelServerToClientEvents = {
  lobby_created: (lobby: Lobby) => void;
  game_started: (game: Game) => void;
  lobby_deleted: (lobbyId: string) => void;
  lobby_joined: (lobbyId: string) => void;
  user_ready: (lobbyId: string, userId: string, ready: boolean) => void;
  // Error events
  server_error: (error: string) => void;
  client_error: (error: string) => void;
  validation_error: (error: string) => void;
  error: (error: string) => void;
};

export type LobbyChannelClientToServerEvents = {
  create_lobby: (lobby: Lobby) => void;
  leave_current_lobby: () => void;
  join_lobby: (lobbyId: string) => void;
  update_lobby: (lobby: Lobby) => void;
  delete_lobby: () => void;
  start_game: () => void;
  set_user_ready: (ready: { isReady: boolean }) => void;
};

export type LobbyChannelSocket = Socket<
  LobbyChannelClientToServerEvents,
  LobbyChannelServerToClientEvents
>;

export class SocketError extends Error {
  constructor(name: SocketErrorName, message: string) {
    super(message);
    this.name = name;
  }
}

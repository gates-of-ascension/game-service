import { Game } from "../models/redis/GameModel";
import { Lobby } from "../models/redis/LobbyModel";
import { Socket } from "socket.io";

export type SocketErrorName =
  | "client_error"
  | "server_error"
  | "validation_error"
  | "error";

export type LobbyChannelServerToClientEvents = {
  lobby_created: (message: { lobby: Lobby }) => void;
  game_started: (message: { game: Game }) => void;
  lobby_deleted: (message: { lobbyId: string }) => void;
  lobby_joined: (message: { lobbyId: string }) => void;
  user_ready: (message: {
    lobbyId: string;
    userId: string;
    ready: boolean;
  }) => void;
  user_joined: (message: { userId: string; displayName: string }) => void;
  user_left: (message: { userId: string; displayName: string }) => void;
  user_session_lobby_removed: () => void;
  // Error events
  server_error: (error: string) => void;
  client_error: (error: string) => void;
  validation_error: (error: string) => void;
  error: (error: string) => void;
};

export type LobbyChannelClientToServerEvents = {
  create_lobby: (message: Lobby) => void;
  leave_current_lobby: () => void;
  join_lobby: (message: { lobbyId: string }) => void;
  update_lobby: (message: Lobby) => void;
  delete_lobby: () => void;
  start_game: () => void;
  set_user_ready: (message: { isReady: boolean }) => void;
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

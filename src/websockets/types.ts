import { Game } from "../models/redis/GameModel";
import { Lobby } from "../models/redis/LobbyModel";
import { Socket } from "socket.io";

export type LobbyChannelServerToClientEvents = {
  lobby_created: (lobby: Lobby) => void;
  game_started: (game: Game) => void;
  user_session_lobby_removed: () => void;
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
};

export type LobbyChannelSocket = Socket<
  LobbyChannelClientToServerEvents,
  LobbyChannelServerToClientEvents
>;

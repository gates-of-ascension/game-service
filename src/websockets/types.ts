/* eslint-disable @typescript-eslint/no-empty-object-type */
import { Socket } from "socket.io";
import { PlayerNumber } from "../services/GameService/components/Game";
import { StateChanges } from "../services/GameService/components/StateChangesManager";
export type SocketErrorName =
  | "client_error"
  | "server_error"
  | "validation_error"
  | "error";

export type UserSession = {
  id: string;
  username: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
  userDecksIds: string[];
};

export type PlayerIdentity = {
  id: string;
  displayName: string;
};

export type LobbySessionUser = PlayerIdentity & {
  isReady: boolean;
  joinedAt: Date;
};

export type GameSessionUser = PlayerIdentity & {
  joinedAt: Date;
};

export type LobbySession = {
  id: string;
  name: string;
  owner: LobbySessionUser;
  users: LobbySessionUser[];
  createdAt: Date;
  updatedAt: Date;
};

export type GameSession = {
  id: string;
  lobbyId: string;
  players: GameSessionUser[];
  gameData: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
};

export type Session = {
  user?: UserSession;
  lobby?: LobbySession | {};
  game?: GameSession | {};
};

export type LobbyChannelServerToClientEventNames =
  | "lobby_created"
  | "game_started"
  | "lobby_deleted"
  | "lobby_joined"
  | "user_ready"
  | "user_joined"
  | "user_left"
  | "user_session_lobby_removed";

export type LobbyChannelServerToClientEvents = {
  user_session_updated: (message: {
    session: Session;
    event_name: LobbyChannelServerToClientEventNames;
  }) => void;
  // Error events
  server_error: (error: string) => void;
  client_error: (error: string) => void;
  validation_error: (error: string) => void;
};

export type CreateLobbyOptions = {
  name: string;
};

export type UpdateLobbyOptions = {
  name: string;
};

export type LobbyChannelClientToServerEvents = {
  create_lobby: (message: CreateLobbyOptions) => void;
  leave_current_lobby: () => void;
  join_lobby: (message: { lobbyId: string }) => void;
  update_lobby: (message: UpdateLobbyOptions) => void;
  delete_lobby: () => void;
  start_game: () => void;
  set_user_ready: (message: { isReady: boolean }) => void;
};

export type LobbyChannelSocket = Socket<
  LobbyChannelClientToServerEvents,
  LobbyChannelServerToClientEvents
>;

export type GameChannelServerToClientEventNames =
  | "player_left"
  | "user_left"
  | "user_session_game_removed"
  | "user_session_lobby_removed"
  | "debug_damage_enemy_player"
  | "game_state_updated";

export type GameChannelServerToClientEvents = {
  user_session_updated: (message: {
    session: Session;
    event_name: GameChannelServerToClientEventNames;
  }) => void;
  game_state_updated: (message: { gameStateChanges: StateChanges[] }) => void;
  // Error events
  server_error: (error: string) => void;
  client_error: (error: string) => void;
  validation_error: (error: string) => void;
};

export type GameChannelClientToServerEvents = {
  leave_current_game: () => void;
  debug_damage_enemy_player: (
    gameId: string,
    playerNumber: PlayerNumber,
  ) => void;
};

export type GameChannelSocket = Socket<
  GameChannelClientToServerEvents,
  GameChannelServerToClientEvents
>;

export class SocketError extends Error {
  constructor(name: SocketErrorName, message: string) {
    super(message);
    this.name = name;
  }
}

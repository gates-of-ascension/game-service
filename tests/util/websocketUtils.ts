import { LobbyModel } from "../../src/models/redis/LobbyModel";
import { Socket as ClientSocket } from "socket.io-client";
import { Socket as ServerSocket } from "socket.io";

export async function waitFor(
  socket: ServerSocket | ClientSocket,
  event: string,
  message?: string,
) {
  return new Promise<void>((resolve) => {
    socket.once(event, (data) => {
      if (message) {
        expect(data).toEqual(message);
      }
      resolve();
    });
  });
}

export async function createLobby(socket: ClientSocket, lobbyName: string) {
  socket.emit("create_lobby", {
    name: lobbyName,
  });

  return waitFor(socket, "lobby_created");
}

export async function joinLobby(socket: ClientSocket, lobbyId: string) {
  socket.emit("join_lobby", {
    lobbyId,
  });

  return waitFor(socket, "lobby_joined");
}

export async function setUserReady(socket: ClientSocket) {
  socket.emit("set_user_ready", {
    isReady: true,
  });

  return waitFor(socket, "user_ready");
}

export async function getLobbyState(lobbyModel: LobbyModel, lobbyId: string) {
  const lobby = await lobbyModel.get(lobbyId);
  if (!lobby) {
    throw new Error(`No lobby found with id ${lobbyId}`);
  }
  return lobby;
}

export async function expectLobbyState(
  lobbyModel: LobbyModel,
  lobbyId: string,
  expectedState: Partial<{
    name: string;
    ownerId: string;
    userIds: string[];
    userCount: number;
    isReady: {
      userId: string;
      isReady: boolean;
    };
  }>,
) {
  const lobby = await getLobbyState(lobbyModel, lobbyId);

  if (expectedState.name) {
    expect(lobby.name).toBe(expectedState.name);
  }

  if (expectedState.ownerId) {
    expect(lobby.owner.id).toBe(expectedState.ownerId);
  }

  if (expectedState.userIds) {
    const actualUserIds = lobby.users.map((u) => u.id);
    expect(actualUserIds).toEqual(
      expect.arrayContaining(expectedState.userIds),
    );
  }

  if (expectedState.isReady) {
    if (expectedState.isReady.userId === lobby.owner.id) {
      expect(lobby.owner.isReady).toBe(expectedState.isReady.isReady);
    } else {
      expect(
        lobby.users.find((u) => u.id === expectedState.isReady!.userId)
          ?.isReady,
      ).toBe(expectedState.isReady.isReady);
    }
  }

  if (expectedState.userCount !== undefined) {
    expect(lobby.users.length).toBe(expectedState.userCount);
  }

  return lobby;
}

import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { GameState } from '../types';

// Client connection tracking
interface WSClient {
  ws: WebSocket;
  roomId: string;
  playerId: string;
  isAlive: boolean;
}

// Store all active WebSocket clients by room
const roomClients = new Map<string, Set<WSClient>>();

// WebSocket message types
export type WSMessage = 
  | { type: 'game_update'; gameState: GameState }
  | { type: 'ping' }
  | { type: 'pong' }
  | { type: 'error'; message: string };

export class WebSocketManager {
  private static wss: WebSocketServer | null = null;

  static initialize() {
    if (this.wss) return this.wss;

    this.wss = new WebSocketServer({ noServer: true });

    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage, roomId: string, playerId: string) => {
      console.log(`[WS] Client connected: room=${roomId}, player=${playerId}`);

      const client: WSClient = {
        ws,
        roomId,
        playerId,
        isAlive: true,
      };

      // Add client to room
      if (!roomClients.has(roomId)) {
        roomClients.set(roomId, new Set());
      }
      roomClients.get(roomId)!.add(client);

      // Handle pong responses
      ws.on('pong', () => {
        client.isAlive = true;
      });

      // Handle incoming messages
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(client, message);
        } catch (error) {
          console.error('[WS] Error parsing message:', error);
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        console.log(`[WS] Client disconnected: room=${roomId}, player=${playerId}`);
        const roomSet = roomClients.get(roomId);
        if (roomSet) {
          roomSet.delete(client);
          if (roomSet.size === 0) {
            roomClients.delete(roomId);
          }
        }
      });

      ws.on('error', (error) => {
        console.error('[WS] WebSocket error:', error);
      });

      // Send initial connection success
      this.sendToClient(client, { type: 'ping' });
    });

    // Heartbeat to detect broken connections
    const heartbeatInterval = setInterval(() => {
      this.wss?.clients.forEach((ws) => {
        for (const [roomId, clients] of roomClients.entries()) {
          for (const client of clients) {
            if (client.ws === ws) {
              if (!client.isAlive) {
                console.log(`[WS] Terminating dead connection: room=${roomId}, player=${client.playerId}`);
                client.ws.terminate();
                clients.delete(client);
                if (clients.size === 0) {
                  roomClients.delete(roomId);
                }
                return;
              }
              client.isAlive = false;
              ws.ping();
              return;
            }
          }
        }
      });
    }, 30000); // Every 30 seconds

    this.wss.on('close', () => {
      clearInterval(heartbeatInterval);
    });

    console.log('[WS] WebSocket server initialized');
    return this.wss;
  }

  static getServer() {
    return this.wss;
  }

  private static handleMessage(client: WSClient, message: WSMessage) {
    if (message.type === 'pong') {
      client.isAlive = true;
    }
  }

  private static sendToClient(client: WSClient, message: WSMessage) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  // Broadcast game state update to all clients in a room
  static broadcastToRoom(roomId: string, gameState: GameState) {
    const clients = roomClients.get(roomId);
    if (!clients) return;

    const message: WSMessage = {
      type: 'game_update',
      gameState,
    };

    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
        sentCount++;
      }
    });

    if (sentCount > 0) {
      console.log(`[WS] Broadcast to room ${roomId}: ${sentCount} clients`);
    }
  }

  // Send update to specific player
  static sendToPlayer(roomId: string, playerId: string, message: WSMessage) {
    const clients = roomClients.get(roomId);
    if (!clients) return;

    clients.forEach((client) => {
      if (client.playerId === playerId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  // Get connected client count for a room
  static getRoomClientCount(roomId: string): number {
    return roomClients.get(roomId)?.size || 0;
  }

  // Get all connected players in a room
  static getRoomPlayers(roomId: string): string[] {
    const clients = roomClients.get(roomId);
    if (!clients) return [];
    return Array.from(clients).map(c => c.playerId);
  }

  // Close all connections in a room
  static closeRoom(roomId: string) {
    const clients = roomClients.get(roomId);
    if (!clients) return;

    clients.forEach((client) => {
      client.ws.close();
    });

    roomClients.delete(roomId);
    console.log(`[WS] Closed room ${roomId}`);
  }
}

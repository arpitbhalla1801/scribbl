const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Create Next.js app with custom server
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Simple WebSocket room management
const roomClients = new Map();

function broadcastToRoom(roomId, message) {
  const clients = roomClients.get(roomId);
  if (!clients) return;

  const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
  let sentCount = 0;

  clients.forEach((ws) => {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(messageStr);
      sentCount++;
    }
  });

  if (sentCount > 0) {
    console.log(`[WS] Broadcast to room ${roomId}: ${sentCount} clients`);
  }
}

// Make broadcast function globally available for GameManager
global.broadcastToRoom = broadcastToRoom;

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url || '', true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize WebSocket server
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws, request, roomId, playerId) => {
    console.log(`[WS] Client connected: room=${roomId}, player=${playerId}`);

    // Add client to room
    if (!roomClients.has(roomId)) {
      roomClients.set(roomId, new Set());
    }
    roomClients.get(roomId).add(ws);

    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'pong') {
          ws.isAlive = true;
        }
      } catch (error) {
        console.error('[WS] Error parsing message:', error);
      }
    });

    ws.on('close', () => {
      console.log(`[WS] Client disconnected: room=${roomId}, player=${playerId}`);
      const roomSet = roomClients.get(roomId);
      if (roomSet) {
        roomSet.delete(ws);
        if (roomSet.size === 0) {
          roomClients.delete(roomId);
        }
      }
    });

    ws.on('error', (error) => {
      console.error('[WS] WebSocket error:', error);
    });

    // Send initial ping
    ws.send(JSON.stringify({ type: 'ping' }));
  });

  // Heartbeat to detect broken connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  // Handle WebSocket upgrade requests
  server.on('upgrade', (request, socket, head) => {
    const { pathname, query } = parse(request.url || '', true);

    if (pathname === '/api/ws') {
      const roomId = query.roomId;
      const playerId = query.playerId;

      if (!roomId || !playerId) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, roomId, playerId);
      });
    } else {
      socket.destroy();
    }
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server ready on ws://${hostname}:${port}/api/ws`);
  });
});

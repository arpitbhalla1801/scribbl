const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');
const { TLSocketRoom } = require('@tldraw/sync-core');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Create Next.js app with custom server
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// One TLSocketRoom per game room, holding that room's shared canvas. Kept
// in-memory only - the canvas doesn't need to survive a server restart, and
// (like the game state) this only works with a single server instance.
const canvasRooms = new Map();
const canvasRoomCleanupTimers = new Map();
// Grace period before dropping an empty canvas room, so a quick refresh or
// reconnect doesn't wipe the drawing mid-turn.
const CANVAS_ROOM_GRACE_MS = 60_000;

function getOrCreateCanvasRoom(roomId) {
  clearTimeout(canvasRoomCleanupTimers.get(roomId));
  canvasRoomCleanupTimers.delete(roomId);

  let room = canvasRooms.get(roomId);
  if (!room) {
    room = new TLSocketRoom({
      onSessionRemoved(_room, { numSessionsRemaining }) {
        if (numSessionsRemaining === 0) scheduleCanvasRoomCleanup(roomId);
      },
    });
    canvasRooms.set(roomId, room);
  }
  return room;
}

function scheduleCanvasRoomCleanup(roomId) {
  clearTimeout(canvasRoomCleanupTimers.get(roomId));
  canvasRoomCleanupTimers.set(
    roomId,
    setTimeout(() => {
      canvasRooms.delete(roomId);
      canvasRoomCleanupTimers.delete(roomId);
    }, CANVAS_ROOM_GRACE_MS)
  );
}

app.prepare().then(() => {
  // Next has its own websocket traffic (HMR in dev). Anything that isn't our
  // canvas path needs to fall through to Next's own handler, not get dropped.
  const handleNextUpgrade = app.getUpgradeHandler();

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

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (req, socket, head) => {
    const { pathname, query } = parse(req.url || '', true);
    // Same room ID shape as validateRoomId() in src/lib/validation.ts.
    const match = pathname?.match(/^\/api\/connect\/([A-Z0-9]{6})$/);
    const roomId = match?.[1];
    const playerId = typeof query.playerId === 'string' ? query.playerId : '';

    if (!roomId || !playerId) {
      handleNextUpgrade(req, socket, head);
      return;
    }

    // Ask the app's own (rate-limited, validated) game endpoint who the
    // current drawer is, rather than trusting anything the socket claims -
    // draw permission comes from the game state, not from the client.
    // Forward the browser's cookies so the game endpoint can check the
    // session tied to playerId - without this, anyone could open a socket
    // with someone else's playerId in the URL and get their draw permission.
    let isReadonly = true;
    try {
      const gameRes = await fetch(`http://${hostname}:${port}/api/games/${roomId}?playerId=${playerId}`, {
        headers: { cookie: req.headers.cookie || '' },
      });
      const data = await gameRes.json();
      isReadonly = data?.gameState?.currentDrawer !== playerId;
    } catch (err) {
      console.error(`[sync] failed to check draw permission for room ${roomId}:`, err);
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      getOrCreateCanvasRoom(roomId).handleSocketConnect({ sessionId: playerId, socket: ws, isReadonly });
    });
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});

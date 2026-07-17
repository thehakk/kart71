import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { Server, type Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  GamePhase,
  InterServerEvents,
  ServerToClientEvents,
  Seat,
  SocketData,
} from './shared/types.js';
import { RoomManager } from './rooms.js';
import { toGameView, type GameState } from './engine/state.js';
import {
  ActionError,
  canAskForDiscard,
  canTakeTopDiscard,
  finishHand,
  openMelds,
  layMelds,
  layPairs,
  openPairs,
  processFromDiscard,
  processFromHand,
  processFromHandBatch,
  respondDiscard,
  swapJokerInMeld,
  swapWildInPair,
  swapWildFromDiscard,
  takeDiscard,
  drawFromPile,
  discardCard,
  declareCiftci,
} from './engine/actions.js';
import { runBotTurn, shouldBotGiveDiscard } from './engine/bot.js';

const PORT = Number(process.env.PORT ?? 3001);
const corsOrigin =
  process.env.CLIENT_ORIGIN ??
  (process.env.NODE_ENV === 'production' ? true : 'http://localhost:5173');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

const app = express();
app.use(cors({ origin: corsOrigin }));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'kart71-server' }));

if (process.env.NODE_ENV === 'production' || fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/socket.io') || req.path === '/health') return next();
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
}

const server = http.createServer(app);
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(server, {
  cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
});

const rooms = new RoomManager();

function broadcastRoom(code: string) {
  const room = rooms.get(code);
  if (!room) return;
  for (const [, sock] of io.of('/').sockets) {
    if (sock.data.code === code) {
      // Koltuk atamasi (pickSeat/shuffle sonrasi) degismis olabilir; senkronla.
      const seat = room.seatOfSocket(sock.id);
      sock.data.seat = seat ?? undefined;
      sock.emit('room:update', room.toView(seat));
    }
  }
}

function broadcastGame(code: string) {
  const room = rooms.get(code);
  if (!room || !room.game) return;
  for (const [, sock] of io.of('/').sockets) {
    if (sock.data.code === code) {
      const seat = room.seatOfSocket(sock.id);
      if (seat != null) {
        const view = {
          ...toGameView(room.game, seat),
          discardAskable: canAskForDiscard(room.game, seat),
          discardTakeable: canTakeTopDiscard(room.game, seat),
          ...(room.game.phase === 'ended'
            ? { handContinue: room.handContinueView(seat) }
            : {}),
        };
        sock.emit('game:update', view);
      }
    }
  }
}

function onHandJustEnded(code: string) {
  const room = rooms.get(code);
  if (!room) return;
  room.resetHandContinueReady();
  broadcastRoom(code);
}

// 4 oyuncu (bot dahil) hazirsa oyunu baslat.
function maybeStart(code: string) {
  const room = rooms.get(code);
  if (!room || room.status !== 'lobby') return;
  if (room.allReady()) {
    room.startGame();
    broadcastRoom(code);
    broadcastGame(code);
    console.log(`[kart71] game started in room ${code}`);
    scheduleBots(code);
  }
}

const BOT_DELAY_MS = 800;

function scheduleBots(code: string) {
  setTimeout(() => botTick(code), BOT_DELAY_MS);
}

// Bot: desteden cek / atik iste / per ac / kart at (M8).
function botTick(code: string) {
  const room = rooms.get(code);
  if (!room || !room.game) return;
  const g = room.game;
  if (g.phase === 'ended') {
    broadcastGame(code);
    return;
  }

  // Bekleyen atik istegi: atan bot veya baglantisi kopuk oyuncu karar verir.
  if (g.pending) {
    const responder = g.players[g.pending.discarderSeat];
    if (responder?.isBot || (responder && !responder.connected)) {
      try {
        const give =
          responder.isBot
            ? shouldBotGiveDiscard(g, g.pending.discarderSeat)
            : true;
        respondDiscard(g, g.pending.discarderSeat, give);
        broadcastGame(code);
        scheduleBots(code);
      } catch {
        return;
      }
      return;
    }
    return;
  }

  const p = g.players[g.turnSeat];
  if (!p) {
    console.error('[botTick] gecersiz turnSeat', g.turnSeat, 'oda', code);
    return;
  }
  if (p.isBot || !p.connected) {
    try {
      const result = runBotTurn(g, g.turnSeat);
      if (result === 'noop') return;
      broadcastGame(code);
      const phaseAfter = g.phase as GamePhase;
      if (phaseAfter === 'ended') {
        onHandJustEnded(code);
      } else if (result !== 'handEnded') {
        scheduleBots(code);
      }
    } catch {
      return;
    }
  }
}

io.on('connection', (socket) => {
  console.log(`[io] connected ${socket.id}`);

  socket.on('room:join', ({ code, name }, ack) => {
    const trimmedName = name?.trim() || 'Oyuncu';
    const room = rooms.getOrCreate(code);

    if (room.status !== 'lobby') {
      const seat = room.reconnectPlayer(trimmedName, socket.id);
      if (seat === null) {
        ack?.({
          ok: false,
          error: 'Oyun devam ediyor; bu isimle bağlı koltuk bulunamadı.',
        });
        return;
      }
      socket.data.code = room.code;
      socket.data.seat = seat;
      socket.join(room.code);
      ack?.({ ok: true, code: room.code, seat });
      broadcastRoom(room.code);
      if (room.game) broadcastGame(room.code);
      return;
    }

    const reconnected = room.reconnectPlayer(trimmedName, socket.id);
    if (reconnected != null) {
      socket.data.code = room.code;
      socket.data.seat = reconnected;
      socket.join(room.code);
      ack?.({ ok: true, code: room.code, seat: reconnected });
      broadcastRoom(room.code);
      return;
    }

    const seat = room.seatPlayer(trimmedName, socket.id);
    if (seat === null) {
      ack?.({ ok: false, error: 'Oda dolu.' });
      return;
    }
    socket.data.code = room.code;
    socket.data.seat = seat;
    socket.join(room.code);
    ack?.({ ok: true, code: room.code, seat });
    broadcastRoom(room.code);
  });

  socket.on('room:ready', ({ ready }) => {
    const { code, seat } = socket.data;
    if (code == null || seat == null) return;
    const room = rooms.get(code);
    if (!room) return;
    room.setReady(seat as Seat, ready);
    broadcastRoom(code);
    if (room.status === 'lobby') {
      maybeStart(code);
      return;
    }
    if (room.game?.phase === 'ended') {
      if (room.maybeContinueHand()) {
        broadcastRoom(code);
        broadcastGame(code);
        scheduleBots(code);
      } else if (room.status === 'finished') {
        broadcastRoom(code);
      } else {
        broadcastGame(code);
      }
    }
  });

  socket.on('room:fillBots', () => {
    const { code } = socket.data;
    if (code == null) return;
    const room = rooms.get(code);
    if (!room) return;
    room.fillBots();
    broadcastRoom(code);
    maybeStart(code);
  });

  socket.on('room:pickSeat', ({ seat }) => {
    const { code } = socket.data;
    if (code == null) return;
    const room = rooms.get(code);
    if (!room) return;
    if (room.moveToSeat(socket.id, seat)) {
      broadcastRoom(code);
    } else {
      socket.emit('error', { message: 'Bu koltuğa taşınılamıyor.' });
    }
  });

  socket.on('room:shuffleTeams', () => {
    const { code } = socket.data;
    if (code == null) return;
    const room = rooms.get(code);
    if (!room) return;
    room.shuffleTeams();
    broadcastRoom(code);
  });

  const runTurnAction = (fn: (game: GameState, seat: Seat) => void) => {
    const { code } = socket.data;
    if (code == null) return;
    const room = rooms.get(code);
    if (!room || !room.game) return;
    const seat = room.seatOfSocket(socket.id);
    if (seat == null) return;
    try {
      const wasEnded = room.game.phase === 'ended';
      fn(room.game, seat);
      broadcastGame(code);
      if (room.game.phase === 'ended' && !wasEnded) {
        onHandJustEnded(code);
      } else if (room.game.phase !== 'ended') {
        scheduleBots(code);
      }
    } catch (e) {
      if (e instanceof ActionError) socket.emit('error', { message: e.message });
    }
  };

  socket.on('turn:drawPile', () => runTurnAction((g, seat) => drawFromPile(g, seat)));
  socket.on('turn:takeDiscard', (payload) =>
    runTurnAction((g, seat) => takeDiscard(g, seat, payload?.ask ?? true))
  );
  socket.on('turn:declareCiftci', () =>
    runTurnAction((g, seat) => declareCiftci(g, seat))
  );
  socket.on('turn:discard', ({ cardId }) =>
    runTurnAction((g, seat) => discardCard(g, seat, cardId))
  );
  socket.on('meld:open', ({ melds }) =>
    runTurnAction((g, seat) => openMelds(g, seat, melds))
  );
  socket.on('meld:lay', ({ melds }) =>
    runTurnAction((g, seat) => layMelds(g, seat, melds))
  );
  socket.on('meld:layPairs', (payload) =>
    runTurnAction((g, seat) => layPairs(g, seat, payload?.pairs ?? []))
  );
  socket.on('meld:openPairs', (payload) =>
    runTurnAction((g, seat) => openPairs(g, seat, payload?.pairs ?? []))
  );
  socket.on('meld:processHand', (payload) =>
    runTurnAction((g, seat) => {
      const ops = payload?.ops;
      if (Array.isArray(ops) && ops.length > 0) {
        processFromHandBatch(
          g,
          seat,
          ops.map((op) => ({
            meldId: op?.meldId ?? '',
            cardId: op?.cardId ?? '',
          }))
        );
        return;
      }
      const cardIds = payload?.cardIds;
      if (Array.isArray(cardIds) && cardIds.length > 0) {
        processFromHandBatch(
          g,
          seat,
          cardIds.map((cardId) => ({
            meldId: payload?.meldId ?? '',
            cardId,
          }))
        );
        return;
      }
      processFromHand(g, seat, payload?.meldId ?? '', payload?.cardId ?? '');
    })
  );
  socket.on('meld:processDiscard', (payload) =>
    runTurnAction((g, seat) => processFromDiscard(g, seat, payload?.meldId ?? ''))
  );
  socket.on('meld:swapJoker', (payload) =>
    runTurnAction((g, seat) =>
      swapJokerInMeld(g, seat, payload?.meldId ?? '', payload?.cardId ?? '')
    )
  );
  socket.on('meld:swapJokerPair', (payload) =>
    runTurnAction((g, seat) =>
      swapWildInPair(
        g,
        seat,
        payload?.ownerSeat ?? 0,
        payload?.pairIndex ?? 0,
        payload?.cardId ?? ''
      )
    )
  );
  socket.on('meld:swapWildFromDiscard', (payload) =>
    runTurnAction((g, seat) =>
      swapWildFromDiscard(
        g,
        seat,
        payload?.ownerSeat ?? 0,
        payload?.pairIndex ?? 0
      )
    )
  );
  socket.on('meld:finish', (payload) =>
    runTurnAction((g, seat) =>
      finishHand(g, seat, {
        melds: payload?.melds,
        pairs: payload?.pairs,
        discardCardId: payload?.discardCardId,
        auto: payload?.auto,
      })
    )
  );

  socket.on('game:continue', () => {
    const { code, seat } = socket.data;
    if (code == null || seat == null) return;
    const room = rooms.get(code);
    if (!room || room.game?.phase !== 'ended') return;
    room.setReady(seat as Seat, true);
    broadcastRoom(code);
    if (room.maybeContinueHand()) {
      broadcastRoom(code);
      broadcastGame(code);
      scheduleBots(code);
    } else if (room.status === 'finished') {
      broadcastRoom(code);
    } else {
      broadcastGame(code);
    }
  });

  socket.on('room:playAgain', () => {
    const { code } = socket.data;
    if (code == null) return;
    const room = rooms.get(code);
    if (!room) return;
    if (room.playAgain()) {
      broadcastRoom(code);
    }
  });

  // Atik istegine yanit: responder turnSeat degil, ayri ele alinir.
  socket.on('discard:respond', (payload) => {
    const give = payload?.give ?? true;
    const { code } = socket.data;
    if (code == null) return;
    const room = rooms.get(code);
    if (!room || !room.game) return;
    const seat = room.seatOfSocket(socket.id);
    if (seat == null) return;
    try {
      const wasEnded = room.game.phase === 'ended';
      respondDiscard(room.game, seat, give);
      broadcastGame(code);
      if (room.game.phase === 'ended' && !wasEnded) {
        onHandJustEnded(code);
      } else if (room.game.phase !== 'ended') {
        scheduleBots(code);
      }
    } catch (e) {
      if (e instanceof ActionError) socket.emit('error', { message: e.message });
      return;
    }
  });

  socket.on('room:leave', () => handleLeave(socket));
  socket.on('disconnect', () => {
    console.log(`[io] disconnected ${socket.id}`);
    handleDisconnect(socket);
  });
});

type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

function handleDisconnect(socket: AppSocket) {
  const { code } = socket.data;
  if (code == null) return;
  const room = rooms.get(code);
  if (!room) return;
  room.disconnectPlayer(socket.id);
  socket.data.code = undefined;
  socket.data.seat = undefined;
  if (room.isEmpty()) {
    rooms.delete(code);
  } else {
    broadcastRoom(code);
    if (room.game) {
      broadcastGame(code);
      scheduleBots(code);
    }
  }
}

function handleLeave(socket: AppSocket) {
  const { code } = socket.data;
  if (code == null) return;
  const room = rooms.get(code);
  if (!room) return;
  room.removeBySocket(socket.id);
  socket.data.code = undefined;
  socket.data.seat = undefined;
  if (room.isEmpty()) {
    rooms.delete(code);
  } else {
    broadcastRoom(code);
  }
}

server.listen(PORT, () => {
  console.log(`[kart71] server listening on http://localhost:${PORT}`);
  console.log(`[kart71] cors origin ${String(corsOrigin)}`);
  if (fs.existsSync(clientDist)) {
    console.log(`[kart71] serving client from ${clientDist}`);
  }
});

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { socket } from './socket';
import type { GameView, RoomView, Seat } from './types';
import { Table } from './components/Table';
import { GameTable } from './components/GameTable';
import { GameOver } from './components/GameOver';
import { Logo } from './components/Logo';
import { AdSlot } from './components/AdSlot';
import { SiteHeader } from './components/SiteHeader';
import { SiteFooter } from './components/SiteFooter';
import { HomeContent } from './pages/HomeContent';
import { RulesPage } from './pages/RulesPage';
import { AboutPage } from './pages/AboutPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { ContactPage } from './pages/ContactPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { clearSession, loadSession, saveSession } from './lib/session';
import {
  ensureAdSenseScript,
  isAdSenseEnabled,
  pauseAdRequests,
  stripInjectedAds,
} from './lib/adsense';
import { applyPageMeta } from './lib/pageMeta';
import { ROUTES, isContentPath, usePath } from './lib/routing';

const CONTENT_AD_SLOT = import.meta.env.VITE_ADSENSE_SLOT_LOBBY?.trim();

const MAX_JOIN_RETRIES = 6;

export default function App() {
  const path = usePath();
  const [connected, setConnected] = useState(socket.connected);
  const [reconnecting, setReconnecting] = useState(false);
  const [name, setName] = useState(() => loadSession()?.name ?? '');
  const [code, setCode] = useState(() => loadSession()?.code ?? '');
  const [room, setRoom] = useState<RoomView | null>(null);
  const [game, setGame] = useState<GameView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hadRoomRef = useRef(false);
  const joinInFlightRef = useRef(false);
  const joinRef = useRef<(n: string, c?: string, attempt?: number) => void>(() => {});

  const join = useCallback((joinName: string, joinCode?: string, attempt = 0) => {
    if (joinInFlightRef.current) return;
    joinInFlightRef.current = true;
    setError(null);
    const trimmedName = joinName.trim() || 'Oyuncu';
    const trimmedCode = joinCode?.trim().toUpperCase();
    socket.emit(
      'room:join',
      { name: trimmedName, code: trimmedCode || undefined },
      (res) => {
        joinInFlightRef.current = false;
        if (!res.ok) {
          const session = loadSession();
          const retryable =
            session &&
            attempt < MAX_JOIN_RETRIES &&
            (res.error.includes('tekrar deneyin') ||
              res.error.includes('bağlı koltuk bulunamadı') ||
              res.error.includes('Oda dolu'));
          if (retryable) {
            setReconnecting(true);
            window.setTimeout(
              () => joinRef.current(session.name, session.code, attempt + 1),
              400 * (attempt + 1)
            );
            return;
          }
          setError(res.error);
          setReconnecting(false);
          return;
        }
        saveSession({ name: trimmedName, code: res.code });
        setCode(res.code);
        setName(trimmedName);
        setReconnecting(false);
      }
    );
  }, []);

  joinRef.current = join;

  useEffect(() => {
    let mounted = true;
    const onConnect = () => {
      if (!mounted) return;
      setConnected(true);
      const session = loadSession();
      if (session) {
        setReconnecting(true);
        joinRef.current(session.name, session.code);
      }
    };
    const onDisconnect = () => {
      if (!mounted) return;
      setConnected(false);
      if (hadRoomRef.current) setReconnecting(true);
    };
    const onRoomUpdate = (view: RoomView) => {
      hadRoomRef.current = true;
      setRoom(view);
      if (view.status !== 'in_game') setGame(null);
    };
    const onGameUpdate = (view: GameView) => setGame(view);
    const onError = (p: { message: string }) => setError(p.message);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:update', onRoomUpdate);
    socket.on('game:update', onGameUpdate);
    socket.on('error', onError);

    if (socket.connected) {
      const session = loadSession();
      if (session) {
        setReconnecting(true);
        joinRef.current(session.name, session.code);
      }
    }

    return () => {
      mounted = false;
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:update', onRoomUpdate);
      socket.off('game:update', onGameUpdate);
      socket.off('error', onError);
    };
  }, []);

  const inRoom = Boolean(room);

  useEffect(() => {
    applyPageMeta(inRoom ? ROUTES.home : path);
  }, [path, inRoom]);

  useEffect(() => {
    if (!isAdSenseEnabled()) return;
    if (inRoom || !isContentPath(path)) {
      stripInjectedAds();
      pauseAdRequests();
      return;
    }
    ensureAdSenseScript();
  }, [inRoom, path]);

  const mySeat: Seat | null = room?.yourSeat ?? null;
  const me = room && mySeat != null ? room.players[mySeat] : null;

  const leaveRoom = () => {
    clearSession();
    hadRoomRef.current = false;
    socket.emit('room:leave');
    setRoom(null);
    setGame(null);
    setReconnecting(false);
  };

  const joinForm = (
    <div className="lobby-card">
      <h2>Odaya katıl</h2>
      <p className="lobby-card-lead">
        Adını yaz. Oda kodunu boş bırakırsan yeni oda açılır; kodu arkadaşlarınla paylaş.
      </p>
      <input placeholder="Adın" value={name} onChange={(e) => setName(e.target.value)} />
      <input
        placeholder="Oda kodu (boş = yeni oda)"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
      />
      <button onClick={() => join(name, code)} disabled={!connected}>
        Katıl
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );

  if (room) {
    return (
      <div className="app">
        <header className="topbar">
          <div className="topbar-brand">
            <Logo size={40} />
          </div>
          <span className={`conn ${connected ? 'on' : 'off'}`}>
            {reconnecting ? 'Yeniden bağlanılıyor…' : connected ? 'Bağlandı' : 'Bağlantı yok'}
          </span>
        </header>

        {room && game && room.status === 'in_game' && <GameTable game={game} />}

        {room.status === 'finished' && room.finalResult && (
          <GameOver result={room.finalResult} />
        )}

        {room.status !== 'in_game' && room.status !== 'finished' && (
          <div className="room">
            <div className="room-head">
              <span>
                Oda kodu: <strong>{room.code}</strong>{' '}
                <button
                  className="link"
                  onClick={() => navigator.clipboard?.writeText(room.code)}
                  title="Kodu kopyala (davet)"
                >
                  kopyala
                </button>
              </span>
              <span>Durum: {room.status === 'lobby' ? 'Lobi' : 'Bitti'}</span>
              <button className="link" onClick={leaveRoom}>
                Odadan ayrıl
              </button>
            </div>

            <p className="hint">
              Arkadaşlarını <strong>oda kodu</strong> ile davet et. Takımlar karşılıklı oturur
              (Takım 1: alt-üst, Takım 2: sol-sağ). Boş koltuğa tıklayarak yer/takım seçebilir ya
              da rastgele dağıtabilirsin.
            </p>

            <Table
              room={room}
              mySeat={mySeat}
              onPickSeat={(seat) => socket.emit('room:pickSeat', { seat })}
            />

            <div className="controls">
              <button onClick={() => socket.emit('room:fillBots')}>
                Boş slotları bot ile doldur
              </button>
              <button onClick={() => socket.emit('room:shuffleTeams')}>
                Rastgele takımlar
              </button>
              <button
                onClick={() => socket.emit('room:ready', { ready: !me?.ready })}
                className={me?.ready ? 'ready' : ''}
                disabled={mySeat == null}
              >
                {me?.ready ? 'Hazır (iptal)' : 'Hazırım'}
              </button>
            </div>
            {error && <p className="error">{error}</p>}
          </div>
        )}
      </div>
    );
  }

  let page: ReactNode;
  if (reconnecting) {
    page = <div className="reconnect-banner">Odaya yeniden bağlanılıyor…</div>;
  } else if (path === ROUTES.home) {
    page = (
      <>
        <HomeContent joinForm={joinForm} />
        <AdSlot slot={CONTENT_AD_SLOT} format="horizontal" className="ad-content" />
      </>
    );
  } else if (path === ROUTES.rules) {
    page = <RulesPage />;
  } else if (path === ROUTES.about) {
    page = <AboutPage />;
  } else if (path === ROUTES.privacy) {
    page = <PrivacyPage />;
  } else if (path === ROUTES.contact) {
    page = <ContactPage />;
  } else {
    page = <NotFoundPage />;
  }

  return (
    <div className="app app-site">
      <SiteHeader path={path} connected={connected} reconnecting={reconnecting} />
      {page}
      <SiteFooter />
    </div>
  );
}

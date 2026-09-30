"use client";

interface Player {
  id: string;
  username: string;
  score: number;
  isDrawing?: boolean;
}

interface PlayerListProps {
  players: Player[];
  currentPlayerId?: string;
  onVoteKick?: (targetPlayerId: string) => void;
}

const AVATAR_COLORS = ['#3e7cff', '#ff4d4d', '#22c55e', '#ffb800', '#9b5de5', '#ff8fa3', '#2fbfbf', '#f97316'];

function avatarColor(name: string): string {
  const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const PlayerList: React.FC<PlayerListProps> = ({ players, currentPlayerId, onVoteKick }) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="card h-full">
      <div className="p-3 border-b-2 font-bold text-sm text-primary" style={{ borderColor: 'var(--card-border)' }}>
        Scoreboard
      </div>

      <div className="divide-y-2 max-h-64 overflow-y-auto" style={{ borderColor: 'var(--card-border)' }}>
        {sortedPlayers.map((player, index) => {
          const rank = index + 1;
          const isMe = player.id === currentPlayerId;
          return (
            <div
              key={player.id}
              className="flex items-center gap-2.5 p-2.5 text-sm"
              style={isMe ? { background: 'var(--paper-dim)' } : undefined}
            >
              <span className={`rank-badge ${rank <= 3 ? `rank-${rank}` : ''}`}>{rank}</span>

              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 border-2"
                style={{ background: avatarColor(player.username), borderColor: 'var(--ink)' }}
              >
                {player.username.charAt(0).toUpperCase()}
              </span>

              <span className="flex-1 min-w-0 flex items-baseline gap-1">
                <span className="truncate font-semibold text-primary">{player.username}</span>
                {isMe && <span className="text-muted font-normal text-xs flex-shrink-0">(you)</span>}
              </span>

              {player.isDrawing && (
                <span title="Drawing" aria-label="Drawing" className="flex-shrink-0">✏️</span>
              )}

              <span className="font-bold tabular-nums flex-shrink-0" style={{ fontFamily: 'var(--font-display)' }}>
                {player.score}
              </span>

              {onVoteKick && !isMe && (
                <button
                  type="button"
                  onClick={() => onVoteKick(player.id)}
                  title={`Vote to kick ${player.username}`}
                  aria-label={`Vote to kick ${player.username}`}
                  className="text-muted hover:text-red-500 flex-shrink-0 text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerList;

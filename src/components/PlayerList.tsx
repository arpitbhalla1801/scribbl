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
}

const PlayerList: React.FC<PlayerListProps> = ({ players, currentPlayerId }) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  
  return (
    <div className="card">
      <div className="p-3 border-b border-card-border font-medium">
        Players
      </div>
      <div className="divide-y divide-card-border">
        {sortedPlayers.map((player) => (
          <div 
            key={player.id}
            className={`flex items-center justify-between p-3 ${
              player.id === currentPlayerId ? "bg-primary/5 dark:bg-primary/10" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="font-medium">
                {player.username}
                {player.username === players.find(p => p.id === currentPlayerId)?.username && (
                  <span className="ml-2 text-xs bg-primary/10 text-primary dark:text-primary-light px-2 py-0.5 rounded">
                    You
                  </span>
                )}
                {player.isDrawing && (
                  <span className="ml-2 text-xs bg-accent/10 text-accent dark:text-accent-dark px-2 py-0.5 rounded">
                    Drawing
                  </span>
                )}
              </div>
            </div>
            <div className="font-bold">{player.score}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerList;
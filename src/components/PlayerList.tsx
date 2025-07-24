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
    <div className="card h-full">
      <div className="p-3 border-b border-card-border text-sm text-gray-600 dark:text-gray-400">
        Players ({players.length})
      </div>
      
      <div className="divide-y divide-card-border max-h-64 overflow-y-auto">
        {sortedPlayers.map((player, index) => (
          <div 
            key={player.id}
            className={`flex items-center justify-between p-3 text-sm ${
              player.id === currentPlayerId ? "bg-gray-50 dark:bg-gray-800" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-5 text-center text-xs text-gray-500 dark:text-gray-500">
                {index + 1}
              </span>
              <span className={`${player.isDrawing ? 'font-medium' : ''}`}>
                {player.username}
                {player.id === currentPlayerId && ' (you)'}
              </span>
              {player.isDrawing && (
                <span className="text-xs text-blue-600 dark:text-blue-400">drawing</span>
              )}
            </div>
            <span className="font-mono text-xs">{player.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerList;
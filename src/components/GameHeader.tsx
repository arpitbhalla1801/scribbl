"use client";

import Link from "next/link";
import Timer from "./Timer";

interface GameHeaderProps {
  roomId: string;
  roundNumber: number;
  totalRounds: number;
  timeRemaining: number;
  totalTime: number;
  onTimeEnd?: () => void;
  currentTurn?: number;
  totalTurns?: number;
}

const GameHeader: React.FC<GameHeaderProps> = ({
  roomId,
  roundNumber,
  totalRounds,
  timeRemaining,
  totalTime,
  onTimeEnd,
  currentTurn,
  totalTurns
}) => {
  return (
    <div className="card">
      <div className="p-3 flex flex-col lg:flex-row justify-between items-center gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 text-sm">
          <Link
            href="/"
            className="px-3 py-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 border border-gray-300 dark:border-gray-600 rounded hover:border-red-300 dark:hover:border-red-500 transition-colors"
          >
            ← Exit
          </Link>
          
          <div className="flex items-center gap-3">
            <span className="text-gray-600 dark:text-gray-400">
              Room: <span className="font-medium text-gray-900 dark:text-gray-100">{roomId}</span>
            </span>
            
            <span className="text-gray-600 dark:text-gray-400">
              Round: <span className="font-medium text-gray-900 dark:text-gray-100">{roundNumber}/{totalRounds}</span>
            </span>
            
            {currentTurn && totalTurns && (
              <span className="text-gray-600 dark:text-gray-400">
                Turn: <span className="font-medium text-gray-900 dark:text-gray-100">{currentTurn}/{totalTurns}</span>
              </span>
            )}
          </div>
        </div>
        
        <div className="w-full sm:w-48">
          <Timer 
            timeRemaining={timeRemaining}
            totalTime={totalTime}
            onTimeEnd={onTimeEnd}
          />
        </div>
      </div>
    </div>
  );
};

export default GameHeader;
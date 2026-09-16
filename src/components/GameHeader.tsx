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
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link
            href="/"
            className="px-3 py-1.5 rounded-full font-semibold border-2 transition-colors"
            style={{ borderColor: 'var(--marker-red)', color: 'var(--marker-red)' }}
          >
            ← Exit
          </Link>

          <span
            className="px-3 py-1.5 rounded-full font-bold tracking-wide border-2"
            style={{ borderColor: 'var(--ink)', background: 'var(--paper-dim)', fontFamily: 'var(--font-display)' }}
          >
            {roomId}
          </span>

          <span className="text-secondary">
            Round <span className="font-bold text-primary">{roundNumber}/{totalRounds}</span>
          </span>

          {currentTurn && totalTurns && (
            <span className="text-secondary">
              Turn <span className="font-bold text-primary">{currentTurn}/{totalTurns}</span>
            </span>
          )}
        </div>

        <div className="w-full sm:w-56">
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

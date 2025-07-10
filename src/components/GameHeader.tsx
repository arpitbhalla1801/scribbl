"use client";

import Link from "next/link";
import Timer from "./Timer";

interface GameHeaderProps {
  roomId: string;
  roundNumber: number;
  totalRounds: number;
  timeRemaining: number;
  onTimeEnd?: () => void;
}

const GameHeader: React.FC<GameHeaderProps> = ({
  roomId,
  roundNumber,
  totalRounds,
  timeRemaining,
  onTimeEnd
}) => {
  return (
    <div className="card p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Link
          href="/"
          className="text-primary hover:text-primary-dark font-medium flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Exit Game
        </Link>
        <div className="font-medium">
          Room: <span className="font-bold">{roomId}</span>
        </div>
        <div className="font-medium">
          Round: <span className="font-bold">{roundNumber}</span> of {totalRounds}
        </div>
      </div>
      <div className="w-full sm:w-1/3">
      </div>
    </div>
  );
};

export default GameHeader;
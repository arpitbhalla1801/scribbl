"use client";

import { useEffect, useRef } from "react";


interface TimerProps {
  timeRemaining: number; // current time left from server
  totalTime: number; // full time for the turn
  onTimeEnd?: () => void;
}


const Timer: React.FC<TimerProps> = ({ timeRemaining, totalTime, onTimeEnd }) => {
  // Track if time end callback was called for this turn
  const timeEndCalled = useRef(false);
  const prevTimeRef = useRef(timeRemaining);

  // Reset timeEndCalled flag when a new turn starts (time increases)
  useEffect(() => {
    if (timeRemaining > prevTimeRef.current) {
      timeEndCalled.current = false;
    }
    prevTimeRef.current = timeRemaining;
  }, [timeRemaining]);

  // Call onTimeEnd when server reports time is up
  useEffect(() => {
    if (timeRemaining <= 0 && onTimeEnd && !timeEndCalled.current) {
      timeEndCalled.current = true;
      onTimeEnd();
    }
  }, [timeRemaining, onTimeEnd]);

  // Use server time directly - no local countdown
  const seconds = Math.max(0, timeRemaining);
  const percentage = (seconds / totalTime) * 100;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const urgent = percentage <= 20;

  const color =
    percentage > 50 ? 'var(--marker-green)' : percentage > 20 ? 'var(--marker-yellow)' : 'var(--marker-red)';

  return (
    <div className="w-full flex items-center gap-3">
      <div
        className={`flex-shrink-0 rounded-full border-2 px-3 py-1 text-lg font-bold tabular-nums ${urgent ? 'animate-bounce-in' : ''}`}
        style={{ borderColor: color, color, background: 'var(--card-bg)', fontFamily: 'var(--font-display)' }}
      >
        {minutes}:{remainingSeconds.toString().padStart(2, '0')}
      </div>
      <div className="flex-1 h-3 rounded-full overflow-hidden border-2" style={{ borderColor: 'var(--ink)', background: 'var(--paper-dim)' }}>
        <div
          className="h-full transition-all duration-1000 ease-linear"
          style={{ width: `${Math.max(0, percentage)}%`, background: color }}
        />
      </div>
    </div>
  );
};

export default Timer;

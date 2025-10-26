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
  const seconds = timeRemaining;
  const percentage = (seconds / totalTime) * 100;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  const getColor = () => {
    if (percentage > 50) return 'bg-green-500';
    if (percentage > 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTextColor = () => {
    if (percentage > 50) return 'text-green-600 dark:text-green-400';
    if (percentage > 20) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };
  
  return (
    <div className="w-full">
      <div className="flex justify-between items-center text-sm mb-2">
        <span className="text-gray-600 dark:text-gray-400">Time</span>
        <span className={`font-mono font-medium ${getTextColor()}`}>
          {minutes}:{remainingSeconds.toString().padStart(2, '0')}
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor()} transition-all duration-1000 ease-linear`}
          style={{ width: `${Math.max(0, percentage)}%` }}
        />
      </div>
    </div>
  );
};

export default Timer;
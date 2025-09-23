"use client";

import { useEffect, useState, useRef } from "react";


interface TimerProps {
  timeRemaining: number; // current time left from server
  totalTime: number; // full time for the turn
  onTimeEnd?: () => void;
}


const Timer: React.FC<TimerProps> = ({ timeRemaining, totalTime, onTimeEnd }) => {
  // Local timer state that syncs with server
  const [seconds, setSeconds] = useState(timeRemaining);
  const prevTimeRef = useRef(timeRemaining);
  const timeEndCalled = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with server timeRemaining - always prioritize server time
  useEffect(() => {
    // New turn detected (time increased)
    if (timeRemaining > prevTimeRef.current) {
      setSeconds(timeRemaining);
      timeEndCalled.current = false;
    } 
    // Server time sync - accept server value if it's different by more than 1 second
    // This handles network latency and drift
    else if (Math.abs(timeRemaining - seconds) > 1) {
      setSeconds(timeRemaining);
    }
    
    prevTimeRef.current = timeRemaining;
  }, [timeRemaining, seconds]);

  // Local countdown with better sync
  useEffect(() => {
    // Clear any existing timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (seconds <= 0) {
      if (onTimeEnd && !timeEndCalled.current) {
        timeEndCalled.current = true;
        onTimeEnd();
      }
      return;
    }

    // Start countdown
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        const newValue = prev - 1;
        return Math.max(0, newValue);
      });
    }, 1000);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [seconds, onTimeEnd]);

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
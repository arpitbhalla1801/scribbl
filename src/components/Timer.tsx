"use client";

import { useEffect, useState, useRef } from "react";

interface TimerProps {
  timeRemaining: number;
  onTimeEnd?: () => void;
}

const Timer: React.FC<TimerProps> = ({ timeRemaining, onTimeEnd }) => {
  const [seconds, setSeconds] = useState(timeRemaining);
  const timeEndCalled = useRef(false);
  
  useEffect(() => {
    setSeconds(timeRemaining);
    timeEndCalled.current = false;
  }, [timeRemaining]);
  
  useEffect(() => {
    if (seconds <= 0) {
      if (onTimeEnd && !timeEndCalled.current) {
        timeEndCalled.current = true;
        onTimeEnd();
      }
      return;
    }
    
    const timer = setInterval(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [seconds, onTimeEnd]);
  
  const percentage = (seconds / timeRemaining) * 100;
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
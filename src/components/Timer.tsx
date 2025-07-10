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
  const getColor = () => {
    if (percentage > 66) return 'bg-green-500 dark:bg-green-600';
    if (percentage > 33) return 'bg-yellow-500 dark:bg-yellow-600';
    return 'bg-red-500 dark:bg-red-600';
  };
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-1">
        <div>Time Remaining</div>
        <div className="tabular-nums">{Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}</div>
      </div>
      <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor()} transition-all duration-1000 ease-linear`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default Timer;
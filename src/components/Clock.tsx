import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface ClockProps {
  className?: string;
}

const ClockComponent: React.FC<ClockProps> = ({ className }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={className}>
      {format(currentTime, 'hh:mm:ss a')}
    </div>
  );
};

export default React.memo(ClockComponent);

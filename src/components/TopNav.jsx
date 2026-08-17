import React, { useState, useEffect } from 'react';

const TopNav = () => {
  const [time, setTime] = useState('');
  const [onlineCount] = useState(Math.floor(Math.random() * (50 - 20 + 1) + 20));

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      // Format to evening time if testing, or real time otherwise
      let hours = now.getHours();
      let minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'pm' : 'am';
      
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      minutes = minutes < 10 ? '0' + minutes : minutes;
      
      setTime(`${hours}:${minutes} ${ampm}`);
    };

    updateClock();
    const intervalId = setInterval(updateClock, 60000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <nav className="top-nav">
      <div className="clock-widget">
        {time}
      </div>
      
      <div className="online-status glass-panel">
        <div className="status-dot"></div>
        <span className="hindi-text">{onlineCount} ऑनलाइन</span>
      </div>
      
      <div className="nav-links hindi-text">
        <a href="#" className="nav-link">खोजें</a>
        <a href="#" className="nav-link">संगीत क्लब</a>
        <a href="#" className="nav-link">संपर्क</a>
      </div>
    </nav>
  );
};

export default TopNav;

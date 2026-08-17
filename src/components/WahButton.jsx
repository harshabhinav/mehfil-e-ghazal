import React, { useState } from 'react';

const WahButton = () => {
  const [claps, setClaps] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClap = () => {
    setClaps(prev => (typeof prev === 'number' ? prev + 1 : 1));
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <button className={`wah-button ${isAnimating ? 'active' : ''}`} onClick={handleClap}>
      <div className="wah-icon">👏</div>
      <div className="wah-text">
        <span className="wah-hindi hindi-text">वाह!</span>
        <span className="wah-count">{claps !== null ? `${claps.toLocaleString()} claps` : '--'}</span>
      </div>
    </button>
  );
};

export default WahButton;

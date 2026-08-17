import React, { useState } from 'react';

const MusicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(40); // Initial mock progress

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percentage = (x / width) * 100;
    setProgress(percentage);
  };

  return (
    <div className="music-player glass-panel">
      {/* We use a placeholder image for Jagjit Singh */}
      <img 
        src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Jagjit_Singh_at_a_concert.jpg/220px-Jagjit_Singh_at_a_concert.jpg" 
        alt="Jagjit Singh" 
        className="player-artwork"
      />
      
      <div className="player-info">
        <h3 className="player-artist hindi-text">जगजीत सिंह</h3>
        <p className="player-track hindi-text">होशवालों को खबर क्या</p>
        <a href="#" className="player-curator">Mehfil Curations</a>
      </div>
      
      <div className="player-controls-container">
        <div className="player-buttons">
          <button className="control-btn">
            {/* Previous Icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>
          </button>
          
          <button className="control-btn play-btn" onClick={togglePlay}>
            {isPlaying ? (
              /* Pause Icon */
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            ) : (
              /* Play Icon */
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            )}
          </button>
          
          <button className="control-btn">
            {/* Next Icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
          </button>
        </div>
        
        <div className="progress-bar-container">
          <span>2:15</span>
          <div className="progress-bar" onClick={handleProgressClick}>
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <span>5:10</span>
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;

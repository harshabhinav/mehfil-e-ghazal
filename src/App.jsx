import React from 'react';
import './App.css';
import TopNav from './components/TopNav';
import TrackScroll from './components/TrackScroll';
import MusicPlayer from './components/MusicPlayer';
import WahButton from './components/WahButton';
import SourceLinks from './components/SourceLinks';

function App() {
  return (
    <div className="app-container">
      <div className="overlay lamp-flicker"></div>
      
      <div className="content-layer">
        <TopNav />

        <div className="central-title-container">
          <h1 className="main-title hindi-text">मेहफिल-ए-ग़ज़ल</h1>
        </div>

        <div className="bottom-interface">
          <TrackScroll />
          
          <MusicPlayer />
          
          <div className="right-section">
            <WahButton />
            <SourceLinks />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

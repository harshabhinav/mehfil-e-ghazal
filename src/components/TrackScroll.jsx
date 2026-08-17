import React from 'react';

const TrackScroll = () => {
  const tracks = [
    'कल चौदहवीं की रात थी',
    'होशवालों को खबर क्या',
    'चुपके चुपके रात दिन',
    'ये दौलत भी ले लो',
    'हज़ारों ख्वाहिशें ऐसी',
    'रफ्ता रफ्ता वो मेरी'
  ];

  return (
    <div className="track-scroll floating-dust">
      <h3 className="hindi-text">समुदाय के सुझाव</h3>
      <ul className="track-list hindi-text">
        {tracks.map((track, index) => (
          <li key={index} className="track-list-item">
            {track}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TrackScroll;

import React from 'react';
import MobileBlocker from './components/MobileBlocker';
import PeerNetworkManager from './components/PeerNetworkManager';

const App = () => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return (
    <>
      {isMobile ? <MobileBlocker /> : <PeerNetworkManager />}
    </>
  );
};

export default App;

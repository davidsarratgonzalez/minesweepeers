import React from 'react';
import './App.css';
import PeerNetworkManager from './components/PeerNetworkManager';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Peer Minesweeper</h1>
        <PeerNetworkManager />
      </header>
    </div>
  );
}

export default App;

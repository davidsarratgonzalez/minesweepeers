import React, { useState, useEffect, useRef } from 'react';
import usePeerNetwork from '../hooks/usePeerNetwork';
import ChatRoom from './ChatRoom';
import './PeerNetworkManager.css';
import UserSetup from './UserSetup';
import GameConfig from './GameConfig';
import Minesweeper from './Minesweeper';
import { createEmptyBoard } from '../utils/minesweeperLogic';

/**
 * Component for managing peer network connections and chat
 */
const PeerNetworkManager = () => {
    const [targetPeerId, setTargetPeerId] = useState('');
    const { 
        peerId, 
        isReady, 
        userInfo,
        connectedPeers,
        connectedUsers,
        connectToPeer,
        messages,
        sendMessage,
        disconnectFromNetwork,
        initializeWithUser,
        gameConfig,
        updateGameConfig,
        gameState,
        startGame,
        updateGameState,
        endGame,
        network,
        peerCursors,
        broadcastCursorPosition,
        addSystemMessage,
    } = usePeerNetwork();
    const [copyFeedback, setCopyFeedback] = useState(false);
    const [connectionError, setConnectionError] = useState('');
    const lastCursorPosition = useRef(null);

    useEffect(() => {
        // Remove this effect since we want to allow solo play
        // if (gameState && connectedPeers.length === 0) {
        //     endGame('All players disconnected');
        // }
    }, [connectedPeers.length, gameState, endGame]);

    useEffect(() => {
        if (!gameState) return; // Only track cursors during game

        const cursorInterval = setInterval(() => {
            if (lastCursorPosition.current) {
                broadcastCursorPosition(lastCursorPosition.current);
            }
        }, 2000); // Resend every 2 seconds

        return () => {
            clearInterval(cursorInterval);
            lastCursorPosition.current = null;
        };
    }, [gameState, broadcastCursorPosition]);

    if (!userInfo) {
        return <UserSetup onComplete={initializeWithUser} />;
    }

    const handleConnect = async (e) => {
        e.preventDefault();
        if (targetPeerId.trim()) {
            try {
                await connectToPeer(targetPeerId.trim());
                setTargetPeerId('');
                setConnectionError('');
            } catch (error) {
                setConnectionError('Failed to connect to peer');
                setTimeout(() => setConnectionError(''), 3000);
            }
        }
    };

    const handleDisconnect = () => {
        // Clear game state immediately without any timers
        endGame(null, false);
        updateGameConfig(null);
        disconnectFromNetwork();
    };

    const handleCopyPeerId = () => {
        navigator.clipboard.writeText(peerId);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
    };

    const getUserName = (peerId) => {
        const user = connectedUsers.get(peerId);
        return user ? user.name : `Unknown (${peerId})`;
    };

    const handleStartGame = (config) => {
        // Clear any existing game state immediately before starting new game
        endGame(null, false);
        const initialBoard = createEmptyBoard(config.width, config.height);
        startGame(config, initialBoard);
    };

    const handleConfigChange = (newConfig) => {
        updateGameConfig(newConfig);
    };

    const handleGameUpdate = (newBoard) => {
        if (!gameState) return;
        
        updateGameState({
            ...gameState,
            board: newBoard,
            lastUpdate: Date.now()
        });
    };

    const handleGameOver = () => {
        // Clear all game state immediately
        endGame();
        updateGameConfig(null);  // Clear game config too
    };

    const handleCursorMove = (position) => {
        if (!position) return;
        
        // Store the last position to resend
        lastCursorPosition.current = position;
        broadcastCursorPosition(position);
    };

    const handleLeaveGame = () => {
        // Use the same logic as disconnect but without network disconnect
        endGame(null, false);
        updateGameConfig(null);
    };

    const isChatEnabled = connectedPeers.length > 0;

    const getCurrentTimerState = () => {
        if (gameState?.board) {
            return {
                enabled: gameState.config.timer.enabled,
                minutes: Math.floor(gameState.currentSeconds / 60),
                seconds: gameState.currentSeconds % 60
            };
        }
        return null;
    };

    return (
        <div className="peer-network-manager">
            <div className="network-info">
                <div className="peer-id-container">
                    <div className="peer-id-wrapper">
                        <div className="peer-id">{peerId || 'Initializing...'}</div>
                    </div>
                    <button 
                        className={`copy-button ${copyFeedback ? 'copied' : ''}`}
                        onClick={handleCopyPeerId}
                        title="Copy Peer ID"
                    >
                        <i className={`fa-regular ${copyFeedback ? 'fa-circle-check' : 'fa-copy'}`}></i>
                    </button>
                </div>

                <div className="connection-controls">
                    {gameState && connectedPeers.length === 0 ? (
                        <button 
                            className="disconnect-button"
                            onClick={handleLeaveGame}
                        >
                            Leave game
                        </button>
                    ) : connectedPeers.length > 0 ? (
                        <button 
                            className="disconnect-button"
                            onClick={handleDisconnect}
                        >
                            Disconnect
                        </button>
                    ) : (
                        <form className="connect-form" onSubmit={handleConnect}>
                            <input
                                type="text"
                                value={targetPeerId}
                                onChange={(e) => setTargetPeerId(e.target.value)}
                                placeholder="Enter Peer ID"
                            />
                            <button type="submit">Connect</button>
                        </form>
                    )}
                    {connectionError && (
                        <div className="connection-error">{connectionError}</div>
                    )}
                </div>

                <div className="peers-list">
                    <h3>Players ({connectedPeers.length + 1})</h3>
                    <ul>
                        <li 
                            className="current-user"
                            style={{ color: userInfo.color.value }}
                        >
                            {userInfo.name} (You)
                        </li>
                        {connectedPeers.map((peer) => (
                            <li 
                                key={peer}
                                style={{ color: connectedUsers.get(peer)?.color.value }}
                            >
                                {getUserName(peer)}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="game-container">
                {gameState ? (
                    <Minesweeper 
                        config={gameState.config}
                        board={gameState.board}
                        onGameUpdate={handleGameUpdate}
                        onGameOver={handleGameOver}
                        onCursorMove={handleCursorMove}
                        peerCursors={peerCursors}
                        connectedUsers={connectedUsers}
                        getCurrentTimerState={getCurrentTimerState}
                    />
                ) : (
                    <GameConfig 
                        onStartGame={handleStartGame}
                        onConfigChange={handleConfigChange}
                        initialConfig={gameConfig}
                    />
                )}
            </div>

            <div className="chat-container">
                <ChatRoom 
                    messages={messages} 
                    sendMessage={sendMessage}
                    connectedUsers={connectedUsers}
                    currentUser={userInfo}
                    addSystemMessage={addSystemMessage}
                    isEnabled={isChatEnabled}
                />
            </div>
        </div>
    );
};

export default PeerNetworkManager; 
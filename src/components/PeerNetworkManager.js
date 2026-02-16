import React, { useState, useEffect, useRef } from 'react';
import usePeerNetwork from '../hooks/usePeerNetwork';
import ChatRoom from './ChatRoom';
import './PeerNetworkManager.css';
import UserSetup from './UserSetup';
import GameConfig from './GameConfig';
import Minesweeper from './Minesweeper';
import { createEmptyBoard } from '../utils/minesweeperLogic';
import { useWakeLock } from '../hooks/useWakeLock';

/**
 * PeerNetworkManager Component
 * 
 * Manages the peer-to-peer networking functionality for multiplayer Minesweeper.
 * Handles user connections, game state synchronization, chat, and cursor tracking.
 * 
 * Key responsibilities:
 * - Peer connection management and user identification
 * - Game state synchronization across connected peers
 * - Real-time chat functionality
 * - Cursor position broadcasting
 * - Game configuration and lifecycle management
 */
const PeerNetworkManager = () => {
    useWakeLock();

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
        endGame,
        peerCursors,
        broadcastCursorPosition,
        addSystemMessage,
        pendingActions,
        broadcastCellAction,
        clearPendingActions,
        syncBoard,
    } = usePeerNetwork();
    const [copyFeedback, setCopyFeedback] = useState(false);
    const [connectionError, setConnectionError] = useState('');
    const lastCursorPosition = useRef(null);

    /**
     * Cursor position broadcasting interval
     * Periodically resends cursor position to maintain consistency across peers
     */
    useEffect(() => {
        if (!gameState) return;

        const cursorInterval = setInterval(() => {
            if (lastCursorPosition.current) {
                broadcastCursorPosition(lastCursorPosition.current);
            }
        }, 2000);

        return () => {
            clearInterval(cursorInterval);
            lastCursorPosition.current = null;
        };
    }, [gameState, broadcastCursorPosition]);

    if (!userInfo) {
        return <UserSetup onComplete={initializeWithUser} />;
    }

    /**
     * Initiates peer connection with provided peer ID
     * Handles connection errors and provides feedback
     */
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

    /**
     * Cleanly disconnects from network and resets game state
     */
    const handleDisconnect = async () => {
        endGame(null, false);
        updateGameConfig(null);
        await disconnectFromNetwork();
    };

    /**
     * Copies peer ID to clipboard with visual feedback
     */
    const handleCopyPeerId = () => {
        navigator.clipboard.writeText(peerId);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
    };

    /**
     * Retrieves user name from connected users map
     * @param {string} peerId - Peer ID to look up
     * @returns {string} User name or fallback with peer ID
     */
    const getUserName = (peerId) => {
        const user = connectedUsers.get(peerId);
        return user ? user.name : `Unknown (${peerId})`;
    };

    /**
     * Initializes new game with provided configuration
     * @param {Object} config - Game configuration parameters
     */
    const handleStartGame = (config) => {
        endGame(null, false);
        const initialBoard = createEmptyBoard(config.width, config.height);
        startGame(config, initialBoard);
    };

    /**
     * Updates game configuration across network
     * @param {Object} newConfig - New game configuration
     */
    const handleConfigChange = (newConfig) => {
        updateGameConfig(newConfig);
    };

    /**
     * Broadcasts a cell action to all connected peers.
     * @param {Object} action - Cell action to broadcast { action, x, y, board? }
     */
    const handleCellAction = (action) => {
        broadcastCellAction(action);
    };

    /**
     * Syncs the current board blueprint to PeerNetwork storage.
     * Does NOT broadcast -- used only so new-peer joins get the latest board.
     * @param {Object} boardBlueprint - The current board blueprint
     */
    const handleSyncBoard = (boardBlueprint) => {
        syncBoard(boardBlueprint);
    };

    /**
     * Handles game end conditions and resets state
     */
    const handleGameOver = () => {
        endGame();
        updateGameConfig(null);
    };

    /**
     * Broadcasts cursor position to connected peers
     * @param {Object} position - Cursor position data
     */
    const handleCursorMove = (position) => {
        if (!position) return;
        
        lastCursorPosition.current = position;
        broadcastCursorPosition(position);
    };

    /**
     * Cleanly exits current game without network disconnection
     */
    const handleLeaveGame = () => {
        endGame(null, false);
        updateGameConfig(null);
    };

    /**
     * Determines if chat functionality should be enabled
     */
    const isChatEnabled = connectedPeers.length > 0;

    /**
     * Retrieves current game timer state
     * @returns {Object|null} Timer state with minutes and seconds, or null if no game
     */
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
                        onCellAction={handleCellAction}
                        onSyncBoard={handleSyncBoard}
                        pendingActions={pendingActions}
                        clearPendingActions={clearPendingActions}
                        onGameOver={handleGameOver}
                        onCursorMove={handleCursorMove}
                        peerCursors={peerCursors}
                        connectedUsers={connectedUsers}
                        addSystemMessage={addSystemMessage}
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
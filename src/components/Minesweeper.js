import React, { useState, useEffect, useCallback, useRef } from 'react';
import Board from './Board';
import GameHeader from './GameHeader';
import { CELL_STATUS, GAME_STATUS } from '../constants/gameTypes';
import { 
    revealCell, 
    toggleFlag, 
    countFlags, 
    checkWinCondition, 
    revealAllMines, 
    createBoardBlueprint, 
    applyBoardBlueprint, 
    createEmptyBoard, 
    placeMines, 
    createTimer, 
    updateTimer 
} from '../utils/minesweeperLogic';
import './Minesweeper.css';
import CursorOverlay from './CursorOverlay';

/**
 * Minesweeper Component - Main game component handling game logic and state
 * 
 * Manages:
 * - Game board state and updates
 * - Game status (playing/won/lost)
 * - Timer functionality
 * - Multiplayer synchronization
 * - Cursor tracking and display
 * - Board interaction (clicks, flags)
 * - Win/lose conditions
 *
 * @component
 * @param {Object} props - Component properties
 * @param {Object} props.config - Game configuration (width, height, bombs, timer settings)
 * @param {Object} props.board - Network-synced board state from other players
 * @param {Function} props.onGameUpdate - Callback to notify other players of game state changes
 * @param {Function} props.onGameOver - Callback triggered when game ends
 * @param {Function} props.onCursorMove - Callback to sync cursor position with other players
 * @param {Object} props.peerCursors - Cursor positions of other players
 * @param {Array} props.connectedUsers - List of connected players
 * @param {Function} props.addSystemMessage - Callback to add system messages
 */
const Minesweeper = ({ config, board: networkBoard, onGameUpdate, onGameOver, onCursorMove, peerCursors, connectedUsers, addSystemMessage }) => {
    // Core game state
    const [localBoard, setLocalBoard] = useState(null);
    const [gameStatus, setGameStatus] = useState(GAME_STATUS.PLAYING);
    const [flagsCount, setFlagsCount] = useState(0);
    const [timer, setTimer] = useState(() => createTimer(config));
    const [isFirstClick, setIsFirstClick] = useState(true);
    const [minesPlaced, setMinesPlaced] = useState(false);
    const [countdown, setCountdown] = useState(null);

    // Scroll and drag functionality state
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });

    // Refs for DOM elements and timers
    const containerRef = useRef(null);
    const timerRef = useRef(null);
    const gameTimerRef = useRef(null);
    const gameContentRef = useRef(null);
    const boardRef = useRef(null);
    const lastSystemMessage = useRef(0);

    /**
     * Initialize empty game board on component mount
     */
    useEffect(() => {
        if (!localBoard) {
            const emptyBoard = createEmptyBoard(config.width, config.height);
            setLocalBoard(emptyBoard);
            setFlagsCount(0);
        }
    }, [config.width, config.height, localBoard]);

    /**
     * Cleanup timers on component unmount
     */
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (gameTimerRef.current) clearInterval(gameTimerRef.current);
        };
    }, []);

    /**
     * Handles game over state, reveals mines, and initiates countdown
     */
    const handleGameOver = useCallback(() => {
        const revealedBoard = revealAllMines(localBoard);
        setLocalBoard(revealedBoard);
        setGameStatus(GAME_STATUS.LOST);
        
        const blueprint = createBoardBlueprint(revealedBoard);
        onGameUpdate({
            board: blueprint,
            config: config
        });
        
        const now = Date.now();
        if (now - lastSystemMessage.current > 1000) {
            addSystemMessage('You lost!');
            lastSystemMessage.current = now;
        }
        
        setCountdown(3);
        if (timerRef.current) clearInterval(timerRef.current);
        
        timerRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                    onGameOver();
                    return null;
                }
                return prev - 1;
            });
        }, 1000);
    }, [localBoard, onGameUpdate, onGameOver, config, addSystemMessage]);

    /**
     * Manages game timer updates while game is in progress
     */
    useEffect(() => {
        if (gameStatus === GAME_STATUS.PLAYING) {
            const interval = setInterval(() => {
                setTimer(prevTimer => updateTimer(prevTimer));
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [gameStatus]);

    /**
     * Handles timer expiration in countdown mode
     */
    useEffect(() => {
        if (timer.isCountdown && timer.currentSeconds === 0 && gameStatus === GAME_STATUS.PLAYING) {
            const revealedBoard = revealAllMines(localBoard);
            setLocalBoard(revealedBoard);
            
            onGameUpdate({
                ...config,
                board: revealedBoard
            });
            
            handleGameOver();
        }
    }, [timer.currentSeconds, timer.isCountdown, gameStatus]);

    /**
     * Handles cell click events, including first click mine placement
     * @param {number} x - X coordinate of clicked cell
     * @param {number} y - Y coordinate of clicked cell
     */
    const handleCellClick = (x, y) => {
        if (gameStatus !== GAME_STATUS.PLAYING) return;

        let newBoard;
        if (isFirstClick) {
            newBoard = placeMines(localBoard, config.bombs, x, y);
            setMinesPlaced(true);
            setIsFirstClick(false);
            newBoard = revealCell(newBoard, x, y);
        } else {
            newBoard = revealCell(localBoard, x, y);
        }

        // Update local board state immediately
        setLocalBoard(newBoard);
        
        // Create blueprint and update peers
        const blueprint = createBoardBlueprint(newBoard);
        onGameUpdate({
            board: blueprint,
            config: config
        });

        // Check win/lose conditions after board is updated
        if (newBoard[y][x].isMine) {
            setTimeout(() => handleGameOver(), 0);
        } else if (checkWinCondition(newBoard)) {
            // Ensure board is fully revealed before triggering win
            const finalBoard = revealCell(newBoard, x, y);
            setLocalBoard(finalBoard);
            const finalBlueprint = createBoardBlueprint(finalBoard);
            onGameUpdate({
                board: finalBlueprint,
                config: config
            });
            setTimeout(() => handleWin(), 0);
        }
    };

    /**
     * Handles right-click flag placement
     * @param {Event} e - Click event
     * @param {number} x - X coordinate of flagged cell
     * @param {number} y - Y coordinate of flagged cell
     */
    const handleCellRightClick = (e, x, y) => {
        e.preventDefault();
        if (gameStatus !== GAME_STATUS.PLAYING) return;

        const newBoard = toggleFlag(localBoard, x, y);
        setLocalBoard(newBoard);
        setFlagsCount(countFlags(newBoard));
        
        const blueprint = createBoardBlueprint(newBoard);
        onGameUpdate({
            board: blueprint,
            config: config
        });
    };

    /**
     * Handles win condition, reveals board, and initiates countdown
     */
    const handleWin = useCallback(() => {
        // First check if we're already in a won/lost state to prevent duplicate handling
        if (gameStatus !== GAME_STATUS.PLAYING) return;

        setGameStatus(GAME_STATUS.WON);
        
        // Reveal all cells
        const revealedBoard = localBoard.map(row => 
            row.map(cell => ({
                ...cell,
                status: CELL_STATUS.REVEALED
            }))
        );
        
        setLocalBoard(revealedBoard);
        
        // Create and send board blueprint to peers
        const blueprint = createBoardBlueprint(revealedBoard);
        onGameUpdate({
            board: blueprint,
            config: config,
            gameStatus: GAME_STATUS.WON
        });
        
        // Only add system message if we're the one who triggered the win
        const now = Date.now();
        if (now - lastSystemMessage.current > 1000) {
            addSystemMessage('You won!');
            lastSystemMessage.current = now;
        }
        
        if (timerRef.current) clearInterval(timerRef.current);
        
        setCountdown(3);
        timerRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                    onGameOver();
                    return null;
                }
                return prev - 1;
            });
        }, 1000);
    }, [localBoard, onGameUpdate, onGameOver, config, addSystemMessage, gameStatus]);

    /**
     * Mouse and drag handling functions for board scrolling
     */
    const handleMouseDown = (e) => {
        if (e.button !== 0) return;
        setIsDragging(true);
        setDragStart({
            x: e.pageX - scrollPosition.x,
            y: e.pageY - scrollPosition.y
        });
    };

    const handleMouseMove = useCallback((e) => {
        if (!boardRef.current) return;

        const rect = boardRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
            onCursorMove({ x, y, isInCanvas: true });
        }
    }, [onCursorMove]);

    const handleMouseLeave = useCallback(() => {
        onCursorMove({ isInCanvas: false });
    }, [onCursorMove]);

    const handleMouseUp = useCallback(() => {
        if (!isDragging) return;
        setIsDragging(false);
        if (containerRef.current) {
            setScrollPosition({
                x: -containerRef.current.scrollLeft,
                y: -containerRef.current.scrollTop
            });
        }
    }, [isDragging]);

    const handleScroll = () => {
        if (containerRef.current && !isDragging) {
            setScrollPosition({
                x: -containerRef.current.scrollLeft,
                y: -containerRef.current.scrollTop
            });
        }
    };

    /**
     * Mouse event listeners setup and cleanup
     */
    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    /**
     * Network board state synchronization
     */
    useEffect(() => {
        if (localBoard && networkBoard?.board) {
            const updatedBoard = applyBoardBlueprint(localBoard, networkBoard.board);
            
            const hasMinePlacement = updatedBoard.some(row => 
                row.some(cell => cell.isMine)
            );

            if (hasMinePlacement) {
                setMinesPlaced(true);
                setIsFirstClick(false);
            }

            setLocalBoard(updatedBoard);
            setFlagsCount(countFlags(updatedBoard));

            // Handle received game status
            if (networkBoard.gameStatus === GAME_STATUS.WON && gameStatus === GAME_STATUS.PLAYING) {
                setGameStatus(GAME_STATUS.WON);
                addSystemMessage('You won!');
                setCountdown(3);
                if (timerRef.current) clearInterval(timerRef.current);
                timerRef.current = setInterval(() => {
                    setCountdown(prev => {
                        if (prev <= 1) {
                            clearInterval(timerRef.current);
                            timerRef.current = null;
                            onGameOver();
                            return null;
                        }
                        return prev - 1;
                    });
                }, 1000);
            }

            if (minesPlaced) {
                const hasRevealedMine = updatedBoard.some(row => 
                    row.some(cell => 
                        cell.status === CELL_STATUS.REVEALED && cell.isMine
                    )
                );

                if (hasRevealedMine && gameStatus === GAME_STATUS.PLAYING) {
                    setTimeout(() => handleGameOver(), 0);
                } else if (checkWinCondition(updatedBoard) && gameStatus === GAME_STATUS.PLAYING) {
                    setTimeout(() => handleWin(), 0);
                }
            }
        }
    }, [networkBoard, gameStatus, handleGameOver, handleWin, localBoard, minesPlaced, addSystemMessage, onGameOver]);

    /**
     * Cursor tracking event listeners setup and cleanup
     */
    useEffect(() => {
        const content = gameContentRef.current;
        if (content) {
            content.addEventListener('mousemove', handleMouseMove);
            content.addEventListener('mouseleave', handleMouseLeave);
        }
        return () => {
            if (content) {
                content.removeEventListener('mousemove', handleMouseMove);
                content.removeEventListener('mouseleave', handleMouseLeave);
            }
        };
    }, [handleMouseMove, handleMouseLeave]);

    /**
     * Gets current timer state for display
     * @returns {Object} Current timer state with minutes and seconds
     */
    const getCurrentTimerState = () => {
        return {
            enabled: config.timer.enabled,
            minutes: Math.floor(timer.currentSeconds / 60),
            seconds: timer.currentSeconds % 60
        };
    };

    return (
        <div className="minesweeper">
            <div className="header-wrapper">
                <GameHeader 
                    gameStatus={gameStatus}
                    flagsCount={flagsCount}
                    totalMines={config.bombs}
                    timer={timer}
                />
            </div>
            <div 
                ref={containerRef}
                className={`game-scroll-container ${isDragging ? 'dragging' : ''}`}
                onMouseDown={handleMouseDown}
                onScroll={handleScroll}
            >
                <div 
                    ref={gameContentRef}
                    className="game-content"
                >
                    <div 
                        ref={boardRef}
                        className="board-container"
                        onMouseMove={handleMouseMove}
                        onMouseLeave={() => onCursorMove({ isInCanvas: false })}
                    >
                        <Board 
                            board={localBoard}
                            onCellClick={handleCellClick}
                            onCellRightClick={handleCellRightClick}
                            gameStatus={gameStatus}
                        />
                        <CursorOverlay 
                            cursors={peerCursors}
                            connectedUsers={connectedUsers}
                        />
                    </div>
                </div>
            </div>
            {gameStatus !== GAME_STATUS.PLAYING && (
                <div className="game-over-overlay">
                    <h2>{gameStatus === GAME_STATUS.WON ? 'You won!' : 'Game over!'}</h2>
                    {countdown && (
                        <p className="countdown">Returning to lobby in {countdown}...</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default Minesweeper;
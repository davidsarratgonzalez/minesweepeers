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
    updateTimer,
    applyCellAction,
    CELL_ACTION_TYPES
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
 * - Multiplayer synchronization via cell-level actions
 * - Cursor tracking and display
 * - Board interaction (clicks, flags)
 * - Win/lose conditions
 *
 * @component
 * @param {Object} props - Component properties
 * @param {Object} props.config - Game configuration (width, height, bombs, timer settings)
 * @param {Object} props.board - Network-synced board state (used for initial sync when joining mid-game)
 * @param {Function} props.onCellAction - Callback to broadcast cell actions to peers
 * @param {Function} props.onSyncBoard - Callback to sync board to network storage (no broadcast)
 * @param {Array} props.pendingActions - Queue of cell actions received from peers
 * @param {Function} props.clearPendingActions - Callback to clear processed pending actions
 * @param {Function} props.onGameOver - Callback triggered when game ends
 * @param {Function} props.onCursorMove - Callback to sync cursor position with other players
 * @param {Object} props.peerCursors - Cursor positions of other players
 * @param {Array} props.connectedUsers - List of connected players
 * @param {Function} props.addSystemMessage - Callback to add system messages
 */
const Minesweeper = ({ config, board: networkBoard, onCellAction, onSyncBoard, pendingActions, clearPendingActions, onGameOver, onCursorMove, peerCursors, connectedUsers, addSystemMessage }) => {
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
    const initialBoardApplied = useRef(false);

    /**
     * Syncs the current board to PeerNetwork storage for new-peer joins.
     * Does NOT broadcast to existing peers.
     */
    const syncBoardToNetwork = useCallback((board) => {
        const blueprint = createBoardBlueprint(board);
        onSyncBoard(blueprint);
    }, [onSyncBoard]);

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
     * Handles game over state, reveals mines, and initiates countdown.
     * Each peer detects game-over locally after applying a REVEAL action on a mine.
     */
    const handleGameOver = useCallback(() => {
        const revealedBoard = revealAllMines(localBoard);
        setLocalBoard(revealedBoard);
        setGameStatus(GAME_STATUS.LOST);

        // Sync revealed board so new peers joining see the correct end state
        syncBoardToNetwork(revealedBoard);

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
    }, [localBoard, syncBoardToNetwork, onGameOver, addSystemMessage]);

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
            handleGameOver();
        }
    }, [timer.currentSeconds, timer.isCountdown, gameStatus, handleGameOver]);

    /**
     * Handles cell click events, including first click mine placement.
     * Sends cell-level actions to peers instead of full board state.
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

            // Send FIRST_REVEAL with the full board blueprint (mine positions)
            const blueprint = createBoardBlueprint(newBoard);
            onCellAction({
                action: CELL_ACTION_TYPES.FIRST_REVEAL,
                x,
                y,
                board: blueprint
            });
        } else {
            newBoard = revealCell(localBoard, x, y);
            onCellAction({
                action: CELL_ACTION_TYPES.REVEAL,
                x,
                y
            });
        }

        // Update local board state immediately
        setLocalBoard(newBoard);
        setFlagsCount(countFlags(newBoard));

        // Sync board to network storage (for new-peer joins, no broadcast)
        syncBoardToNetwork(newBoard);

        // Check win/lose conditions after board is updated
        if (newBoard[y][x].isMine) {
            setTimeout(() => handleGameOver(), 0);
        } else if (checkWinCondition(newBoard)) {
            setTimeout(() => handleWin(), 0);
        }
    };

    /**
     * Handles right-click flag placement.
     * Sends FLAG action to peers instead of full board state.
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

        // Send FLAG action to peers
        onCellAction({
            action: CELL_ACTION_TYPES.FLAG,
            x,
            y
        });

        // Sync board to network storage (for new-peer joins, no broadcast)
        syncBoardToNetwork(newBoard);
    };

    /**
     * Handles win condition, reveals board, and initiates countdown.
     * Each peer detects win locally after applying the action that reveals the last safe cell.
     */
    const handleWin = useCallback(() => {
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

        // Sync revealed board (no broadcast)
        syncBoardToNetwork(revealedBoard);

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
    }, [localBoard, syncBoardToNetwork, onGameOver, addSystemMessage, gameStatus]);

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
     * Applies the initial board state when a new peer joins mid-game.
     * Only runs once when the component mounts with a networkBoard that has data.
     */
    useEffect(() => {
        if (localBoard && networkBoard?.board && !initialBoardApplied.current) {
            // networkBoard.board could be a nested structure from legacy GAME_STATE
            const blueprint = Array.isArray(networkBoard.board) ? networkBoard.board : networkBoard;
            if (!Array.isArray(blueprint)) return;

            const updatedBoard = applyBoardBlueprint(localBoard, blueprint);

            const hasMinePlacement = updatedBoard.some(row =>
                row.some(cell => cell.isMine)
            );

            if (hasMinePlacement) {
                setMinesPlaced(true);
                setIsFirstClick(false);
            }

            setLocalBoard(updatedBoard);
            setFlagsCount(countFlags(updatedBoard));
            initialBoardApplied.current = true;

            // Check for game-ending state in the received board
            if (hasMinePlacement) {
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
    }, [networkBoard]);

    /**
     * Processes pending cell actions received from network peers.
     * Actions are applied sequentially to the local board.
     * After processing, checks for win/lose conditions.
     */
    useEffect(() => {
        if (!pendingActions || pendingActions.length === 0 || !localBoard) return;
        if (gameStatus !== GAME_STATUS.PLAYING) {
            clearPendingActions();
            return;
        }

        let currentBoard = localBoard;
        let minesWerePlaced = minesPlaced;

        for (const action of pendingActions) {
            // Guard: if FIRST_REVEAL arrives but mines are already placed,
            // just do a normal reveal (prevents overwriting mine layout from a race)
            if (action.action === CELL_ACTION_TYPES.FIRST_REVEAL && minesWerePlaced) {
                currentBoard = revealCell(currentBoard, action.x, action.y);
            } else {
                const result = applyCellAction(currentBoard, action);
                currentBoard = result.board;
                if (result.minesPlaced) {
                    minesWerePlaced = true;
                }
            }
        }

        // Update local state
        if (minesWerePlaced && !minesPlaced) {
            setMinesPlaced(true);
            setIsFirstClick(false);
        }

        setLocalBoard(currentBoard);
        setFlagsCount(countFlags(currentBoard));

        // Sync updated board to network storage
        syncBoardToNetwork(currentBoard);

        // Clear processed actions
        clearPendingActions();

        // Check win/lose conditions after applying all actions
        if (minesWerePlaced) {
            const hasRevealedMine = currentBoard.some(row =>
                row.some(cell =>
                    cell.status === CELL_STATUS.REVEALED && cell.isMine
                )
            );

            if (hasRevealedMine) {
                setTimeout(() => handleGameOver(), 0);
            } else if (checkWinCondition(currentBoard)) {
                setTimeout(() => handleWin(), 0);
            }
        }
    }, [pendingActions]);

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

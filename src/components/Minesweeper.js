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

const Minesweeper = ({ config, board: networkBoard, onGameUpdate, onGameOver, onCursorMove, peerCursors, connectedUsers }) => {
    const [localBoard, setLocalBoard] = useState(null);
    const [gameStatus, setGameStatus] = useState(GAME_STATUS.PLAYING);
    const [flagsCount, setFlagsCount] = useState(0);
    const [timer, setTimer] = useState(() => createTimer(config));
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);
    const [isFirstClick, setIsFirstClick] = useState(true);
    const [minesPlaced, setMinesPlaced] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const timerRef = useRef(null);
    const gameTimerRef = useRef(null);
    const gameContentRef = useRef(null);
    const boardRef = useRef(null);

    // Initialize empty board
    useEffect(() => {
        if (!localBoard) {
            const emptyBoard = createEmptyBoard(config.width, config.height);
            setLocalBoard(emptyBoard);
            setFlagsCount(0);
        }
    }, [config.width, config.height, localBoard]);

    // Clean up ALL timers when unmounting
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (gameTimerRef.current) {
                clearInterval(gameTimerRef.current);
            }
        };
    }, []);

    // Handle timer
    const handleGameOver = useCallback(() => {
        // First reveal all mines in the local board
        const revealedBoard = revealAllMines(localBoard);
        setLocalBoard(revealedBoard);
        setGameStatus(GAME_STATUS.LOST);
        
        // Create and send the blueprint so others can see the mines too
        const blueprint = createBoardBlueprint(revealedBoard);
        onGameUpdate({
            board: blueprint,
            config: config
        });
        
        // Start countdown to return to lobby
        setCountdown(3);
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
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
    }, [localBoard, onGameUpdate, onGameOver, config]);

    useEffect(() => {
        if (gameStatus === GAME_STATUS.PLAYING) {
            const interval = setInterval(() => {
                setTimer(prevTimer => updateTimer(prevTimer));
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [gameStatus]);

    // Separate effect to handle timer reaching zero
    useEffect(() => {
        if (timer.isCountdown && timer.currentSeconds === 0 && gameStatus === GAME_STATUS.PLAYING) {
            const revealedBoard = revealAllMines(localBoard);
            setLocalBoard(revealedBoard);
            
            // Send the full state update
            onGameUpdate({
                ...config,  // Include all config
                board: revealedBoard  // Send the actual board, not the blueprint
            });
            
            handleGameOver();
        }
    }, [timer.currentSeconds, timer.isCountdown, gameStatus]);

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

        setLocalBoard(newBoard);
        
        // Create and send the board blueprint
        const blueprint = createBoardBlueprint(newBoard);
        onGameUpdate({
            board: blueprint,  // Send the blueprint instead of the full board
            config: config
        });

        if (newBoard[y][x].isMine) {
            setTimeout(() => handleGameOver(), 0);
        } else if (checkWinCondition(newBoard)) {
            setTimeout(() => handleWin(), 0);
        }
    };

    const handleCellRightClick = (e, x, y) => {
        e.preventDefault();
        if (gameStatus !== GAME_STATUS.PLAYING) return;

        const newBoard = toggleFlag(localBoard, x, y);
        setLocalBoard(newBoard);
        setFlagsCount(countFlags(newBoard));
        
        // Send blueprint to peers with full state structure
        const blueprint = createBoardBlueprint(newBoard);
        onGameUpdate({
            board: blueprint,
            config: config
        });
    };

    const handleWin = useCallback(() => {
        setGameStatus(GAME_STATUS.WON);
        const revealedBoard = revealAllMines(localBoard);
        setLocalBoard(revealedBoard);
        
        // Send blueprint to peers with full state structure
        const blueprint = createBoardBlueprint(revealedBoard);
        onGameUpdate({
            board: blueprint,
            config: config
        });
        
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
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
    }, [localBoard, onGameUpdate, onGameOver, config]);

    const handleMouseDown = (e) => {
        if (e.button !== 0) return; // Only left click
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

        // Only share if cursor is within bounds
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

    // Update scroll position when scrolling
    const handleScroll = () => {
        if (containerRef.current && !isDragging) {
            setScrollPosition({
                x: -containerRef.current.scrollLeft,
                y: -containerRef.current.scrollTop
            });
        }
    };

    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    // Update board when receiving updates from network
    useEffect(() => {
        if (localBoard && networkBoard?.board) {  // Check for networkBoard.board
            const updatedBoard = applyBoardBlueprint(localBoard, networkBoard.board);
            
            // Check if this update contains mine placements
            const hasMinePlacement = updatedBoard.some(row => 
                row.some(cell => cell.isMine)
            );

            if (hasMinePlacement) {
                setMinesPlaced(true);
                setIsFirstClick(false);
            }

            // Update board first
            setLocalBoard(updatedBoard);
            setFlagsCount(countFlags(updatedBoard));

            // Then check win/lose conditions
            if (minesPlaced) {
                const hasRevealedMine = updatedBoard.some(row => 
                    row.some(cell => 
                        cell.status === CELL_STATUS.REVEALED && cell.isMine
                    )
                );

                if (hasRevealedMine && gameStatus === GAME_STATUS.PLAYING) {
                    setTimeout(() => handleGameOver(), 0);
                } else if (checkWinCondition(updatedBoard)) {
                    setTimeout(() => handleWin(), 0);
                }
            }
        }
    }, [networkBoard, gameStatus, handleGameOver, handleWin, localBoard, minesPlaced]);

    // Add mouse move event listeners
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

    const getCurrentTimerState = () => {
        return {
            enabled: config.timer.enabled,
            minutes: Math.floor(timer.currentSeconds / 60),
            seconds: timer.currentSeconds % 60
        };
    };

    return (
        <div className="minesweeper">
            <GameHeader 
                gameStatus={gameStatus}
                flagsCount={flagsCount}
                totalMines={config.bombs}
                timer={timer}
            />
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
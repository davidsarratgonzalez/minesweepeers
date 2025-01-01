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
    placeMines 
} from '../utils/minesweeperLogic';
import './Minesweeper.css';
import CursorOverlay from './CursorOverlay';

const Minesweeper = ({ config, board: networkBoard, onGameUpdate, onGameOver, onCursorMove, peerCursors, connectedUsers }) => {
    const [localBoard, setLocalBoard] = useState(null);
    const [gameStatus, setGameStatus] = useState(GAME_STATUS.PLAYING);
    const [flagsCount, setFlagsCount] = useState(0);
    const [timeLeft, setTimeLeft] = useState(
        config.timer.enabled ? config.timer.minutes * 60 + config.timer.seconds : 0
    );
    const [elapsedTime, setElapsedTime] = useState(0);
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
        setGameStatus(GAME_STATUS.LOST);
        const revealedBoard = revealAllMines(localBoard);
        setLocalBoard(revealedBoard);
        
        const blueprint = createBoardBlueprint(revealedBoard);
        onGameUpdate(blueprint);
        
        // Store timer reference so we can clear it
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
    }, [localBoard, onGameUpdate, onGameOver]);

    useEffect(() => {
        if (gameStatus === GAME_STATUS.PLAYING) {
            gameTimerRef.current = setInterval(() => {
                if (config.timer.enabled) {
                    setTimeLeft(prev => {
                        if (prev <= 0) {
                            clearInterval(gameTimerRef.current);
                            handleGameOver();
                            return 0;
                        }
                        return prev - 1;
                    });
                } else {
                    setElapsedTime(prev => prev + 1);
                }
            }, 1000);
        }
        return () => {
            if (gameTimerRef.current) {
                clearInterval(gameTimerRef.current);
            }
        };
    }, [gameStatus, config.timer.enabled, handleGameOver]);

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

        // Update local board first
        setLocalBoard(newBoard);
        
        // Send blueprint to peers
        const blueprint = createBoardBlueprint(newBoard);
        onGameUpdate(blueprint);

        // Check win/lose conditions after board is updated
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
        
        // Send blueprint to peers
        const blueprint = createBoardBlueprint(newBoard);
        onGameUpdate(blueprint);
    };

    const handleWin = useCallback(() => {
        setGameStatus(GAME_STATUS.WON);
        const revealedBoard = revealAllMines(localBoard);
        setLocalBoard(revealedBoard);
        
        const blueprint = createBoardBlueprint(revealedBoard);
        onGameUpdate(blueprint);
        
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
    }, [localBoard, onGameUpdate, onGameOver]);

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
        if (localBoard && networkBoard) {
            const updatedBoard = applyBoardBlueprint(localBoard, networkBoard);
            
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

    return (
        <div className="minesweeper">
            <GameHeader 
                gameStatus={gameStatus}
                flagsCount={flagsCount}
                totalMines={config.bombs}
                timeLeft={config.timer.enabled ? timeLeft : null}
                elapsedTime={!config.timer.enabled ? elapsedTime : null}
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
                    <h2>{gameStatus === GAME_STATUS.WON ? 'You Won!' : 'Game Over!'}</h2>
                    {countdown && (
                        <p className="countdown">Returning to lobby in {countdown}...</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default Minesweeper; 
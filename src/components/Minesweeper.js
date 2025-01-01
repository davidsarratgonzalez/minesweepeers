import React, { useState, useEffect, useCallback, useRef } from 'react';
import Board from './Board';
import GameHeader from './GameHeader';
import { CELL_STATUS, GAME_STATUS } from '../constants/gameTypes';
import { 
    createBoard, 
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

const Minesweeper = ({ config, board: networkBoard, onGameUpdate, onGameOver }) => {
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
            // On first click, place mines and reveal cell
            newBoard = placeMines(localBoard, config.bombs, x, y);
            setMinesPlaced(true);
            setIsFirstClick(false);
            newBoard = revealCell(newBoard, x, y);
        } else {
            newBoard = revealCell(localBoard, x, y);
        }

        setLocalBoard(newBoard);
        
        // Send blueprint to peers
        const blueprint = createBoardBlueprint(newBoard);
        onGameUpdate(blueprint);

        if (newBoard[y][x].isMine) {
            handleGameOver();
        } else if (checkWinCondition(newBoard)) {
            handleWin();
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
        if (!isDragging) return;
        
        const newX = e.pageX - dragStart.x;
        const newY = e.pageY - dragStart.y;
        
        if (containerRef.current) {
            containerRef.current.scrollLeft = -newX;
            containerRef.current.scrollTop = -newY;
        }
    }, [isDragging, dragStart]);

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
            // Only apply network updates if mines are placed or if receiving initial mine placement
            const updatedBoard = applyBoardBlueprint(localBoard, networkBoard);
            
            // Check if this update contains mine placements
            const hasMinePlacement = updatedBoard.some(row => 
                row.some(cell => cell.isMine)
            );

            if (hasMinePlacement) {
                setMinesPlaced(true);
                setIsFirstClick(false);
            }

            setLocalBoard(updatedBoard);
            setFlagsCount(countFlags(updatedBoard));

            // Check for revealed mines only if mines are placed
            if (minesPlaced) {
                const hasRevealedMine = updatedBoard.some(row => 
                    row.some(cell => 
                        cell.status === CELL_STATUS.REVEALED && cell.isMine
                    )
                );

                if (hasRevealedMine && gameStatus === GAME_STATUS.PLAYING) {
                    handleGameOver();
                } else if (checkWinCondition(updatedBoard)) {
                    handleWin();
                }
            }
        }
    }, [networkBoard, gameStatus, handleGameOver, handleWin, localBoard, minesPlaced]);

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
                <div className="game-content">
                    <Board 
                        board={localBoard}
                        onCellClick={handleCellClick}
                        onCellRightClick={handleCellRightClick}
                        gameStatus={gameStatus}
                    />
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
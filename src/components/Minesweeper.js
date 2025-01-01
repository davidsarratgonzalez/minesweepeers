import React, { useState, useEffect, useCallback, useRef } from 'react';
import Board from './Board';
import GameHeader from './GameHeader';
import { GAME_STATUS } from '../constants/gameTypes';
import { 
    createBoard, 
    revealCell, 
    toggleFlag, 
    countFlags, 
    checkWinCondition, 
    revealAllMines, 
    createBoardBlueprint, 
    applyBoardBlueprint 
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

    // Initialize board
    useEffect(() => {
        if (!localBoard) {
            const initialBoard = createBoard(config.width, config.height, config.bombs);
            setLocalBoard(initialBoard);
            setFlagsCount(0);
        }
    }, [config.width, config.height, config.bombs]);

    // Handle timer
    const handleGameOver = useCallback(() => {
        setGameStatus(GAME_STATUS.LOST);
        const revealedBoard = revealAllMines(localBoard);
        setLocalBoard(revealedBoard);
        
        // Send blueprint to peers with all mines revealed
        const blueprint = createBoardBlueprint(revealedBoard);
        onGameUpdate(blueprint);
        
        setTimeout(() => {
            onGameOver();
        }, 5000);
    }, [localBoard, onGameUpdate, onGameOver]);

    useEffect(() => {
        let timer;
        if (gameStatus === GAME_STATUS.PLAYING) {
            timer = setInterval(() => {
                if (config.timer.enabled) {
                    setTimeLeft(prev => {
                        if (prev <= 0) {
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
        return () => clearInterval(timer);
    }, [gameStatus, config.timer.enabled, handleGameOver]);

    const handleCellClick = (x, y) => {
        if (gameStatus !== GAME_STATUS.PLAYING) return;

        const newBoard = revealCell(localBoard, x, y);
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

    const handleWin = () => {
        setGameStatus(GAME_STATUS.WON);
        // Also reveal all mines when winning
        const revealedBoard = revealAllMines(localBoard);
        setLocalBoard(revealedBoard);
        
        // Send blueprint to peers with all mines revealed
        const blueprint = createBoardBlueprint(revealedBoard);
        onGameUpdate(blueprint);
        
        setTimeout(() => {
            onGameOver();
        }, 5000);
    };

    const handleMouseDown = (e) => {
        if (e.button !== 0) return; // Only left click
        setIsDragging(true);
        setDragStart({
            x: e.pageX - scrollPosition.x,
            y: e.pageY - scrollPosition.y
        });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        
        const newX = e.pageX - dragStart.x;
        const newY = e.pageY - dragStart.y;
        
        if (containerRef.current) {
            containerRef.current.scrollLeft = -newX;
            containerRef.current.scrollTop = -newY;
        }
    };

    const handleMouseUp = () => {
        if (!isDragging) return;
        setIsDragging(false);
        if (containerRef.current) {
            setScrollPosition({
                x: -containerRef.current.scrollLeft,
                y: -containerRef.current.scrollTop
            });
        }
    };

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
    }, [isDragging, dragStart]);

    // Update board when receiving updates from network
    useEffect(() => {
        if (localBoard && networkBoard) {
            const updatedBoard = applyBoardBlueprint(localBoard, networkBoard);
            setLocalBoard(updatedBoard);
            setFlagsCount(countFlags(updatedBoard));
        }
    }, [networkBoard]);

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
                </div>
            )}
        </div>
    );
};

export default Minesweeper; 
import React, { useState, useEffect, useCallback } from 'react';
import Board from './Board';
import GameHeader from './GameHeader';
import { GAME_STATUS } from '../constants/gameTypes';
import { 
    createBoard, 
    revealCell, 
    toggleFlag, 
    countFlags, 
    checkWinCondition, 
    revealAllMines 
} from '../utils/minesweeperLogic';
import './Minesweeper.css';

const Minesweeper = ({ config, onGameUpdate, onGameOver }) => {
    const [board, setBoard] = useState(null);
    const [gameStatus, setGameStatus] = useState(GAME_STATUS.PLAYING);
    const [flagsCount, setFlagsCount] = useState(0);
    const [timeLeft, setTimeLeft] = useState(
        config.timer.enabled ? config.timer.minutes * 60 + config.timer.seconds : 0
    );
    const [elapsedTime, setElapsedTime] = useState(0);

    // Initialize board
    useEffect(() => {
        const initialBoard = createBoard(config.width, config.height, config.bombs);
        setBoard(initialBoard);
        setFlagsCount(0);
        
        // Send initial board to peers
        onGameUpdate(initialBoard);
    }, [config.width, config.height, config.bombs, onGameUpdate]);

    // Handle timer
    const handleGameOver = useCallback(() => {
        setGameStatus(GAME_STATUS.LOST);
        const revealedBoard = revealAllMines(board);
        setBoard(revealedBoard);
        onGameUpdate(revealedBoard);
        
        setTimeout(() => {
            onGameOver();
        }, 5000);
    }, [board, onGameUpdate, onGameOver]);

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

        const newBoard = revealCell(board, x, y);
        setBoard(newBoard);
        onGameUpdate(newBoard);

        if (newBoard[y][x].isMine) {
            handleGameOver();
        } else if (checkWinCondition(newBoard)) {
            handleWin();
        }
    };

    const handleCellRightClick = (e, x, y) => {
        e.preventDefault();
        if (gameStatus !== GAME_STATUS.PLAYING) return;

        const newBoard = toggleFlag(board, x, y);
        setBoard(newBoard);
        setFlagsCount(countFlags(newBoard));
        onGameUpdate(newBoard);
    };

    const handleWin = () => {
        setGameStatus(GAME_STATUS.WON);
        setTimeout(() => {
            onGameOver();
        }, 5000);
    };

    return (
        <div className="minesweeper">
            <GameHeader 
                gameStatus={gameStatus}
                flagsCount={flagsCount}
                totalMines={config.bombs}
                timeLeft={config.timer.enabled ? timeLeft : null}
                elapsedTime={!config.timer.enabled ? elapsedTime : null}
            />
            <Board 
                board={board}
                onCellClick={handleCellClick}
                onCellRightClick={handleCellRightClick}
                gameStatus={gameStatus}
            />
            {gameStatus !== GAME_STATUS.PLAYING && (
                <div className="game-over-overlay">
                    <h2>{gameStatus === GAME_STATUS.WON ? 'You Won!' : 'Game Over!'}</h2>
                </div>
            )}
        </div>
    );
};

export default Minesweeper; 
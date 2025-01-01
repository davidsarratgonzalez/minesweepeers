import React from 'react';
import './GameHeader.css';

const GameHeader = ({ gameStatus, flagsCount, totalMines, timeLeft, elapsedTime }) => {
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="game-header">
            <div className="mines-counter">
                💣 {totalMines - flagsCount}
            </div>
            <div className="game-status">
                {gameStatus}
            </div>
            <div className="timer">
                ⏱️ {timeLeft !== null ? formatTime(timeLeft) : formatTime(elapsedTime)}
            </div>
        </div>
    );
};

export default GameHeader; 
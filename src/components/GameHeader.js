import React from 'react';
import './GameHeader.css';
import { formatTime } from '../utils/minesweeperLogic';

const GameHeader = ({ gameStatus, flagsCount, totalMines, timer }) => {
    return (
        <div className="game-header">
            <div className="mines-counter">
                💣 {flagsCount}/{totalMines}
            </div>
            <div className="timer">
                ⏱️ {formatTime(timer.currentSeconds)}
            </div>
        </div>
    );
};

export default GameHeader; 
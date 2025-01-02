import React from 'react';
import './GameHeader.css';
import { formatTime } from '../utils/minesweeperLogic';

/**
 * GameHeader Component - Displays game statistics and timer in the header section
 * 
 * Renders a header bar containing:
 * - Mine counter showing placed flags vs total mines
 * - Game timer displaying elapsed time in MM:SS format
 *
 * @component
 * @param {Object} props - Component properties
 * @param {string} props.gameStatus - Current game status (e.g. 'playing', 'won', 'lost')
 * @param {number} props.flagsCount - Number of flags currently placed on the board
 * @param {number} props.totalMines - Total number of mines in the game
 * @param {Object} props.timer - Timer object containing game duration
 * @param {number} props.timer.currentSeconds - Current elapsed time in seconds
 * @returns {JSX.Element} Header bar with game statistics
 */
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
import React from 'react';
import Cell from './Cell';
import './Board.css';

/**
 * Board Component - Renders the Minesweeper game board
 * 
 * @component
 * @param {Object} props - Component properties
 * @param {Array<Array>} props.board - 2D array representing the game board state
 * @param {Function} props.onCellClick - Handler for left-click cell interactions
 * @param {Function} props.onCellRightClick - Handler for right-click cell interactions (flagging)
 * @param {string} props.gameStatus - Current game status ('playing', 'won', or 'lost')
 * @returns {JSX.Element|null} Rendered game board or null if board is not initialized
 */
const Board = ({ board, onCellClick, onCellRightClick, gameStatus }) => {
    // Return null if board is not yet initialized
    if (!board) return null;

    return (
        <div className="board">
            {/* Iterate through each row of the board */}
            {board.map((row, y) => (
                <div key={y} className="board-row">
                    {/* Render individual cells for each position in the row */}
                    {row.map((cell, x) => (
                        <Cell
                            key={`${x}-${y}`}
                            cell={cell}
                            onClick={() => onCellClick(x, y)}
                            onRightClick={(e) => onCellRightClick(e, x, y)}
                            gameStatus={gameStatus}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
};

export default Board;
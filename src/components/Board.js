import React from 'react';
import Cell from './Cell';
import './Board.css';

const Board = ({ board, onCellClick, onCellRightClick, gameStatus }) => {
    if (!board) return null;

    return (
        <div className="board">
            {board.map((row, y) => (
                <div key={y} className="board-row">
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
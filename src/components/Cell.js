import React from 'react';
import { CELL_STATUS } from '../constants/gameTypes';
import './Cell.css';

const Cell = ({ cell, onClick, onRightClick, gameStatus }) => {
    const getCellContent = () => {
        if (cell.status === CELL_STATUS.FLAGGED) {
            return <i className="fa-solid fa-flag" />;
        }
        if (cell.status === CELL_STATUS.HIDDEN) {
            return '';
        }
        if (cell.isMine) {
            return <i className="fa-solid fa-bomb" />;
        }
        return cell.adjacentMines || '';
    };

    const getCellClass = () => {
        let className = 'cell';
        if (cell.status === CELL_STATUS.REVEALED) {
            className += ' revealed';
            if (cell.isMine) {
                className += ' mine';
            } else if (cell.adjacentMines > 0) {
                className += ` adjacent-${cell.adjacentMines}`;
            }
        }
        return className;
    };

    const handleClick = (e) => {
        // Prevent click if the cell is flagged
        if (cell.status === CELL_STATUS.FLAGGED) {
            return;
        }
        onClick(e);
    };

    return (
        <button
            className={getCellClass()}
            onClick={handleClick}
            onContextMenu={onRightClick}
            disabled={cell.status === CELL_STATUS.REVEALED}
        >
            {getCellContent()}
        </button>
    );
};

export default Cell; 
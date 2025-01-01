import React from 'react';
import { CELL_STATUS } from '../constants/gameTypes';
import './Cell.css';

const Cell = ({ cell, onClick, onRightClick, gameStatus }) => {
    const getCellContent = () => {
        if (cell.status === CELL_STATUS.FLAGGED) {
            return '🚩';
        }
        if (cell.status === CELL_STATUS.HIDDEN) {
            return '';
        }
        if (cell.isMine) {
            return '💣';
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

    return (
        <button
            className={getCellClass()}
            onClick={onClick}
            onContextMenu={onRightClick}
            disabled={cell.status === CELL_STATUS.REVEALED}
        >
            {getCellContent()}
        </button>
    );
};

export default Cell; 
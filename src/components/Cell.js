import React from 'react';
import { CELL_STATUS } from '../constants/gameTypes';
import './Cell.css';

/**
 * Cell Component - Represents a single cell in the Minesweeper game board
 * 
 * @component
 * @param {Object} props - Component properties
 * @param {Object} props.cell - Cell data containing status, mine and adjacent mine information
 * @param {Function} props.onClick - Handler for left-click cell interactions
 * @param {Function} props.onRightClick - Handler for right-click cell interactions (flagging)
 * @param {string} props.gameStatus - Current game status ('playing', 'won', or 'lost')
 * @returns {JSX.Element} A button element representing the cell
 */
const Cell = ({ cell, onClick, onRightClick, gameStatus }) => {
    /**
     * Determines the content to display in the cell based on its current state
     * 
     * @returns {(JSX.Element|string|number)} Cell content - flag icon, bomb icon, adjacent mine count, or empty string
     */
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

    /**
     * Generates the CSS class names for the cell based on its state
     * Handles styling for revealed cells, mines, and cells with adjacent mines
     * 
     * @returns {string} Space-separated string of CSS class names
     */
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

    /**
     * Handles cell click events, preventing clicks on flagged cells
     * 
     * @param {React.MouseEvent} e - Click event object
     */
    const handleClick = (e) => {
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
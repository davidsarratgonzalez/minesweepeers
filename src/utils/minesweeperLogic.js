import { CELL_STATUS } from '../constants/gameTypes';

/**
 * Creates an empty game board with the specified dimensions.
 * Each cell is initialized with default properties: not a mine, hidden status, and 0 adjacent mines.
 * 
 * @param {number} width - The width of the board in cells
 * @param {number} height - The height of the board in cells
 * @returns {Array<Array<Object>>} 2D array representing the game board
 */
export const createEmptyBoard = (width, height) => {
    return Array(height).fill().map(() => 
        Array(width).fill().map(() => ({
            isMine: false,
            status: CELL_STATUS.HIDDEN,
            adjacentMines: 0
        }))
    );
};

/**
 * Places mines randomly on the board while ensuring the first clicked cell and its adjacent cells are safe.
 * Also calculates the number of adjacent mines for each non-mine cell.
 * 
 * @param {Array<Array<Object>>} board - The current game board
 * @param {number} mines - Number of mines to place
 * @param {number} firstX - X coordinate of first click
 * @param {number} firstY - Y coordinate of first click
 * @returns {Array<Array<Object>>} New board with mines placed and adjacent mine counts calculated
 */
export const placeMines = (board, mines, firstX, firstY) => {
    const width = board[0].length;
    const height = board.length;
    const newBoard = board.map(row => row.map(cell => ({...cell})));
    
    let minesPlaced = 0;
    while (minesPlaced < mines) {
        const x = Math.floor(Math.random() * width);
        const y = Math.floor(Math.random() * height);

        // Don't place mine on first click or adjacent cells
        const isNearFirstClick = Math.abs(x - firstX) <= 1 && Math.abs(y - firstY) <= 1;
        
        if (!newBoard[y][x].isMine && !isNearFirstClick) {
            newBoard[y][x].isMine = true;
            minesPlaced++;
        }
    }

    // Calculate adjacent mines
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!newBoard[y][x].isMine) {
                newBoard[y][x].adjacentMines = countAdjacentMines(newBoard, x, y);
            }
        }
    }

    return newBoard;
};

/**
 * Calculates the number of mines in the 8 cells surrounding a given cell position.
 * 
 * @param {Array<Array<Object>>} board - The game board
 * @param {number} x - X coordinate of the cell
 * @param {number} y - Y coordinate of the cell
 * @returns {number} Count of adjacent mines
 */
const countAdjacentMines = (board, x, y) => {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const newY = y + dy;
            const newX = x + dx;
            if (isValidCell(board, newX, newY) && board[newY][newX].isMine) {
                count++;
            }
        }
    }
    return count;
};

/**
 * Validates if given coordinates are within the board boundaries.
 * 
 * @param {Array<Array<Object>>} board - The game board
 * @param {number} x - X coordinate to check
 * @param {number} y - Y coordinate to check
 * @returns {boolean} True if coordinates are valid, false otherwise
 */
const isValidCell = (board, x, y) => {
    return y >= 0 && y < board.length && x >= 0 && x < board[0].length;
};

/**
 * Reveals a cell and recursively reveals adjacent cells if the clicked cell has no adjacent mines.
 * Implements the flood-fill algorithm for revealing empty cells.
 * 
 * @param {Array<Array<Object>>} board - The current game board
 * @param {number} x - X coordinate of clicked cell
 * @param {number} y - Y coordinate of clicked cell
 * @returns {Array<Array<Object>>} New board with revealed cells
 */
export const revealCell = (board, x, y) => {
    // Early return if the cell is invalid, revealed, or flagged
    if (!isValidCell(board, x, y) || 
        board[y][x].status === CELL_STATUS.REVEALED || 
        board[y][x].status === CELL_STATUS.FLAGGED) {
        return board;
    }

    // Create a new board copy
    const newBoard = board.map(row => row.map(cell => ({...cell})));
    
    // Function to reveal a single cell
    const reveal = (x, y) => {
        // Also check for flagged status in the recursive reveal
        if (!isValidCell(newBoard, x, y) || 
            newBoard[y][x].status === CELL_STATUS.REVEALED || 
            newBoard[y][x].status === CELL_STATUS.FLAGGED) {
            return;
        }

        newBoard[y][x].status = CELL_STATUS.REVEALED;

        // If it's an empty cell, reveal neighbors
        if (newBoard[y][x].adjacentMines === 0 && !newBoard[y][x].isMine) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    reveal(x + dx, y + dy);
                }
            }
        }
    };

    // Start revealing from the clicked cell
    reveal(x, y);
    return newBoard;
};

/**
 * Toggles a flag on a cell. A flagged cell cannot be revealed until unflagged.
 * 
 * @param {Array<Array<Object>>} board - The current game board
 * @param {number} x - X coordinate of cell to flag
 * @param {number} y - Y coordinate of cell to flag
 * @returns {Array<Array<Object>>} New board with updated flag state
 */
export const toggleFlag = (board, x, y) => {
    if (!isValidCell(board, x, y) || board[y][x].status === CELL_STATUS.REVEALED) {
        return board;
    }

    const newBoard = board.map(row => row.map(cell => ({...cell})));
    newBoard[y][x].status = 
        newBoard[y][x].status === CELL_STATUS.FLAGGED
            ? CELL_STATUS.HIDDEN
            : CELL_STATUS.FLAGGED;

    return newBoard;
};

/**
 * Reveals all mines on the board, typically called when game is over.
 * Maintains the state of non-mine cells.
 * 
 * @param {Array<Array<Object>>} board - The current game board
 * @returns {Array<Array<Object>>} New board with all mines revealed
 */
export const revealAllMines = (board) => {
    return board.map(row => 
        row.map(cell => ({
            ...cell,
            // Reveal all mines, even if they were flagged
            status: cell.isMine || cell.status === CELL_STATUS.REVEALED 
                ? CELL_STATUS.REVEALED 
                : cell.status
        }))
    );
};

/**
 * Checks if the game is won by verifying all non-mine cells are revealed
 * and no mines are revealed.
 * 
 * @param {Array<Array<Object>>} board - The current game board
 * @returns {boolean} True if game is won, false otherwise
 */
export const checkWinCondition = (board) => {
    return board.every(row => 
        row.every(cell => 
            (cell.isMine && cell.status !== CELL_STATUS.REVEALED) ||
            (!cell.isMine && cell.status === CELL_STATUS.REVEALED)
        )
    );
};

/**
 * Counts the total number of flags placed on the board.
 * Used to track remaining mines for the player.
 * 
 * @param {Array<Array<Object>>} board - The current game board
 * @returns {number} Total number of flags on the board
 */
export const countFlags = (board) => {
    return board.reduce((count, row) => 
        count + row.reduce((rowCount, cell) => 
            rowCount + (cell.status === CELL_STATUS.FLAGGED ? 1 : 0)
        , 0)
    , 0);
};

/**
 * Creates a minimal representation of a cell for network transmission.
 * Includes only essential properties to minimize network traffic.
 * 
 * @param {Object} cell - The cell to create blueprint from
 * @returns {Object} Minimal cell representation for network sync
 */
export const createCellBlueprint = (cell) => ({
    status: cell.status,
    isMine: cell.isMine,
    adjacentMines: cell.adjacentMines
});

/**
 * Creates a minimal representation of the entire board for network transmission.
 * 
 * @param {Array<Array<Object>>} board - The game board
 * @returns {Array<Array<Object>>} Board blueprint for network sync
 */
export const createBoardBlueprint = (board) => {
    return board.map(row => 
        row.map(cell => createCellBlueprint(cell))
    );
};

/**
 * Applies a received board blueprint to update the local game state.
 * Preserves existing cell properties not included in the blueprint.
 * 
 * @param {Array<Array<Object>>} board - The current game board
 * @param {Array<Array<Object>>} blueprint - The received board blueprint
 * @returns {Array<Array<Object>>} Updated game board
 */
export const applyBoardBlueprint = (board, blueprint) => {
    return board.map((row, y) => 
        row.map((cell, x) => {
            const blueprintCell = blueprint[y][x];
            return {
                ...cell,
                status: blueprintCell.status,
                ...(blueprintCell.isMine !== undefined && {
                    isMine: blueprintCell.isMine,
                    adjacentMines: blueprintCell.adjacentMines
                })
            };
        })
    );
};

/**
 * Creates a timer object based on game configuration.
 * Supports both countdown and count-up timer modes.
 * 
 * @param {Object} config - Game configuration containing timer settings
 * @returns {Object} Timer object with initial state
 */
export const createTimer = (config) => {
    const totalSeconds = config.timer.enabled ? 
        (config.timer.minutes * 60 + config.timer.seconds) : 
        0;

    return {
        isCountdown: config.timer.enabled,
        totalSeconds,
        currentSeconds: totalSeconds,
        startTime: Date.now()
    };
};

/**
 * Updates timer state based on elapsed time.
 * Handles both countdown and count-up modes.
 * 
 * @param {Object} timer - Current timer state
 * @returns {Object} Updated timer state
 */
export const updateTimer = (timer) => {
    const elapsedSeconds = Math.floor((Date.now() - timer.startTime) / 1000);
    
    if (timer.isCountdown) {
        return {
            ...timer,
            currentSeconds: Math.max(0, timer.totalSeconds - elapsedSeconds)
        };
    }
    
    return {
        ...timer,
        currentSeconds: elapsedSeconds
    };
};

/**
 * Formats time in seconds to MM:SS string format.
 * 
 * @param {number} seconds - Time in seconds to format
 * @returns {string} Formatted time string (MM:SS)
 */
export const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}; 
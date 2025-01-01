import { CELL_STATUS } from '../constants/gameTypes';

/**
 * Creates an empty board without mines
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
 * Places mines on the board after first click
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
 * Counts mines adjacent to a cell
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
 * Checks if coordinates are within board bounds
 */
const isValidCell = (board, x, y) => {
    return y >= 0 && y < board.length && x >= 0 && x < board[0].length;
};

/**
 * Reveals a cell and its adjacent cells if empty
 */
export const revealCell = (board, x, y) => {
    if (!isValidCell(board, x, y) || 
        board[y][x].status === CELL_STATUS.REVEALED || 
        board[y][x].status === CELL_STATUS.FLAGGED) {
        return board;
    }

    // Create a new board copy
    const newBoard = board.map(row => row.map(cell => ({...cell})));
    
    // Function to reveal a single cell
    const reveal = (x, y) => {
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
 * Toggles flag on a cell
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
 * Reveals all mines on the board
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
 * Checks if the game is won
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
 * Counts total flags on the board
 */
export const countFlags = (board) => {
    return board.reduce((count, row) => 
        count + row.reduce((rowCount, cell) => 
            rowCount + (cell.status === CELL_STATUS.FLAGGED ? 1 : 0)
        , 0)
    , 0);
};

/**
 * Cell blueprint for network synchronization
 */
export const createCellBlueprint = (cell) => ({
    status: cell.status,
    isMine: cell.isMine,
    adjacentMines: cell.adjacentMines
});

/**
 * Create board blueprint for network sync
 */
export const createBoardBlueprint = (board) => {
    return board.map(row => 
        row.map(cell => createCellBlueprint(cell))
    );
};

/**
 * Apply board blueprint from network
 */
export const applyBoardBlueprint = (board, blueprint) => {
    return board.map((row, y) => 
        row.map((cell, x) => {
            const blueprintCell = blueprint[y][x];
            return {
                ...cell,
                status: blueprintCell.status,
                // Only update mine info if it's set in the blueprint
                ...(blueprintCell.isMine !== undefined && {
                    isMine: blueprintCell.isMine,
                    adjacentMines: blueprintCell.adjacentMines
                })
            };
        })
    );
}; 
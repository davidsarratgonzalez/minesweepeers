import { CELL_STATUS } from '../constants/gameTypes';

/**
 * Creates a new board with randomly placed mines
 */
export const createBoard = (width, height, mines) => {
    // Initialize empty board
    const board = Array(height).fill().map(() => 
        Array(width).fill().map(() => ({
            isMine: false,
            status: CELL_STATUS.HIDDEN,
            adjacentMines: 0
        }))
    );

    // Place mines randomly
    let minesPlaced = 0;
    while (minesPlaced < mines) {
        const x = Math.floor(Math.random() * width);
        const y = Math.floor(Math.random() * height);

        if (!board[y][x].isMine) {
            board[y][x].isMine = true;
            minesPlaced++;
        }
    }

    // Calculate adjacent mines
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!board[y][x].isMine) {
                board[y][x].adjacentMines = countAdjacentMines(board, x, y);
            }
        }
    }

    return board;
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

    const newBoard = board.map(row => row.map(cell => ({...cell})));
    newBoard[y][x].status = CELL_STATUS.REVEALED;

    // If cell is empty, reveal adjacent cells
    if (newBoard[y][x].adjacentMines === 0 && !newBoard[y][x].isMine) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                revealCell(newBoard, x + dx, y + dy);
            }
        }
    }

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
            status: cell.isMine ? CELL_STATUS.REVEALED : cell.status
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
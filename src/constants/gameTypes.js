/**
 * Enum representing the possible states of a cell in the Minesweeper game board.
 * 
 * @readonly
 * @enum {string}
 * @property {string} HIDDEN - Initial state of a cell, content not visible to player
 * @property {string} REVEALED - Cell has been clicked and its content is visible
 * @property {string} FLAGGED - Cell has been marked with a flag by the player
 */
export const CELL_STATUS = {
    HIDDEN: 'HIDDEN',
    REVEALED: 'REVEALED', 
    FLAGGED: 'FLAGGED'
};

/**
 * Enum representing the possible states of a Minesweeper game.
 * 
 * @readonly
 * @enum {string}
 * @property {string} PLAYING - Game is in progress
 * @property {string} WON - Game has ended with player victory (all non-mine cells revealed)
 * @property {string} LOST - Game has ended with player defeat (mine was revealed)
 */
export const GAME_STATUS = {
    PLAYING: 'PLAYING',
    WON: 'WON',
    LOST: 'LOST'
}; 
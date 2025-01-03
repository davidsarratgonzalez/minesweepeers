/**
 * Array of predefined colors for peer identification in the application
 * Each color object contains:
 * @property {string} id - Unique identifier for the color
 * @property {string} value - Hexadecimal color value
 * @property {string} name - Human-readable color name
 */
export const PEER_COLORS = [
    { id: 'red', value: '#E53935', name: 'Red' },
    { id: 'blue', value: '#1E88E5', name: 'Blue' },
    { id: 'green', value: '#43A047', name: 'Green' },
    { id: 'orange', value: '#FB8C00', name: 'Orange' },
    { id: 'purple', value: '#8E24AA', name: 'Purple' },
    { id: 'pink', value: '#D81B60', name: 'Pink' },
    { id: 'brown', value: '#8B4513', name: 'Brown' },
    { id: 'black', value: '#404040', name: 'Black' },
];

/**
 * Returns a random color object from the PEER_COLORS array
 * @returns {Object} A randomly selected color object containing id, value and name
 */
export const getRandomColor = () => {
    return PEER_COLORS[Math.floor(Math.random() * PEER_COLORS.length)];
}; 
export const PEER_COLORS = [
    // First row
    { id: 'red', value: '#E53935', name: 'Red' },
    { id: 'blue', value: '#1E88E5', name: 'Blue' },
    { id: 'green', value: '#43A047', name: 'Green' },
    { id: 'orange', value: '#FB8C00', name: 'Orange' },
    // Second row
    { id: 'purple', value: '#8E24AA', name: 'Purple' },
    { id: 'pink', value: '#D81B60', name: 'Pink' },
    { id: 'brown', value: '#8B4513', name: 'Brown' },
    { id: 'black', value: '#404040', name: 'Black' },
];

export const getRandomColor = () => {
    return PEER_COLORS[Math.floor(Math.random() * PEER_COLORS.length)];
}; 
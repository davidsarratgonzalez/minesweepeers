export const PEER_COLORS = [
    // First row
    { id: 'red', value: '#E53935', name: 'Red' },
    { id: 'blue', value: '#1E88E5', name: 'Blue' },
    { id: 'green', value: '#43A047', name: 'Green' },
    { id: 'yellow', value: '#FDD835', name: 'Yellow' },
    // Second row
    { id: 'purple', value: '#8E24AA', name: 'Purple' },
    { id: 'orange', value: '#FB8C00', name: 'Orange' },
    { id: 'cyan', value: '#00ACC1', name: 'Cyan' },
    { id: 'pink', value: '#D81B60', name: 'Pink' },
];

export const getRandomColor = () => {
    return PEER_COLORS[Math.floor(Math.random() * PEER_COLORS.length)];
}; 
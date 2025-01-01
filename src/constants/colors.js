export const PEER_COLORS = [
    { id: 'blue', value: '#2196F3', name: 'Blue' },
    { id: 'green', value: '#4CAF50', name: 'Green' },
    { id: 'purple', value: '#9C27B0', name: 'Purple' },
    { id: 'orange', value: '#FF9800', name: 'Orange' },
    { id: 'pink', value: '#E91E63', name: 'Pink' },
    { id: 'teal', value: '#009688', name: 'Teal' },
    { id: 'red', value: '#f44336', name: 'Red' },
    { id: 'indigo', value: '#3F51B5', name: 'Indigo' }
];

export const getRandomColor = () => {
    return PEER_COLORS[Math.floor(Math.random() * PEER_COLORS.length)];
}; 
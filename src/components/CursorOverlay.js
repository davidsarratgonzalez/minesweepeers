import React from 'react';
import './CursorOverlay.css';

/**
 * CursorOverlay Component - Displays real-time cursor positions of connected users
 * 
 * @component
 * @param {Object} props - Component properties
 * @param {Object} props.cursors - Object mapping peer IDs to cursor positions
 * @param {number} props.cursors[].x - Normalized X coordinate (0-1) of cursor position
 * @param {number} props.cursors[].y - Normalized Y coordinate (0-1) of cursor position
 * @param {boolean} props.cursors[].isInCanvas - Whether cursor is currently within canvas bounds
 * @param {Map} props.connectedUsers - Map of connected users and their information
 * @returns {JSX.Element} Overlay displaying cursor positions and user names
 */
const CursorOverlay = ({ cursors, connectedUsers }) => {
    return (
        <div className="cursor-overlay">
            {/* Map through cursor positions and render cursor indicators */}
            {Object.entries(cursors).map(([peerId, position]) => {
                // Skip rendering if cursor is outside canvas bounds
                if (!position.isInCanvas) return null;
                
                // Get user info from connected users map
                const user = connectedUsers.get(peerId);
                if (!user) return null;

                return (
                    <div
                        key={peerId}
                        className="peer-cursor"
                        style={{
                            // Convert normalized coordinates to percentage positions
                            left: `${position.x * 100}%`,
                            top: `${position.y * 100}%`,
                            backgroundColor: user.color.value
                        }}
                    >
                        {/* Display user name above cursor with matching color */}
                        <span className="cursor-name" style={{ backgroundColor: user.color.value }}>
                            {user.name}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export default CursorOverlay;
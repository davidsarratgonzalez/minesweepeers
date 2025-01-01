import React from 'react';
import './CursorOverlay.css';

const CursorOverlay = ({ cursors, connectedUsers }) => {
    return (
        <div className="cursor-overlay">
            {Object.entries(cursors).map(([peerId, position]) => {
                if (!position.isInCanvas) return null;
                const user = connectedUsers.get(peerId);
                if (!user) return null;

                return (
                    <div
                        key={peerId}
                        className="peer-cursor"
                        style={{
                            left: `${position.x * 100}%`,
                            top: `${position.y * 100}%`,
                            backgroundColor: user.color.value
                        }}
                    >
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
import React, { useState } from 'react';
import { PEER_COLORS, getRandomColor } from '../constants/colors';
import './UserSetup.css';

/**
 * Component for setting up user name and color before joining the network
 */
const UserSetup = ({ onComplete }) => {
    const [name, setName] = useState('');
    const [selectedColor, setSelectedColor] = useState(getRandomColor());

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onComplete({
                name: name.trim(),
                color: selectedColor
            });
        }
    };

    return (
        <div className="user-setup">
            <h2>Set Up Your Profile</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="username">Your Name</label>
                    <input
                        id="username"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                        required
                        autoFocus
                    />
                </div>

                <div className="form-group">
                    <label>Choose Your Color</label>
                    <div className="color-options">
                        {PEER_COLORS.map(color => (
                            <button
                                key={color.id}
                                type="button"
                                className={`color-option ${selectedColor.id === color.id ? 'selected' : ''}`}
                                style={{ backgroundColor: color.value }}
                                onClick={() => setSelectedColor(color)}
                                title={color.name}
                            />
                        ))}
                    </div>
                </div>

                <button type="submit" className="submit-button" disabled={!name.trim()}>
                    Join Network
                </button>
            </form>
        </div>
    );
};

export default UserSetup; 
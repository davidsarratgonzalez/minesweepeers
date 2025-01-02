import React, { useState } from 'react';
import { PEER_COLORS, getRandomColor } from '../constants/colors';
import './UserSetup.css';

/**
 * UserSetup Component
 * 
 * Initial setup component that allows users to customize their profile before joining 
 * the multiplayer Minesweeper game. Users can set their display name and select a 
 * color that will represent them during gameplay.
 * 
 * Features:
 * - Username input with validation
 * - Color selection from predefined palette
 * - Random initial color assignment
 * - Form submission handling
 * 
 * @component
 * @param {Object} props
 * @param {Function} props.onComplete - Callback function invoked when setup is complete,
 *                                     receives user profile object with name and color
 */
const UserSetup = ({ onComplete }) => {
    // State for user's name and selected color
    const [name, setName] = useState('');
    const [selectedColor, setSelectedColor] = useState(getRandomColor());

    /**
     * Handles the form submission event.
     * Validates and processes the user's profile information.
     * 
     * @param {Event} e - Form submission event
     */
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
            <h1 data-testid="user-setup-header">Minesweepeers</h1>
            <form onSubmit={handleSubmit}>
                {/* Username input section */}
                <div className="form-group">
                    <label htmlFor="username">Your name</label>
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

                {/* Color selection section */}
                <div className="form-group">
                    <label>Choose your color</label>
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

                {/* Submit button - disabled if name is empty */}
                <button type="submit" className="submit-button" disabled={!name.trim()}>
                    Ready to play!
                </button>
            </form>

            {/* Credits footer */}
            <div className="credits">
                <a 
                    href="https://davidsarratgonzalez.github.io" 
                    target="_blank" 
                    rel="noopener noreferrer"
                >
                    Made with ❤️ by <strong>David Sarrat González</strong>
                </a>
            </div>
        </div>
    );
};

export default UserSetup;
import React, { useState, useEffect } from 'react';
import './GameConfig.css';

const PRESETS = {
    beginner: {
        name: 'Beginner',
        width: 9,
        height: 9,
        bombs: 10,
        timer: { enabled: true, minutes: 5, seconds: 0 }
    },
    intermediate: {
        name: 'Intermediate',
        width: 16,
        height: 16,
        bombs: 40,
        timer: { enabled: true, minutes: 10, seconds: 0 }
    },
    expert: {
        name: 'Expert',
        width: 30,
        height: 16,
        bombs: 99,
        timer: { enabled: true, minutes: 15, seconds: 0 }
    }
};

const MIN_SIZE = 5;
const MAX_SIZE = 50;
const MIN_BOMBS = 1;
const MAX_BOMBS_PERCENTAGE = 0.35; // Maximum 35% of cells can be bombs

const GameConfig = ({ onStartGame, onConfigChange, initialConfig }) => {
    const [preset, setPreset] = useState('beginner');
    const [config, setConfig] = useState({
        ...PRESETS.beginner,
        selectedPreset: 'beginner'
    });
    const [errors, setErrors] = useState({});
    const [inputValues, setInputValues] = useState({
        width: PRESETS.beginner.width.toString(),
        height: PRESETS.beginner.height.toString(),
        bombs: PRESETS.beginner.bombs.toString(),
        minutes: PRESETS.beginner.timer.minutes.toString(),
        seconds: PRESETS.beginner.timer.seconds.toString()
    });

    // Update local config when receiving new config from peers
    useEffect(() => {
        if (initialConfig) {
            setConfig(initialConfig);
            setPreset(initialConfig.selectedPreset);
            // Update input values
            setInputValues({
                width: initialConfig.width.toString(),
                height: initialConfig.height.toString(),
                bombs: initialConfig.bombs.toString(),
                minutes: initialConfig.timer.minutes.toString(),
                seconds: initialConfig.timer.seconds.toString()
            });
        }
    }, [initialConfig]);

    const validateConfig = (newConfig) => {
        const errors = {};
        const totalCells = newConfig.width * newConfig.height;
        const maxBombs = Math.min(
            Math.floor(totalCells * MAX_BOMBS_PERCENTAGE),
            totalCells - 9
        );

        // Only validate if there's a value
        if (newConfig.width) {
            if (newConfig.width < MIN_SIZE) errors.width = `Width must be at least ${MIN_SIZE}`;
            if (newConfig.width > MAX_SIZE) errors.width = `Width must be at most ${MAX_SIZE}`;
        }
        if (newConfig.height) {
            if (newConfig.height < MIN_SIZE) errors.height = `Height must be at least ${MIN_SIZE}`;
            if (newConfig.height > MAX_SIZE) errors.height = `Height must be at most ${MAX_SIZE}`;
        }
        if (newConfig.bombs) {
            if (newConfig.bombs < MIN_BOMBS) {
                errors.bombs = `Must have at least ${MIN_BOMBS} bomb`;
            } else if (newConfig.bombs > maxBombs) {
                errors.bombs = `Maximum ${maxBombs} bombs allowed for this board size`;
            }
        }

        if (newConfig.timer.enabled) {
            if (newConfig.timer.minutes < 0) errors.minutes = "Minutes can't be negative";
            if (newConfig.timer.minutes > 99) errors.minutes = "Maximum 99 minutes allowed";
            if (newConfig.timer.seconds < 0) errors.seconds = "Seconds can't be negative";
            if (newConfig.timer.seconds > 59) errors.seconds = "Maximum 59 seconds allowed";
            if (newConfig.timer.minutes === 0 && newConfig.timer.seconds === 0) {
                errors.timer = "Timer must be greater than 0";
            }
        }

        return errors;
    };

    useEffect(() => {
        setErrors(validateConfig(config));
    }, [config]);

    const handlePresetChange = (presetKey) => {
        const newPreset = presetKey === 'custom' ? config : PRESETS[presetKey];
        const newConfig = {
            ...newPreset,
            selectedPreset: presetKey
        };
        
        setPreset(presetKey);
        setConfig(newConfig);
        setInputValues({
            width: newPreset.width.toString(),
            height: newPreset.height.toString(),
            bombs: newPreset.bombs.toString(),
            minutes: newPreset.timer.minutes.toString(),
            seconds: newPreset.timer.seconds.toString()
        });
        
        onConfigChange(newConfig); // Notify peers of the preset change
    };

    const handleConfigChange = (field, value) => {
        let newInputValues = { ...inputValues };
        let newConfig = { ...config };

        // Update input values first
        if (field === 'timer.enabled') {
            newConfig.timer = { ...newConfig.timer, enabled: value };
        } else if (field === 'timer.minutes' || field === 'timer.seconds') {
            const [parent, child] = field.split('.');
            newInputValues[child] = value;
            const parsedValue = value === '' ? 0 : parseInt(value);
            if (!isNaN(parsedValue)) {
                newConfig[parent] = { ...newConfig[parent], [child]: parsedValue };
            }
        } else {
            newInputValues[field] = value;
            const parsedValue = value === '' ? 0 : parseInt(value);
            if (!isNaN(parsedValue)) {
                newConfig[field] = parsedValue;
            }
        }

        // Set as custom preset when modifying values
        if (field !== 'timer.enabled') {
            newConfig.selectedPreset = 'custom';
            setPreset('custom');
        }

        setInputValues(newInputValues);
        setConfig(newConfig);
        onConfigChange(newConfig);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const validationErrors = validateConfig(config);
        if (Object.keys(validationErrors).length === 0) {
            onStartGame(config);
        }
    };

    const maxBombs = Math.min(
        Math.floor(config.width * config.height * MAX_BOMBS_PERCENTAGE),
        config.width * config.height - 9
    );

    return (
        <div className="game-config">
            <h2>Minesweeper Setup</h2>
            
            <div className="presets">
                <h3>Presets</h3>
                <div className="preset-buttons">
                    {Object.entries(PRESETS).map(([key, value]) => (
                        <button
                            key={key}
                            className={`preset-button ${preset === key ? 'selected' : ''}`}
                            onClick={() => handlePresetChange(key)}
                        >
                            {value.name}
                        </button>
                    ))}
                    <button
                        className={`preset-button ${preset === 'custom' ? 'selected' : ''}`}
                        onClick={() => handlePresetChange('custom')}
                    >
                        Custom
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="config-form">
                <div className="config-group">
                    <h3>Board Size</h3>
                    <div className="input-row">
                        <label>
                            Width:
                            <input
                                type="number"
                                min={MIN_SIZE}
                                max={MAX_SIZE}
                                value={inputValues.width}
                                onChange={(e) => handleConfigChange('width', e.target.value)}
                            />
                            {errors.width && <span className="error">{errors.width}</span>}
                        </label>
                        <label>
                            Height:
                            <input
                                type="number"
                                min={MIN_SIZE}
                                max={MAX_SIZE}
                                value={inputValues.height}
                                onChange={(e) => handleConfigChange('height', e.target.value)}
                            />
                            {errors.height && <span className="error">{errors.height}</span>}
                        </label>
                    </div>
                </div>

                <div className="config-group">
                    <h3>Bombs</h3>
                    <div className="input-row">
                        <label>
                            Number of bombs:
                            <input
                                type="number"
                                min={MIN_BOMBS}
                                max={maxBombs}
                                value={inputValues.bombs}
                                onChange={(e) => handleConfigChange('bombs', e.target.value)}
                            />
                            {errors.bombs && <span className="error">{errors.bombs}</span>}
                        </label>
                    </div>
                    <div className="info-text">
                        Maximum bombs: {maxBombs} ({Math.round(MAX_BOMBS_PERCENTAGE * 100)}% of cells)
                    </div>
                </div>

                <div className="config-group">
                    <h3>Timer</h3>
                    <div className="input-row">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={config.timer.enabled}
                                onChange={(e) => handleConfigChange('timer.enabled', e.target.checked)}
                            />
                            Enable timer
                        </label>
                    </div>
                    {config.timer.enabled && (
                        <div className="input-row">
                            <label>
                                Minutes:
                                <input
                                    type="number"
                                    min="0"
                                    max="99"
                                    value={inputValues.minutes}
                                    onChange={(e) => handleConfigChange('timer.minutes', e.target.value)}
                                />
                                {errors.minutes && <span className="error">{errors.minutes}</span>}
                            </label>
                            <label>
                                Seconds:
                                <input
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={inputValues.seconds}
                                    onChange={(e) => handleConfigChange('timer.seconds', e.target.value)}
                                />
                                {errors.seconds && <span className="error">{errors.seconds}</span>}
                            </label>
                        </div>
                    )}
                    {errors.timer && <div className="error">{errors.timer}</div>}
                </div>

                <button 
                    type="submit" 
                    className="start-button"
                    disabled={Object.keys(errors).length > 0}
                >
                    Start Game
                </button>
            </form>
        </div>
    );
};

export default GameConfig; 
import React, { useState, useEffect } from 'react';
import './GameConfig.css';

/**
 * Predefined game configurations for different difficulty levels
 * Each preset contains board dimensions, number of bombs, and timer settings
 */
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

// Game board constraints
const MIN_SIZE = 5;
const MAX_SIZE = 50;
const MIN_BOMBS = 1;
const MAX_BOMBS_PERCENTAGE = 0.35; // Maximum 35% of cells can be bombs

/**
 * GameConfig Component - Provides configuration interface for Minesweeper game settings
 * 
 * @component
 * @param {Object} props - Component properties
 * @param {Function} props.onStartGame - Callback triggered when game starts with final configuration
 * @param {Function} props.onConfigChange - Callback for notifying configuration changes to peers
 * @param {Object} props.initialConfig - Initial configuration received from peers
 * @returns {JSX.Element} Game configuration form interface
 */
const GameConfig = ({ onStartGame, onConfigChange, initialConfig }) => {
    // State for tracking selected preset and configuration values
    const [preset, setPreset] = useState('beginner');
    const [config, setConfig] = useState({
        selectedPreset: 'beginner',
        width: PRESETS.beginner.width,
        height: PRESETS.beginner.height,
        bombs: PRESETS.beginner.bombs,
        timer: {
            enabled: true,
            minutes: 5,
            seconds: 0
        }
    });
    const [errors, setErrors] = useState({});
    const [inputValues, setInputValues] = useState({
        width: PRESETS.beginner.width.toString(),
        height: PRESETS.beginner.height.toString(),
        bombs: PRESETS.beginner.bombs.toString(),
        minutes: PRESETS.beginner.timer.minutes.toString(),
        seconds: PRESETS.beginner.timer.seconds.toString()
    });

    /**
     * Synchronizes local configuration with peer configuration
     */
    useEffect(() => {
        if (initialConfig) {
            setConfig(initialConfig);
            setPreset(initialConfig.selectedPreset);
            setInputValues({
                width: initialConfig.width.toString(),
                height: initialConfig.height.toString(),
                bombs: initialConfig.bombs.toString(),
                minutes: initialConfig.timer.minutes.toString(),
                seconds: initialConfig.timer.seconds.toString()
            });
        }
    }, [initialConfig]);

    /**
     * Validates game configuration parameters
     * Checks board dimensions, bomb count, and timer settings
     * 
     * @param {Object} newConfig - Configuration to validate
     * @returns {Object} Validation errors for each invalid field
     */
    const validateConfig = (newConfig) => {
        const errors = {};
        const width = parseInt(newConfig.width || MIN_SIZE.toString());
        const height = parseInt(newConfig.height || MIN_SIZE.toString());
        const bombs = parseInt(newConfig.bombs);
        const minutes = parseInt(newConfig.timer.minutes);
        const seconds = parseInt(newConfig.timer.seconds);

        // Validate width if provided
        if (newConfig.width !== '') {
            if (isNaN(width) || width < MIN_SIZE || width > MAX_SIZE) {
                errors.width = `Width must be between ${MIN_SIZE} and ${MAX_SIZE}`;
            }
        }

        // Validate height if provided
        if (newConfig.height !== '') {
            if (isNaN(height) || height < MIN_SIZE || height > MAX_SIZE) {
                errors.height = `Height must be between ${MIN_SIZE} and ${MAX_SIZE}`;
            }
        }

        // Only validate bombs if there are no size errors
        if (newConfig.bombs !== '' && !errors.width && !errors.height) {
            const maxBombs = Math.floor(width * height * MAX_BOMBS_PERCENTAGE);
            if (isNaN(bombs) || bombs < MIN_BOMBS || bombs > maxBombs) {
                errors.bombs = `Bombs must be between ${MIN_BOMBS} and ${maxBombs}`;
            }
        }

        if (newConfig.timer.enabled) {
            if (newConfig.timer.minutes !== '') {
                if (isNaN(minutes) || minutes < 0 || minutes > 99) {
                    errors.timer = 'Minutes must be between 0 and 99';
                }
            }
            if (newConfig.timer.seconds !== '') {
                if (isNaN(seconds) || seconds < 0 || seconds > 59) {
                    errors.timer = 'Seconds must be between 0 and 59';
                }
            }
            
            const totalSeconds = (parseInt(newConfig.timer.minutes || '0') * 60) + 
                                parseInt(newConfig.timer.seconds || '0');
            
            if (totalSeconds <= 0) {
                errors.timer = 'Timer must be over 0 seconds';
            }
        }

        return errors;
    };

    /**
     * Updates validation errors when configuration changes
     */
    useEffect(() => {
        setErrors(validateConfig(config));
    }, [config]);

    /**
     * Handles preset selection changes
     * Updates configuration and input values to match selected preset
     * 
     * @param {string} presetKey - Key of selected preset
     */
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
        
        onConfigChange(newConfig);
    };

    /**
     * Handles individual configuration field changes
     * Switches to custom preset mode when any value is modified
     * 
     * @param {string} field - Name of configuration field to update
     * @param {string|boolean} value - New value for the field
     */
    const handleConfigChange = (field, value) => {
        if (preset !== 'custom') {
            setPreset('custom');
        }

        let newConfig;
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            newConfig = {
                ...config,
                selectedPreset: 'custom',
                [parent]: {
                    ...config[parent],
                    [child]: value
                }
            };
            
            setInputValues(prev => ({
                ...prev,
                [child]: value
            }));
        } else {
            newConfig = {
                ...config,
                selectedPreset: 'custom',
                [field]: value
            };
            
            setInputValues(prev => ({
                ...prev,
                [field]: value
            }));
        }

        const newErrors = validateConfig(newConfig);
        setErrors(newErrors);
        setConfig(newConfig);
        onConfigChange?.(newConfig);
    };

    /**
     * Checks if configuration has all required values set
     * 
     * @param {Object} config - Configuration to check
     * @returns {boolean} Whether configuration is complete
     */
    const isConfigComplete = (config) => {
        const hasValidDimensions = config.width && config.height && 
            parseInt(config.width) >= MIN_SIZE && 
            parseInt(config.height) >= MIN_SIZE;
        
        const hasValidBombs = config.bombs && 
            parseInt(config.bombs) >= MIN_BOMBS;

        const hasValidTimer = !config.timer.enabled || 
            (config.timer.minutes || config.timer.seconds);

        return hasValidDimensions && hasValidBombs && hasValidTimer;
    };

    /**
     * Handles form submission
     * Applies default values for any missing fields before starting game
     * 
     * @param {Event} e - Form submission event
     */
    const handleSubmit = (e) => {
        e.preventDefault();
        
        const finalConfig = {
            ...config,
            width: parseInt(config.width) || MIN_SIZE,
            height: parseInt(config.height) || MIN_SIZE,
            bombs: parseInt(config.bombs) || MIN_BOMBS,
            timer: {
                ...config.timer,
                minutes: parseInt(config.timer.minutes) || 0,
                seconds: parseInt(config.timer.seconds) || 0
            }
        };

        onStartGame(finalConfig);
    };

    // Calculate maximum allowed bombs based on current board dimensions
    const width = parseInt(config.width) || MIN_SIZE;
    const height = parseInt(config.height) || MIN_SIZE;
    const maxBombs = Math.min(
        Math.floor(width * height * MAX_BOMBS_PERCENTAGE),
        width * height - 9
    );

    return (
        <div className="game-config">
            <h2>Game rules</h2>
            
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
                    <h3>Board size</h3>
                    <div className="input-row">
                        <label>
                            Width:
                            <input
                                type="number"
                                value={inputValues.width}
                                onChange={(e) => handleConfigChange('width', e.target.value)}
                                placeholder={MIN_SIZE.toString()}
                            />
                        </label>
                        <label>
                            Height:
                            <input
                                type="number"
                                value={inputValues.height}
                                onChange={(e) => handleConfigChange('height', e.target.value)}
                                placeholder={MIN_SIZE.toString()}
                            />
                        </label>
                    </div>
                    {(errors.width || errors.height) && (
                        <div className="error-container">
                            {errors.width && <div className="error">{errors.width}</div>}
                            {errors.height && <div className="error">{errors.height}</div>}
                        </div>
                    )}
                </div>

                <div className="config-group">
                    <h3>Bombs</h3>
                    <div className="input-row">
                        <label>
                            Number of bombs:
                            <input
                                type="number"
                                value={inputValues.bombs}
                                onChange={(e) => handleConfigChange('bombs', e.target.value)}
                                placeholder={MIN_BOMBS.toString()}
                            />
                        </label>
                    </div>
                    {!errors.width && !errors.height && (
                        <div className="info-text">
                            Maximum bombs: {maxBombs} ({Math.round(MAX_BOMBS_PERCENTAGE * 100)}% of cells)
                        </div>
                    )}
                    {errors.bombs && <div className="error">{errors.bombs}</div>}
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
                                    value={inputValues.minutes}
                                    onChange={(e) => handleConfigChange('timer.minutes', e.target.value)}
                                    placeholder="0"
                                />
                                {errors.minutes && <span className="error">{errors.minutes}</span>}
                            </label>
                            <label>
                                Seconds:
                                <input
                                    type="number"
                                    value={inputValues.seconds}
                                    onChange={(e) => handleConfigChange('timer.seconds', e.target.value)}
                                    placeholder="0"
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

export default GameConfig;
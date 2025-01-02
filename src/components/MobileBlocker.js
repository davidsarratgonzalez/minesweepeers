import React, { useEffect } from 'react';
import './MobileBlocker.css';

/**
 * MobileBlocker Component
 * 
 * A full-screen overlay component that prevents mobile users from accessing the application.
 * This is necessary because the game requires precise mouse interactions and desktop-specific
 * features that are not available or optimal on mobile devices.
 * 
 * Key features:
 * - Displays a user-friendly message explaining desktop-only requirement
 * - Prevents page scrolling on mobile devices via CSS class management
 * - Provides a link to the source code repository for transparency
 * - Uses Font Awesome icons for visual enhancement
 * 
 * @component
 * @returns {JSX.Element} A full-screen overlay with mobile blocking message
 */
const MobileBlocker = () => {
  /**
   * Manages the mobile blocking state by adding/removing a CSS class on the document body
   * The class prevents scrolling while the blocker is active
   * 
   * The cleanup function ensures the class is removed when component unmounts
   * to prevent any lingering scroll-blocking effects
   */
  useEffect(() => {
    document.body.classList.add('mobile-blocked');
    
    return () => {
      document.body.classList.remove('mobile-blocked');
    };
  }, []);

  return (
    <div className="mobile-blocker">
      <div className="mobile-blocker-content">
        <i className="fas fa-desktop"></i>
        <h1>Desktop only!</h1>
        <p>This game is designed for desktop use only. Please access it from a desktop computer.</p>
        <a 
          href="https://github.com/davidsarratgonzalez/minesweepeers"
          target="_blank"
          rel="noopener noreferrer"
          className="repo-link"
        >
          <i className="fab fa-github"></i>
          View repository
        </a>
      </div>
    </div>
  );
};

export default MobileBlocker;
import React from 'react';
import { Sun, Moon, Laptop, Shield, ArrowLeft } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface AppHeaderProps {
  onBackToIntro: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onBackToIntro }) => {
  const { mode, setMode } = useTheme();

  return (
    <header className="app-header" role="banner">
      <div className="header-brand">
        <div className="brand-icon-wrapper" aria-hidden="true">
          <Shield size={24} />
        </div>
        <div className="brand-title-group">
          <div className="brand-names">
            <span className="brand-hindi" lang="hi">छाँव</span>
            <span className="brand-divider">/</span>
            <span className="brand-english">CHHAON</span>
          </div>
          <span className="brand-subtitle">
            Heat-risk screening & actionable outdoor work safety guidance
          </span>
        </div>
      </div>

      <div className="header-actions">
        {/* Navigation back to introduction */}
        <button
          type="button"
          className="back-to-intro-btn"
          onClick={onBackToIntro}
          title="Return to cinematic landing page"
          aria-label="Return to overview"
        >
          <ArrowLeft size={16} />
          <span>Overview</span>
        </button>

        {/* Theme Selector: System, Light, Dark */}
        <div className="theme-selector" role="radiogroup" aria-label="Theme Selector">
          <button
            type="button"
            className={`theme-opt-btn ${mode === 'system' ? 'active' : ''}`}
            onClick={() => setMode('system')}
            role="radio"
            aria-checked={mode === 'system'}
            title="System theme (matches device settings)"
          >
            <Laptop size={14} />
            <span>System</span>
          </button>
          <button
            type="button"
            className={`theme-opt-btn ${mode === 'light' ? 'active' : ''}`}
            onClick={() => setMode('light')}
            role="radio"
            aria-checked={mode === 'light'}
            title="Light theme"
          >
            <Sun size={14} />
            <span>Light</span>
          </button>
          <button
            type="button"
            className={`theme-opt-btn ${mode === 'dark' ? 'active' : ''}`}
            onClick={() => setMode('dark')}
            role="radio"
            aria-checked={mode === 'dark'}
            title="Dark theme"
          >
            <Moon size={14} />
            <span>Dark</span>
          </button>
        </div>
      </div>
    </header>
  );
};

import React, { useState } from 'react';
import fallbackSvg from '../assets/hero-fallback.svg';

interface CinematicIntroProps {
  onEnter: () => void;
}

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ onEnter }) => {
  const [imageSrc, setImageSrc] = useState<string>('/hero-worksite.jpg');

  const handleImageError = () => {
    // Graceful fallback to SVG illustration if local/network jpg cannot be loaded
    setImageSrc(fallbackSvg);
  };

  return (
    <main className="intro-container" aria-label="CHHAON Landing Screen">
      {/* Background photograph with graceful fallback */}
      <div className="intro-backdrop" aria-hidden="true">
        <img
          src={imageSrc}
          alt="Outdoor worksite in warm late afternoon sunlight"
          className="intro-backdrop-image"
          onError={handleImageError}
        />
        {/* Subtle overlay gradient scrim for text readability without obscuring worker on the right */}
        <div className="intro-gradient-scrim" />
        <div className="intro-atmosphere-vignette" />
      </div>

      <div className="intro-content-wrapper">
        <article className="intro-text-column">
          {/* Eyebrow */}
          <span className="intro-eyebrow">A SAFER WAY TO PLAN OUTDOOR WORK</span>

          {/* Bilingual Titles */}
          <header className="intro-titles">
            <h1 className="intro-hindi-title" lang="hi">छाँव</h1>
            <h2 className="intro-english-title">CHHAON</h2>
          </header>

          {/* Bilingual Taglines */}
          <div className="intro-taglines">
            <p className="intro-hindi-tagline" lang="hi">धूप में सुरक्षा, हर कदम पर छाँव।</p>
            <p className="intro-english-tagline">Protection in the sun. Shade at every step.</p>
          </div>

          {/* Concise What We Do */}
          <p className="intro-what-we-do">
            We turn location-specific weather and work conditions into understandable heat-risk assessments and practical safety guidance for outdoor work.
          </p>

          {/* Three Compact Statements */}
          <ul className="intro-principles-list" aria-label="Core Capabilities">
            <li className="intro-principle-item">
              <span className="intro-principle-badge">1</span>
              <span>Assess local conditions.</span>
            </li>
            <li className="intro-principle-item">
              <span className="intro-principle-badge">2</span>
              <span>Compare possible work periods.</span>
            </li>
            <li className="intro-principle-item">
              <span className="intro-principle-badge">3</span>
              <span>Turn insights into practical precautions.</span>
            </li>
          </ul>

          {/* Primary CTA */}
          <div className="intro-cta-wrapper">
            <button
              type="button"
              id="enter-chhaon-btn"
              className="intro-primary-cta"
              onClick={onEnter}
              aria-label="Enter CHHAON workspace"
            >
              <span>Enter CHHAON</span>
              <span className="cta-arrow" aria-hidden="true">→</span>
            </button>
          </div>
        </article>
      </div>
    </main>
  );
};

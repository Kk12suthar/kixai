import React, { useRef } from 'react';
import { socials } from '../content';
import { useReveal } from '../lib/reveal';

const Credits: React.FC<{ onTop: () => void }> = ({ onTop }) => {
  const root = useRef<HTMLElement>(null);
  useReveal(root);

  return (
    <footer className="find" id="find" ref={root}>
      <h2 className="find-title" data-reveal="mask">
        <span className="mask">
          <span>
            Find <em>me.</em>
          </span>
        </span>
      </h2>
      <ul className="find-list" data-reveal="stagger">
        {socials.map((s) => (
          <li key={s.href}>
            <a
              className="find-link"
              href={s.href}
              target={s.href.startsWith('mailto:') ? undefined : '_blank'}
              rel="noreferrer"
            >
              <span className="find-label">{s.label}</span>
              <span className="find-handle">{s.handle}</span>
              <svg className="find-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3} aria-hidden="true">
                <path d="M6 18 18 6M8.5 6H18v9.5" />
              </svg>
            </a>
          </li>
        ))}
      </ul>
      <div className="credits-end">
        <span>© {new Date().getFullYear()} Kishor Kumar Suthar</span>
        <button type="button" onClick={onTop}>
          ↑ Back to top
        </button>
      </div>
    </footer>
  );
};

export default Credits;

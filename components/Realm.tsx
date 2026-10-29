import React, { useRef } from 'react';
import type { ThemeMode } from '../types';
import { ENGINEER_REALM_URL } from '../content';
import { useReveal } from '../lib/reveal';

const Realm: React.FC<{ mode: ThemeMode; onEnter: () => void }> = ({ onEnter }) => {
  const root = useRef<HTMLElement>(null);
  useReveal(root);

  return (
    <section className="realm" id="realm" ref={root}>
      <a
        className="realm-link"
        href={ENGINEER_REALM_URL}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey) return;
          e.preventDefault();
          onEnter();
        }}
        data-reveal="mask"
      >
        <span className="mask small">
          <span>The</span>
        </span>
        <span className="mask">
          <span className="big">
            Engineer Realm
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden="true">
              <path d="M5 19 19 5M8 5h11v11" />
            </svg>
          </span>
        </span>
      </a>
    </section>
  );
};

export default Realm;

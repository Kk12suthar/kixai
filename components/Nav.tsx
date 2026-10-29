import React, { useEffect, useState } from 'react';
import type { ThemeMode } from '../types';
import { ENGINEER_REALM_URL } from '../content';

interface NavProps {
  mode: ThemeMode;
  onToggle: (origin?: { x: number; y: number }) => void;
  onNavigate: (target: string) => void;
  onRealm: () => void;
}

const links = [
  { label: 'The cast', href: '#cast' },
  { label: 'Kurukshetra', href: '#gita' },
];

export const originOf = (e: React.MouseEvent<HTMLElement>) => {
  if (e.clientX || e.clientY) return { x: e.clientX, y: e.clientY };
  const r = e.currentTarget.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

const Nav: React.FC<NavProps> = ({ mode, onToggle, onNavigate, onRealm }) => {
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setNameOpen(false), 4200);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setSolid(y > 40);
      setHidden(y > lastY + 2 && y > window.innerHeight * 0.6 && !open);
      if (y < lastY - 2) setHidden(false);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [open]);

  const go = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setOpen(false);
    onNavigate(href);
  };

  const isLight = mode === 'calm';

  return (
    <header className={`nav ${solid ? 'is-solid' : ''} ${hidden ? 'is-hidden' : ''}`}>
      <a
        href="#top"
        className={`logo ${nameOpen ? 'is-open' : ''}`}
        onClick={(e) => go(e, '#top')}
        aria-label="KiX, Kishor Kumar Suthar. Back to top"
      >
        <span className="logo-mark">
          Ki<b>X</b>
        </span>
        <span className="logo-name">Kishor Kumar Suthar</span>
      </a>

      <nav aria-label="Sections">
        <ul className={`nav-links ${open ? 'is-open' : ''}`}>
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={(e) => go(e, l.href)}>
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <a
              href={ENGINEER_REALM_URL}
              onClick={(e) => {
                e.preventDefault();
                setOpen(false);
                onRealm();
              }}
            >
              Engineer Realm<sup>↗</sup>
            </a>
          </li>
        </ul>
      </nav>

      <div className="nav-right">
        <button
          type="button"
          className="mode"
          role="switch"
          aria-checked={isLight}
          aria-label={isLight ? 'Light side. Switch to the dark side' : 'Dark side. Switch to the light side'}
          onClick={(e) => onToggle(originOf(e))}
        >
          <span className="mode-label" aria-hidden="true">
            <span>Dark</span>
            <span>Light</span>
          </span>
          <span className="mode-orb" aria-hidden="true" />
        </button>
        <button type="button" className="menu-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? 'Close' : 'Menu'}
        </button>
      </div>
    </header>
  );
};

export default Nav;

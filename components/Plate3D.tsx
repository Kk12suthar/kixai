import React, { useEffect, useRef, useState } from 'react';
import type { SigilId } from '../content';
import { Sigil } from './Sigils';
import { reducedMotion } from '../lib/reveal';
import { mountPlate, platesSupported } from '../lib/plates';
import './plates.css';

/* The live plate for a chapter. Falls back to the line drawing when motion is
   turned down or there is no WebGL. */
const Plate3D: React.FC<{ id: SigilId }> = ({ id }) => {
  const host = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(() => !reducedMotion() && platesSupported());
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!live || !el) return;
    // the chapter's text moves with the plate's big moment
    const stage = el.closest<HTMLElement>('.ch');
    let last = -1;
    const onBeat = (b: number) => {
      if (!stage || Math.abs(b - last) < 0.004) return;
      last = b;
      stage.style.setProperty('--beat', b.toFixed(3));
    };
    try {
      return mountPlate(id, el, () => setShown(true), onBeat);
    } catch {
      setLive(false);
    }
  }, [id, live]);

  if (!live) return <Sigil id={id} />;
  return <div ref={host} className={`plate3d plate3d--${id} ${shown ? 'is-shown' : ''}`} aria-hidden="true" />;
};

export default Plate3D;

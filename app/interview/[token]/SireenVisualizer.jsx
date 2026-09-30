'use client';
import { useEffect, useRef } from 'react';

// Browser speech synthesis exposes lifecycle/word events, not an audio stream.
// These ribbons follow those events; microphone input is deliberately separate.
export default function SireenVisualizer({ speaking = false, pulse = 0, thinking = false }) {
  const canvas = useRef(null);
  const signal = useRef({ speaking, pulse, thinking });
  signal.current = { speaking, pulse, thinking };
  useEffect(() => {
    const node = canvas.current, ctx = node.getContext('2d');
    if (!ctx) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame, energy = 0, last = 0;
    const draw = time => {
      const width = node.clientWidth, height = node.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (node.width !== Math.round(width * dpr) || node.height !== Math.round(height * dpr)) { node.width = Math.round(width * dpr); node.height = Math.round(height * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
      const state = signal.current;
      const target = state.speaking ? .6 + .4 * Math.exp(-(time - state.pulse) / 220) : state.thinking ? .18 : .04;
      energy += (Math.min(1, target) - energy) * .09;
      const t = media.matches ? 0 : time / 1000;
      ctx.globalCompositeOperation = 'screen';
      ['#368bff', '#936bff', '#f27bc8', '#65e0dc'].forEach((color, layer) => {
        ctx.beginPath();
        for (let x = 0; x <= width; x += 2) {
          const n = x / width, envelope = Math.pow(Math.sin(n * Math.PI), 2);
          const wave = Math.sin(n * Math.PI * (3 + layer * .45) - t * (1.8 + layer * .4)) + .4 * Math.cos(n * Math.PI * 7 + t * 2 + layer);
          const y = height / 2 + wave * envelope * (10 + energy * 35) * (layer % 2 ? -1 : 1);
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.shadowColor = color; ctx.shadowBlur = 14; ctx.stroke();
        ctx.lineTo(width, height / 2); ctx.lineTo(0, height / 2); ctx.closePath(); ctx.globalAlpha = .12; ctx.fillStyle = color; ctx.fill(); ctx.globalAlpha = 1;
      });
      if (!media.matches && !document.hidden) frame = requestAnimationFrame(draw);
      last = time;
    };
    const restart = () => { cancelAnimationFrame(frame); draw(performance.now()); };
    media.addEventListener('change', restart); document.addEventListener('visibilitychange', restart);
    draw(last);
    return () => { cancelAnimationFrame(frame); media.removeEventListener('change', restart); document.removeEventListener('visibilitychange', restart); };
  }, []);
  return <div className="sireenVisualizer" data-speaking={speaking}><canvas ref={canvas} aria-hidden="true"/><span role="status">{speaking ? 'Sireen is speaking' : thinking ? 'Sireen is thinking' : 'Sireen is ready'}</span></div>;
}

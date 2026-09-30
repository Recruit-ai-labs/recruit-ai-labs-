'use client';
import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
export default function ScrollRevealText({ children }) {
  const ref = useRef(null), reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start .88', 'end .58'] });
  const words = children.split(' ');
  return <span ref={ref} className="legalRevealText" aria-label={children}>{words.map((word, i) => { const opacity = useTransform(scrollYProgress, [i / words.length, (i + 1) / words.length], [.16, 1]); return <motion.span key={`${word}-${i}`} aria-hidden="true" style={{ opacity: reduced ? 1 : opacity }}>{word}&nbsp;</motion.span>; })}</span>;
}

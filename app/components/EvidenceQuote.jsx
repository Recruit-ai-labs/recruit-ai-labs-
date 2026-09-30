'use client';
import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

const quote = 'Every ranked candidate should come with evidence. RecruitAI keeps match reasoning, application context and human decisions in one reviewable workflow.';
function Word({ word, index, total, progress, reduced }) {
  const opacity = useTransform(progress, [index / total, (index + 1) / total], [.16, 1]);
  return <motion.span style={{ opacity: reduced ? 1 : opacity }}>{word} </motion.span>;
}
export default function EvidenceQuote() {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start .85', 'end .55'] });
  const words = quote.split(' ');
  return <section ref={ref} className="principleQuote evidenceScroll"><div><small>THE RECRUIT AI PRINCIPLE</small><p>{words.map((word, index) => <Word key={index} word={word} index={index} total={words.length} progress={scrollYProgress} reduced={reduced}/>)}</p><span className="evidenceCaption">Better evidence. More confident decisions.</span></div></section>;
}

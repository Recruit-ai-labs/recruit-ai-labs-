'use client';
import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import styles from './DiscoveryTablet.module.css';

const candidates = [
  { initials: 'AM', name: 'Aarav Mehta', role: 'Product Designer', location: 'Bengaluru', skill: 'Design systems', score: 96 },
  { initials: 'RK', name: 'Rhea Kapoor', role: 'Senior UX Designer', location: 'Remote', skill: 'User research', score: 93 },
  { initials: 'KS', name: 'Kabir Sharma', role: 'Product Designer', location: 'Mumbai', skill: 'Product thinking', score: 89 },
];
export default function DiscoveryTablet() {
  const target = useRef(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target, offset: ['start end', 'center center'] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [60, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [65, 0]);
  return <div ref={target} className={styles.stage}>
    <motion.div className={styles.device} style={{ rotateX: reduced ? 0 : rotateX, y: reduced ? 0 : y }}>
      <div className={styles.camera} aria-hidden="true"/>
      <div className={styles.screen}>
        <div className={styles.toolbar}><div className={styles.brand}><span>R</span> Recruit AI <small>DISCOVERY</small></div><span className={styles.status}>Workspace preview</span></div>
        <div className={styles.content}>
          <div className={styles.heading}><div><span className={styles.eyebrow}>YOUR NEXT GREAT HIRE</span><h3>Talent discovery</h3></div><span className={styles.search}>⌕ <span>Search talent</span></span></div>
          <div className={styles.brief}><div><small>SEARCHING FOR</small><strong>Senior Product Designer</strong></div><span>5+ years</span><span>Design systems</span></div>
          <div className={styles.results}><div><strong>284</strong><span>matching profiles</span></div><small>Highest match first ↓</small></div>
          <div className={styles.list}>{candidates.map((candidate, index) => <div className={styles.row} key={candidate.initials}>
            <span className={styles.avatar} data-tone={index}>{candidate.initials}</span>
            <div className={styles.identity}><strong>{candidate.name}<span aria-label="Verified">✓</span></strong><small>{candidate.role} · {candidate.location}</small><span className={styles.skill}>{candidate.skill}</span></div>
            <div className={styles.score}><strong>{candidate.score}<small>%</small></strong><span>match</span></div>
          </div>)}</div>
          <div className={styles.insight}><span aria-hidden="true">✦</span><div><small>AI INSIGHT</small><strong>Strong portfolio signal</strong><p>Evidence across 3 shipped products</p></div><span className={styles.insightCheck}>✓</span></div>
          <div className={styles.bottom}><span>Illustrative candidate data</span><span>Evidence-led hiring ↗</span></div>
        </div>
      </div>
    </motion.div>
  </div>;
}

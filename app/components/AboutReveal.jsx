'use client';
import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

function RevealWords({ children, progress, start, end, className = '' }) {
  const words = children.split(' ');
  return <span className={className}>{words.map((word, index) => <RevealWord key={`${word}-${index}`} word={word} progress={progress} start={start + (end - start) * index / words.length} end={start + (end - start) * (index + 1) / words.length}/>)}</span>;
}

function RevealWord({ word, progress, start, end }) {
  const reduced = useReducedMotion();
  const opacity = useTransform(progress, [start, end], [.16, 1]);
  return <motion.span style={{ opacity: reduced ? 1 : opacity }}>{word}&nbsp;</motion.span>;
}

const roles = [
  ['Reviewable screening', 'Role evidence', 'WORKFLOW', 'Organize resume evidence against the requirements in a job description.'],
  ['Structured review', 'Candidate evidence', 'WORKFLOW', 'Keep application evidence and evaluation notes available for recruiter review.'],
  ['Human decisions', 'Hiring team', 'ACCOUNTABILITY', 'Keep the final hiring decision with the people responsible for the role.'],
];

export default function AboutReveal() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start .85', 'end .55'] });
  return <div ref={ref} className="aboutCopy aboutReveal">
    <p><RevealWords progress={scrollYProgress} start={0} end={.48} className="aboutLead">Recruit AI brings screening evidence, application review and candidate decisions into one hiring workspace.</RevealWords></p>
    <p><RevealWords progress={scrollYProgress} start={.48} end={1} className="aboutLead">Recruiters can review the evidence behind automated outputs and remain responsible for the final hiring decision.</RevealWords></p>
    <div className="timeline">{roles.map(([title, company, date, description]) => <article key={title} className="aboutMilestone"><p><b>{title}</b> <span className="aboutCompany">{company}</span><small>{date}</small></p><p>{description}</p></article>)}</div>
    <em>Recruit AI</em>
  </div>;
}

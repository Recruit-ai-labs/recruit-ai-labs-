'use client';
import { useRef } from 'react';
import { usePathname } from 'next/navigation';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function WorkspaceMotion({ children }) {
  const root = useRef(null), pathname = usePathname();
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const heading = root.current.querySelector('.pageHeading, .jobWorkspaceHeader, .dnaPageHeader, .deskHero');
      if (heading) gsap.from(heading, { y: 10, opacity: .4, duration: .45, ease: 'power2.out', clearProps: 'all' });
      const cards = root.current.querySelectorAll('.overviewMetrics > a, .overviewWorkGrid > section, .overviewShortcuts > a');
      if (cards.length) gsap.from(cards, { y: 16, opacity: .3, stagger: .055, duration: .5, ease: 'power2.out', clearProps: 'all' });
      const shortcuts = root.current.querySelector('.overviewShortcuts');
      if (shortcuts) gsap.from(shortcuts, { y: 14, duration: .5, clearProps: 'transform', scrollTrigger: { trigger: shortcuts, start: 'top 95%', once: true } });
    });
    return () => media.revert();
  }, { scope: root, dependencies: [pathname], revertOnUpdate: true });
  return <div ref={root} className="workspaceMotion">{children}</div>;
}

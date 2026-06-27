import { useEffect, useMemo, useRef, useState, type ReactNode, type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, ArrowUpRight, Star, GraduationCap, Building2, Briefcase, PenTool } from 'lucide-react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../components/ui/accordion';
import { Button } from '../components/ui/button';
import { courseService, type CourseDto } from '../services/courseService';
import { formatMoney } from '../lib/money';
import { cn } from '../lib/cn';

/* ============================================================================
   AcademiX landing — scroll-pinned isometric story (vectr-style), tailored to
   the academic domain. Pure CSS/SVG animation: no animation libraries, one
   rAF-throttled scroll listener, IntersectionObserver reveals. Respects
   prefers-reduced-motion.
   ========================================================================== */

const CHAPTER_IDS = ['author', 'enroll', 'learn', 'certify'] as const;
type ChapterId = (typeof CHAPTER_IDS)[number];

/** Total scroll segments: 1 hero + 4 chapters. */
const SEGMENTS = 1 + CHAPTER_IDS.length;

/* ----------------------------------------------------------------------------
   Scroll-reveal helper (IntersectionObserver → .lx-inview)
---------------------------------------------------------------------------- */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('lx-inview');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/* ----------------------------------------------------------------------------
   Count-up stat
---------------------------------------------------------------------------- */
function StatNumber({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced) {
          setDisplay(value);
          return;
        }
        const start = performance.now();
        const dur = 1400;
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplay(Math.round(value * eased));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);
  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl sm:text-5xl font-black tracking-tight tabular-nums">
        {display.toLocaleString()}
        <span className="text-primary">{suffix}</span>
      </div>
      <div className="mt-2 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Isometric scene primitives
---------------------------------------------------------------------------- */

function IsoCube({
  x,
  y,
  size = 60,
  height = 34,
  top = 'hsl(var(--card))',
  left = 'hsl(var(--muted))',
  right = 'hsl(var(--border))',
  stroke = 'hsl(var(--border))',
  className,
}: {
  x: number;
  y: number;
  size?: number;
  height?: number;
  top?: string;
  left?: string;
  right?: string;
  stroke?: string;
  className?: string;
}) {
  const w = size;
  const h = size * 0.5;
  return (
    <g transform={`translate(${x} ${y})`} className={className}>
      <path d={`M0 ${h / 2} L${w / 2} 0 L${w} ${h / 2} L${w / 2} ${h} Z`} fill={top} stroke={stroke} strokeWidth="1" />
      <path d={`M0 ${h / 2} L${w / 2} ${h} L${w / 2} ${h + height} L0 ${h / 2 + height} Z`} fill={left} stroke={stroke} strokeWidth="1" />
      <path d={`M${w} ${h / 2} L${w / 2} ${h} L${w / 2} ${h + height} L${w} ${h / 2 + height} Z`} fill={right} stroke={stroke} strokeWidth="1" />
    </g>
  );
}

/** Readable caption chip rendered inside SVG scenes. */
function Chip({
  x,
  y,
  label,
  accent = false,
  anchor = 'middle',
}: {
  x: number;
  y: number;
  label: string;
  accent?: boolean;
  anchor?: 'start' | 'middle' | 'end';
}) {
  const w = Math.max(64, label.length * 9 + 28);
  const rectX = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  return (
    <g>
      <rect
        x={rectX}
        y={y - 16}
        width={w}
        height={30}
        rx={15}
        fill={accent ? 'hsl(var(--primary))' : 'hsl(var(--card))'}
        stroke={accent ? 'transparent' : 'hsl(var(--primary) / 0.45)'}
        strokeWidth="1.2"
      />
      <text
        x={anchor === 'middle' ? x : anchor === 'end' ? x - w / 2 : x + w / 2}
        y={y + 4}
        textAnchor="middle"
        fontSize="15"
        fontWeight="700"
        fill={accent ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))'}
      >
        {label}
      </text>
    </g>
  );
}

/* ----------------------------------------------------------------------------
   Scenes — each labels itself so it reads at a glance
---------------------------------------------------------------------------- */

/** 01 — Author: lesson blocks assembling into a course, labelled content cards. */
function SceneAuthor() {
  const { t } = useTranslation(['public']);
  return (
    <svg viewBox="0 0 760 520" className="lx-scene-svg" aria-hidden="true">
      <ellipse cx="380" cy="420" rx="270" ry="64" fill="hsl(var(--primary) / 0.06)" />
      <IsoCube x={250} y={300} size={260} height={56} top="hsl(var(--primary) / 0.14)" left="hsl(var(--primary) / 0.22)" right="hsl(var(--primary) / 0.10)" stroke="hsl(var(--primary) / 0.35)" />
      <g className="lx-float" style={{ animationDelay: '0s' }}>
        <IsoCube x={300} y={230} size={160} height={40} top="hsl(var(--card))" left="hsl(var(--muted))" right="hsl(var(--accent))" stroke="hsl(var(--primary) / 0.4)" />
      </g>
      <g className="lx-float" style={{ animationDelay: '0.6s' }}>
        <IsoCube x={330} y={170} size={100} height={32} top="hsl(var(--primary) / 0.85)" left="hsl(var(--primary))" right="hsl(var(--primary) / 0.65)" stroke="transparent" />
      </g>
      <Chip x={380} y={452} label={t('public:landing.scenes.author.course')} accent />

      <g className="lx-float" style={{ animationDelay: '0.3s' }}>
        <rect x="106" y="130" width="116" height="78" rx="10" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <polygon points="152,152 152,178 176,165" fill="hsl(var(--primary))" />
        <text x="164" y="198" textAnchor="middle" fontSize="13" fontWeight="600" fill="hsl(var(--muted-foreground))">{t('public:landing.scenes.author.video')}</text>
      </g>
      <g className="lx-float" style={{ animationDelay: '0.9s' }}>
        <rect x="536" y="100" width="116" height="78" rx="10" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <line x1="556" y1="124" x2="632" y2="124" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round" />
        <line x1="556" y1="138" x2="612" y2="138" stroke="hsl(var(--muted-foreground) / 0.5)" strokeWidth="5" strokeLinecap="round" />
        <line x1="556" y1="152" x2="624" y2="152" stroke="hsl(var(--muted-foreground) / 0.5)" strokeWidth="5" strokeLinecap="round" />
        <text x="594" y="170" textAnchor="middle" fontSize="13" fontWeight="600" fill="hsl(var(--muted-foreground))">{t('public:landing.scenes.author.reading')}</text>
      </g>
      <g className="lx-float" style={{ animationDelay: '1.2s' }}>
        <rect x="586" y="244" width="110" height="74" rx="10" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <circle cx="612" cy="270" r="8" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" />
        <path d="M608 270 l3 3 l7 -8" stroke="hsl(var(--primary))" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <line x1="630" y1="268" x2="676" y2="268" stroke="hsl(var(--muted-foreground) / 0.5)" strokeWidth="5" strokeLinecap="round" />
        <line x1="630" y1="284" x2="664" y2="284" stroke="hsl(var(--muted-foreground) / 0.5)" strokeWidth="5" strokeLinecap="round" />
        <text x="641" y="308" textAnchor="middle" fontSize="13" fontWeight="600" fill="hsl(var(--muted-foreground))">{t('public:landing.scenes.author.quiz')}</text>
      </g>
      <g className="lx-float" style={{ animationDelay: '1.5s' }}>
        <rect x="92" y="288" width="148" height="64" rx="12" fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--primary) / 0.4)" />
        <text x="166" y="316" textAnchor="middle" fontSize="18" fontWeight="800" fill="hsl(var(--primary))">85% / 15%</text>
        <text x="166" y="338" textAnchor="middle" fontSize="12" fontWeight="600" fill="hsl(var(--muted-foreground))">{t('public:landing.scenes.author.split')}</text>
      </g>
    </svg>
  );
}

/** 02 — Enroll: seat-tile grid filling up; org block assigning seats. */
function SceneEnroll() {
  const { t } = useTranslation(['public']);
  const filled = new Set([5, 9, 12, 14, 18, 21, 22, 27, 30, 33, 35]);
  const tiles: ReactNode[] = [];
  const cols = 6;
  const rows = 6;
  const ts = 60;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const cx = 400 + (c - r) * (ts * 0.78);
      const cy = 170 + (c + r) * (ts * 0.4);
      const isFilled = filled.has(i);
      tiles.push(
        <g key={i} className={cn('lx-tile', isFilled && 'lx-tile-filled')} style={{ animationDelay: `${(r + c) * 0.12}s` }}>
          <path
            d={`M${cx} ${cy} l${ts * 0.7} ${ts * 0.35} l${-ts * 0.7} ${ts * 0.35} l${-ts * 0.7} ${-ts * 0.35} Z`}
            fill={isFilled ? 'hsl(var(--primary) / 0.85)' : 'hsl(var(--card))'}
            stroke={isFilled ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
            strokeWidth="1"
          />
        </g>
      );
    }
  }
  return (
    <svg viewBox="0 0 760 520" className="lx-scene-svg" aria-hidden="true">
      <ellipse cx="400" cy="320" rx="290" ry="118" fill="hsl(var(--primary) / 0.05)" />
      {tiles}
      <g className="lx-float">
        <IsoCube x={70} y={84} size={110} height={44} top="hsl(var(--primary) / 0.9)" left="hsl(var(--primary))" right="hsl(var(--primary) / 0.7)" stroke="transparent" />
      </g>
      <Chip x={125} y={62} label={t('public:landing.scenes.enroll.org')} />
      <path className="lx-beam" d="M180 150 C 290 190, 320 230, 390 270" fill="none" stroke="hsl(var(--primary) / 0.7)" strokeWidth="3" strokeDasharray="10 8" strokeLinecap="round" />
      <path className="lx-beam" style={{ animationDelay: '0.7s' }} d="M180 160 C 280 240, 350 290, 440 320" fill="none" stroke="hsl(var(--primary) / 0.45)" strokeWidth="3" strokeDasharray="10 8" strokeLinecap="round" />
      <Chip x={300} y={130} label={t('public:landing.scenes.enroll.assign')} />
      {/* legend */}
      <g>
        <path d="M96 432 l22 11 l-22 11 l-22 -11 Z" fill="hsl(var(--primary) / 0.85)" stroke="hsl(var(--primary))" />
        <text x="130" y="450" fontSize="14" fontWeight="600" fill="hsl(var(--foreground))">{t('public:landing.scenes.enroll.seatTaken')}</text>
        <path d="M96 472 l22 11 l-22 11 l-22 -11 Z" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="130" y="490" fontSize="14" fontWeight="600" fill="hsl(var(--muted-foreground))">{t('public:landing.scenes.enroll.seatOpen')}</text>
      </g>
    </svg>
  );
}

/** 03 — Learn: live session screen, labelled progress ring + assignments. */
function SceneLearn() {
  const { t } = useTranslation(['public']);
  return (
    <svg viewBox="0 0 760 520" className="lx-scene-svg" aria-hidden="true">
      <ellipse cx="380" cy="430" rx="280" ry="60" fill="hsl(var(--primary) / 0.06)" />
      <g transform="translate(230 80) skewY(-6)">
        <rect width="300" height="190" rx="14" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
        <rect x="16" y="16" width="268" height="120" rx="8" fill="hsl(var(--primary) / 0.1)" />
        <circle cx="150" cy="76" r="26" fill="hsl(var(--primary))" className="lx-pulse" />
        <polygon points="142,62 142,90 168,76" fill="white" />
        <rect x="16" y="148" width="120" height="10" rx="5" fill="hsl(var(--muted-foreground) / 0.4)" />
        <rect x="16" y="164" width="80" height="10" rx="5" fill="hsl(var(--muted-foreground) / 0.25)" />
        <circle cx="262" cy="160" r="6" fill="#ef4444" className="lx-pulse" />
        <text x="240" y="166" textAnchor="end" fontSize="12" fontWeight="700" fill="#ef4444">LIVE</text>
      </g>
      <Chip x={380} y={300} label={t('public:landing.scenes.learn.live')} accent />

      <g transform="translate(610 150)">
        <circle r="46" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <circle r="46" fill="none" stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round" strokeDasharray="289" strokeDashoffset="72" transform="rotate(-90)" className="lx-ring" />
        <text y="7" textAnchor="middle" fontSize="20" fontWeight="800" fill="hsl(var(--foreground))">75%</text>
      </g>
      <Chip x={610} y={226} label={t('public:landing.scenes.learn.progress')} />

      <g className="lx-float" transform="translate(85 210)">
        <rect width="170" height="120" rx="12" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(18 ${24 + i * 32})`}>
            <rect width="18" height="18" rx="5" fill={i < 2 ? 'hsl(var(--primary))' : 'hsl(var(--muted))'} />
            {i < 2 && <path d="M4 9 l4 4 l7 -8" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />}
            <rect x="28" y="4" width={92 - i * 14} height="10" rx="5" fill="hsl(var(--muted-foreground) / 0.35)" />
          </g>
        ))}
      </g>
      <Chip x={170} y={352} label={t('public:landing.scenes.learn.assignments')} />

      {[
        [170, 442],
        [340, 470],
        [520, 455],
        [645, 405],
      ].map(([x, y], i) => (
        <g key={i}>
          <path className="lx-beam" style={{ animationDelay: `${i * 0.4}s` }} d={`M380 310 Q ${(380 + x) / 2} ${(310 + y) / 2 + 40} ${x} ${y}`} fill="none" stroke="hsl(var(--primary) / 0.35)" strokeWidth="2" strokeDasharray="6 7" />
          <circle cx={x} cy={y} r="13" fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary) / 0.6)" strokeWidth="2" />
          <circle cx={x} cy={y - 3} r="4" fill="hsl(var(--primary))" />
          <path d={`M${x - 7} ${y + 7} a7 5 0 0 1 14 0`} fill="hsl(var(--primary))" />
        </g>
      ))}
      <Chip x={380} y={505} label={t('public:landing.scenes.learn.students')} />
    </svg>
  );
}

/** 04 — Certify: certificate + automatic revenue split streams. */
function SceneCertify() {
  const { t } = useTranslation(['public']);
  return (
    <svg viewBox="0 0 760 520" className="lx-scene-svg" aria-hidden="true">
      <ellipse cx="380" cy="440" rx="280" ry="58" fill="hsl(var(--primary) / 0.06)" />
      <g className="lx-float" transform="translate(255 50)">
        <rect width="250" height="170" rx="14" fill="hsl(var(--card))" stroke="hsl(var(--primary) / 0.5)" strokeWidth="2" />
        <rect x="14" y="14" width="222" height="142" rx="8" fill="none" stroke="hsl(var(--border))" strokeDasharray="4 5" />
        <rect x="40" y="44" width="170" height="12" rx="6" fill="hsl(var(--muted-foreground) / 0.45)" />
        <rect x="62" y="68" width="126" height="9" rx="4.5" fill="hsl(var(--muted-foreground) / 0.3)" />
        <circle cx="125" cy="122" r="22" fill="hsl(var(--primary))" />
        <path d="M117 122 l6 6 l11 -13" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M113 140 l-8 22 l13 -7 l7 12 l6 -24" fill="hsl(var(--primary) / 0.65)" transform="translate(8 0)" />
      </g>
      <Chip x={380} y={252} label={t('public:landing.scenes.certify.cert')} accent />

      {[
        { x: 160, label: '15%', sub: t('public:landing.scenes.certify.platform'), delay: 0 },
        { x: 380, label: '10%', sub: t('public:landing.scenes.certify.org'), delay: 0.4 },
        { x: 600, label: '75%', sub: t('public:landing.scenes.certify.instructor'), delay: 0.8 },
      ].map((s, i) => (
        <g key={i}>
          <path
            className="lx-beam"
            style={{ animationDelay: `${s.delay}s` }}
            d={`M380 268 C 380 312, ${s.x} 318, ${s.x} 352`}
            fill="none"
            stroke="hsl(var(--primary) / 0.55)"
            strokeWidth="3"
            strokeDasharray="9 8"
            strokeLinecap="round"
          />
          <IsoCube x={s.x - 60} y={352} size={120} height={36} top={i === 2 ? 'hsl(var(--primary) / 0.85)' : 'hsl(var(--card))'} left={i === 2 ? 'hsl(var(--primary))' : 'hsl(var(--muted))'} right={i === 2 ? 'hsl(var(--primary) / 0.65)' : 'hsl(var(--accent))'} stroke={i === 2 ? 'transparent' : 'hsl(var(--border))'} />
          <text x={s.x} y={447} textAnchor="middle" fontSize="22" fontWeight="800" fill="hsl(var(--foreground))">{s.label}</text>
          <text x={s.x} y={468} textAnchor="middle" fontSize="13" fontWeight="700" fill="hsl(var(--muted-foreground))">{s.sub}</text>
        </g>
      ))}
      <Chip x={380} y={505} label={t('public:landing.scenes.certify.split')} />
    </svg>
  );
}

const SCENES: Record<ChapterId, () => ReactElement> = {
  author: SceneAuthor,
  enroll: SceneEnroll,
  learn: SceneLearn,
  certify: SceneCertify,
};

/* ----------------------------------------------------------------------------
   Scroll-following beam — draws a guiding line through the pinned story,
   its tip travelling with scroll (the vectr "line you follow").
---------------------------------------------------------------------------- */
function StoryBeam({ progress }: { progress: number }) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const dotRef = useRef<SVGCircleElement | null>(null);

  useEffect(() => {
    const path = pathRef.current;
    const dot = dotRef.current;
    if (!path || !dot) return;
    const total = path.getTotalLength();
    const pt = path.getPointAtLength(Math.max(0.001, progress) * total);
    dot.setAttribute('cx', String(pt.x));
    dot.setAttribute('cy', String(pt.y));
  }, [progress]);

  return (
    <svg
      className="absolute inset-0 z-[5] h-full w-full pointer-events-none"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {/* faint full track */}
      <path
        d="M 60 -20 C 240 180, 820 160, 870 420 C 910 640, 380 660, 330 820 C 300 920, 560 960, 660 1020"
        fill="none"
        stroke="hsl(var(--primary) / 0.15)"
        strokeWidth="2.5"
        strokeDasharray="3 9"
        vectorEffect="non-scaling-stroke"
      />
      {/* drawn-in portion follows scroll */}
      <path
        ref={pathRef}
        d="M 60 -20 C 240 180, 820 160, 870 420 C 910 640, 380 660, 330 820 C 300 920, 560 960, 660 1020"
        fill="none"
        stroke="hsl(var(--primary) / 0.6)"
        strokeWidth="3"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="1"
        strokeDashoffset={1 - progress}
        vectorEffect="non-scaling-stroke"
        style={{ transition: 'stroke-dashoffset 0.15s linear' }}
      />
      <circle ref={dotRef} r="7" fill="hsl(var(--primary))" opacity={progress > 0.01 ? 1 : 0}>
        <animate attributeName="r" values="6;9;6" dur="1.6s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/* ----------------------------------------------------------------------------
   Pinned scroll story
---------------------------------------------------------------------------- */
function ScrollStory() {
  const { t } = useTranslation(['public', 'common']);
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLElement | null>(null);
  const [segment, setSegment] = useState(0); // 0 = hero, 1..4 = chapters
  const [heroFade, setHeroFade] = useState(0); // 0..1 within hero segment
  const [progress, setProgress] = useState(0); // continuous 0..1 across the whole story

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = wrapRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        if (total <= 0) return;
        const p = Math.min(1, Math.max(0, -rect.top / total));
        setProgress(p);
        const seg = Math.min(SEGMENTS - 1, Math.floor(p * SEGMENTS));
        setSegment(seg);
        setHeroFade(Math.min(1, p * SEGMENTS)); // 0→1 across the hero segment
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const activeChapter = segment - 1; // -1 while in hero
  const chapters = CHAPTER_IDS.map((id, i) => ({
    id,
    num: `0${i + 1}`,
    title: t(`public:landing.chapters.${id}.title`),
    body: t(`public:landing.chapters.${id}.body`),
  }));

  return (
    <section id="how-it-works" ref={wrapRef} style={{ height: `${SEGMENTS * 100}vh` }} className="relative">
      <div className="sticky top-0 h-screen overflow-hidden bg-background">
        {/* dotted-orbit backdrop (hero) */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-700"
          style={{ opacity: 1 - heroFade * 0.85 }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 1200 700" className="w-[140%] max-w-none lx-orbits">
            <ellipse cx="600" cy="350" rx="560" ry="300" fill="none" stroke="hsl(var(--muted-foreground) / 0.25)" strokeDasharray="2 7" />
            <ellipse cx="600" cy="350" rx="400" ry="210" fill="none" stroke="hsl(var(--muted-foreground) / 0.2)" strokeDasharray="2 7" />
            <ellipse cx="600" cy="350" rx="250" ry="128" fill="none" stroke="hsl(var(--muted-foreground) / 0.16)" strokeDasharray="2 7" />
            <circle cx="600" cy="50" r="6" fill="hsl(var(--primary) / 0.7)" className="lx-pulse" />
            <circle cx="200" cy="350" r="5" fill="hsl(var(--primary) / 0.5)" className="lx-pulse" style={{ animationDelay: '0.6s' }} />
            <circle cx="1000" cy="350" r="5" fill="hsl(var(--primary) / 0.5)" className="lx-pulse" style={{ animationDelay: '1.1s' }} />
            <circle cx="600" cy="650" r="6" fill="hsl(var(--primary) / 0.7)" className="lx-pulse" style={{ animationDelay: '1.6s' }} />
          </svg>
        </div>

        {/* the guiding line you follow while scrolling */}
        <StoryBeam progress={progress} />

        {/* hero overlay */}
        <div
          className={cn(
            'absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center transition-all duration-500',
            activeChapter >= 0 && 'pointer-events-none'
          )}
          style={{ opacity: 1 - heroFade, transform: `translateY(${heroFade * -40}px)` }}
        >
          <span className="lx-hero-in mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <GraduationCap className="h-3.5 w-3.5" />
            {t('public:landing.hero.kicker')}
          </span>
          <h1 className="lx-hero-in max-w-4xl text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.02]" style={{ animationDelay: '0.15s' }}>
            {t('public:landing.hero.titleA')}{' '}
            <span className="text-primary">{t('public:landing.hero.titleB')}</span>
          </h1>
          <p className="lx-hero-in mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground" style={{ animationDelay: '0.3s' }}>
            {t('public:landing.hero.subtitle')}
          </p>
          <div className="lx-hero-in mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: '0.45s' }}>
            <Button size="lg" className="h-12 px-7 text-base" onClick={() => navigate('/courses')}>
              {t('public:landing.hero.ctaPrimary')}
              <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-7 text-base" onClick={() => navigate('/register')}>
              {t('public:landing.hero.ctaSecondary')}
            </Button>
          </div>
          <div className="lx-hero-in absolute bottom-8 flex flex-col items-center gap-2 text-xs text-muted-foreground" style={{ animationDelay: '0.7s' }}>
            <span>{t('public:landing.hero.scrollHint')}</span>
            <span className="lx-scroll-dot" aria-hidden="true" />
          </div>
        </div>

        {/* scenes — only mount the active chapter so layers don't stack in the DOM */}
        <div
          className={cn(
            'absolute inset-0 z-0 flex items-center justify-center lg:justify-end overflow-hidden transition-opacity duration-300',
            activeChapter < 0 && 'opacity-0 invisible pointer-events-none'
          )}
        >
          <div className="relative h-full w-full lg:w-[68%] max-w-5xl overflow-hidden">
            {activeChapter >= 0 && (() => {
              const id = CHAPTER_IDS[activeChapter];
              const Scene = SCENES[id];
              return (
                <div key={id} className="lx-scene lx-scene-active">
                  <Scene />
                </div>
              );
            })()}
          </div>
        </div>

        {/* chapter rail */}
        <div
          className={cn(
            'absolute z-10 inset-x-4 bottom-4 lg:inset-x-auto lg:bottom-auto lg:start-10 xl:start-16 lg:top-1/2 lg:-translate-y-1/2 lg:w-[360px] transition-all duration-500',
            activeChapter < 0 ? 'opacity-0 translate-y-6 pointer-events-none' : 'opacity-100 translate-y-0 lg:-translate-y-1/2'
          )}
        >
          <div className="rounded-2xl border border-border/60 bg-background/80 backdrop-blur-md p-4 sm:p-5 shadow-xl shadow-black/5">
            {chapters.map((ch, i) => {
              const active = activeChapter === i;
              return (
                <div key={ch.id} className={cn('lx-chapter', active && 'lx-chapter-active')}>
                  <div className="flex items-center gap-3 py-2">
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold transition-colors',
                        active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {ch.num}
                    </span>
                    <span className={cn('text-sm font-semibold transition-colors', active ? 'text-foreground' : 'text-muted-foreground')}>
                      {ch.title}
                    </span>
                  </div>
                  <div className="lx-chapter-body">
                    <p className="ps-10 pb-3 text-sm leading-relaxed text-muted-foreground border-s-2 border-primary/40 ms-3.5">
                      {ch.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
   Audience cards
---------------------------------------------------------------------------- */
function AudienceCard({
  icon,
  title,
  body,
  to,
  cta,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  to: string;
  cta: string;
}) {
  return (
    <Link
      to={to}
      className="group relative rounded-2xl border border-border/70 bg-card p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/40"
    >
      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
        {icon}
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
        {cta}
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
      </span>
    </Link>
  );
}

/* ----------------------------------------------------------------------------
   Mega footer (vectr-style: link rows + giant wordmark, fully visible)
---------------------------------------------------------------------------- */
function MegaFooter() {
  const { t } = useTranslation(['public', 'common']);
  const wordmarkRef = useReveal<HTMLDivElement>();
  const rows = [
    { to: '/courses', label: t('public:landing.footer.rowCourses') },
    { to: '/register', label: t('public:landing.footer.rowTeach') },
    { to: '/register', label: t('public:landing.footer.rowOrgs') },
  ];
  return (
    <footer className="bg-slate-950 text-slate-100" role="contentinfo">
      <div className="mx-auto max-w-7xl px-6 pt-20">
        <p className="max-w-xl text-2xl sm:text-3xl font-bold leading-snug text-slate-200">
          {t('public:landing.footer.tagline')}
        </p>
        <div className="mt-12 border-t border-slate-800">
          {rows.map((row, i) => (
            <Link
              key={i}
              to={row.to}
              className="group flex items-center justify-between border-b border-slate-800 py-6 sm:py-8 transition-colors hover:bg-slate-900/60 px-2 sm:px-4"
            >
              <span className="text-xl sm:text-3xl font-bold tracking-tight transition-transform duration-300 group-hover:translate-x-2 rtl:group-hover:-translate-x-2">
                {row.label}
              </span>
              <ArrowUpRight className="h-7 w-7 text-primary transition-transform duration-300 group-hover:translate-x-1.5 group-hover:-translate-y-1.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-1.5" />
            </Link>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 pb-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} AcademiX. {t('public:landing.footer.rights')}</span>
          <div className="flex items-center gap-5">
            <Link to="/login" className="hover:text-slate-300 transition-colors">{t('common:login')}</Link>
            <Link to="/register" className="hover:text-slate-300 transition-colors">{t('common:signUp')}</Link>
            <Link to="/support" className="hover:text-slate-300 transition-colors">{t('public:landing.footer.support')}</Link>
          </div>
        </div>
      </div>
      {/* giant wordmark — fully visible, rises into place */}
      <div ref={wordmarkRef} className="overflow-hidden select-none px-2 pb-6" aria-hidden="true">
        <div className="lx-wordmark lx-reveal mx-auto max-w-[1800px] text-center font-black tracking-tighter text-slate-100/95">
          ACADEMIX
        </div>
      </div>
    </footer>
  );
}

/* ----------------------------------------------------------------------------
   Page
---------------------------------------------------------------------------- */
export function HomePage() {
  const { t, i18n } = useTranslation(['public', 'common']);
  const [topRated, setTopRated] = useState<CourseDto[]>([]);
  const featuresRef = useReveal<HTMLElement>();
  const coursesRef = useReveal<HTMLElement>();
  const statsRef = useReveal<HTMLElement>();
  const faqRef = useReveal<HTMLElement>();

  const landingMetaDescription = t('public:home.metaDescription');
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const canonicalUrl = siteUrl ? `${siteUrl}/` : '/';
  const jsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'AcademiX',
      description: landingMetaDescription,
      ...(siteUrl ? { url: canonicalUrl } : {}),
      publisher: { '@type': 'Organization', name: 'AcademiX', ...(siteUrl ? { url: siteUrl } : {}) },
    }),
    [landingMetaDescription, siteUrl, canonicalUrl]
  );

  useEffect(() => {
    let cancelled = false;
    courseService
      .getTopRatedCourses(3)
      .then((courses) => {
        if (!cancelled) setTopRated(courses ?? []);
      })
      .catch(() => {
        /* teaser is optional — the section hides itself when empty */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const faqItems = ['whatIs', 'free', 'certificate', 'cancel', 'support'] as const;

  return (
    <div className="relative">
      <Helmet>
        <title>{t('public:home.metaTitle')}</title>
        <meta name="description" content={landingMetaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={t('public:home.metaOgTitle')} />
        <meta property="og:description" content={landingMetaDescription} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* component-scoped animation styles */}
      <style>{`
        .lx-scene { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
        .lx-scene-active { animation: lx-scene-in .45s cubic-bezier(.2,.7,.3,1) both; pointer-events: auto; }
        @keyframes lx-scene-in { from { opacity: 0; transform: translateY(28px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .lx-scene-svg { width: min(92%, 860px); height: auto; }
        .lx-float { animation: lx-float 5.5s ease-in-out infinite; }
        @keyframes lx-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .lx-beam { animation: lx-dash 1.6s linear infinite; }
        @keyframes lx-dash { to { stroke-dashoffset: -36; } }
        .lx-pulse { animation: lx-pulse 2s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
        @keyframes lx-pulse { 0%,100% { opacity: 1; } 50% { opacity: .45; } }
        .lx-ring { animation: lx-ring 3.2s ease-in-out infinite alternate; }
        @keyframes lx-ring { from { stroke-dashoffset: 180; } to { stroke-dashoffset: 72; } }
        .lx-tile path { transition: transform .3s ease, fill .3s ease; transform-box: fill-box; }
        .lx-tile:hover path { transform: translateY(-7px); fill: hsl(var(--primary) / 0.35); }
        .lx-tile-filled path { animation: lx-tile-in 1s ease both; }
        @keyframes lx-tile-in { from { opacity: 0; transform: translateY(-16px); } to { opacity: 1; transform: translateY(0); } }
        .lx-orbits { animation: lx-orbit-drift 26s linear infinite; transform-origin: center; }
        @keyframes lx-orbit-drift { from { transform: rotate(0deg) } to { transform: rotate(4deg) } }
        .lx-scroll-dot { width: 5px; height: 9px; border-radius: 9999px; background: hsl(var(--primary)); animation: lx-drop 1.6s ease-in-out infinite; }
        @keyframes lx-drop { 0% { transform: translateY(0); opacity: 1; } 80% { transform: translateY(12px); opacity: 0; } 100% { opacity: 0; } }
        .lx-hero-in { animation: lx-rise .8s cubic-bezier(.2,.7,.3,1) both; }
        @keyframes lx-rise { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: translateY(0); } }
        .lx-chapter-body { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .45s ease; }
        .lx-chapter-active .lx-chapter-body { grid-template-rows: 1fr; }
        .lx-chapter-body > p { overflow: hidden; min-height: 0; margin: 0; opacity: 0; transition: opacity .35s ease .1s; }
        .lx-chapter-active .lx-chapter-body > p { opacity: 1; }
        .lx-reveal { opacity: 0; transform: translateY(28px); transition: opacity .8s ease, transform .8s ease; }
        .lx-inview .lx-reveal, .lx-inview.lx-reveal { opacity: 1; transform: translateY(0); }
        .lx-wordmark { font-size: clamp(64px, 15vw, 270px); line-height: 1; }
        @media (prefers-reduced-motion: reduce) {
          .lx-float, .lx-beam, .lx-pulse, .lx-ring, .lx-orbits, .lx-scroll-dot, .lx-tile-filled path, .lx-hero-in { animation: none !important; }
          .lx-hero-in { opacity: 1 !important; transform: none !important; }
          .lx-scene, .lx-scene-active { animation: none !important; opacity: 1 !important; transform: none !important; }
          .lx-reveal, .lx-chapter-body { transition: none !important; }
        }
      `}</style>

      {/* 1 — pinned scroll story */}
      <ScrollStory />

      {/* 2 — big type + audiences */}
      <section id="features" ref={featuresRef} className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
        <h2 className="lx-reveal max-w-3xl text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]">
          {t('public:landing.features.heading')}
        </h2>
        <p className="lx-reveal mt-5 max-w-2xl text-base sm:text-lg text-muted-foreground" style={{ transitionDelay: '120ms' }}>
          {t('public:landing.features.sub')}
        </p>
        <div className="lx-reveal mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" style={{ transitionDelay: '220ms' }}>
          <AudienceCard
            icon={<GraduationCap className="h-6 w-6" />}
            title={t('public:landing.audiences.students.title')}
            body={t('public:landing.audiences.students.body')}
            cta={t('public:landing.audiences.students.cta')}
            to="/courses"
          />
          <AudienceCard
            icon={<PenTool className="h-6 w-6" />}
            title={t('public:landing.audiences.instructors.title')}
            body={t('public:landing.audiences.instructors.body')}
            cta={t('public:landing.audiences.instructors.cta')}
            to="/register"
          />
          <AudienceCard
            icon={<Building2 className="h-6 w-6" />}
            title={t('public:landing.audiences.institutions.title')}
            body={t('public:landing.audiences.institutions.body')}
            cta={t('public:landing.audiences.institutions.cta')}
            to="/register"
          />
          <AudienceCard
            icon={<Briefcase className="h-6 w-6" />}
            title={t('public:landing.audiences.employers.title')}
            body={t('public:landing.audiences.employers.body')}
            cta={t('public:landing.audiences.employers.cta')}
            to="/register"
          />
        </div>
      </section>

      {/* 3 — stats */}
      <section ref={statsRef} className="border-y border-border/60 bg-muted/30">
        <div className="lx-reveal mx-auto grid max-w-6xl grid-cols-2 gap-10 px-6 py-16 lg:grid-cols-4">
          <StatNumber value={12000} suffix="+" label={t('public:home.stats.activeLearners')} />
          <StatNumber value={850} suffix="+" label={t('public:home.stats.courses')} />
          <StatNumber value={120} suffix="+" label={t('public:landing.stats.organizations')} />
          <StatNumber value={94} suffix="%" label={t('public:home.stats.completionRate')} />
        </div>
      </section>

      {/* 4 — course teaser */}
      {topRated.length > 0 && (
        <section id="featured" ref={coursesRef} className="mx-auto max-w-7xl px-6 py-24">
          <div className="lx-reveal flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">{t('public:landing.courses.heading')}</h2>
              <p className="mt-2 text-muted-foreground">{t('public:landing.courses.sub')}</p>
            </div>
            <Link to="/courses" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              {t('public:landing.courses.viewAll')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
            </Link>
          </div>
          <div className="lx-reveal mt-10 grid gap-6 md:grid-cols-3" style={{ transitionDelay: '150ms' }}>
            {topRated.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="group rounded-2xl border border-border/70 bg-card p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/40"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {course.category || t('public:landing.courses.fallbackCategory')}
                  </span>
                  {typeof course.rating === 'number' && course.rating > 0 && (
                    <span className="inline-flex items-center gap-1 text-sm font-medium">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      {course.rating.toFixed(1)}
                    </span>
                  )}
                </div>
                <h3 className="mt-4 text-lg font-bold leading-snug group-hover:text-primary transition-colors">
                  {course.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
                <div className="mt-5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{course.instructorName}</span>
                  <span className="font-bold">
                    {course.price && course.price > 0 ? formatMoney(course.price) : t('public:landing.courses.free')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 5 — FAQ */}
      <section id="faq" ref={faqRef} className="mx-auto max-w-3xl px-6 pb-28">
        <h2 className="lx-reveal text-3xl sm:text-4xl font-black tracking-tight">{t('public:landing.faq.heading')}</h2>
        <div className="lx-reveal mt-8" style={{ transitionDelay: '120ms' }}>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((k) => (
              <AccordionItem key={k} value={k}>
                <AccordionTrigger className="text-start">{t(`public:home.faq.${k}Q`)}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{t(`public:home.faq.${k}A`)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* 6 — mega footer */}
      <MegaFooter key={i18n.language} />
    </div>
  );
}

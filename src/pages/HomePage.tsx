import { useEffect, useState, useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../components/ui/accordion';
import { courseService, type CourseDto } from '../services/courseService';
import {
  Star,
  ArrowRight,
  BookOpen,
  TrendingUp,
  Sparkles,
  ChevronDown,
  Award,
  Search,
  ClipboardCheck,
  GraduationCap,
  Video,
  Clock,
  Smartphone,
  Shield,
  Quote,
  Code,
  Palette,
  Briefcase,
  Mail,
  Layout,
  Monitor,
  Lock,
  Headphones,
  Globe2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '../store/useAppStore';
import { applyTheme } from '../theme/applyTheme';
import { THEMES, type ThemeId } from '../theme/themes';
import { ColorPicker } from '../components/ui/color-picker';
import { cn } from '../lib/cn';
import { Helmet } from 'react-helmet-async';
import { useLenis } from '../hooks/useLenis';

/** Theme background colors for the top-to-bottom sweep (HSL string for each theme). */
const THEME_BACKGROUNDS: Record<ThemeId, string> = {
  light: 'hsl(0 0% 100%)',
  dark: 'hsl(0 0% 0%)',
  purple: 'hsl(270 50% 96%)',
  sky: 'hsl(195 70% 95%)',
  'sky-purple': 'hsl(195 70% 95%)',
  green: 'hsl(142 50% 96%)',
  emerald: 'hsl(160 50% 96%)',
  orange: 'hsl(25 70% 96%)',
  amber: 'hsl(43 70% 96%)',
  red: 'hsl(0 70% 96%)',
  rose: 'hsl(350 70% 96%)',
  pink: 'hsl(330 70% 96%)',
  indigo: 'hsl(262 50% 96%)',
  custom: 'hsl(0 0% 100%)',
};

const STATS_VALUES = [
  { value: '50K+', labelKey: 'home.stats.activeLearners' },
  { value: '1,200+', labelKey: 'home.stats.courses' },
  { value: '98%', labelKey: 'home.stats.completionRate' },
];

/** Partner-style strip — monogram + label for a more polished look */
const TRUST_PARTNERS = [
  { initials: 'UN', nameKey: 'home.trust.universities' },
  { initials: 'K12', nameKey: 'home.trust.schools' },
  { initials: 'ENT', nameKey: 'home.trust.enterprises' },
  { initials: 'ED', nameKey: 'home.trust.edtech' },
];

const TRUST_BADGES = [
  { labelKey: 'home.trust.encrypted', icon: Lock },
  { labelKey: 'home.trust.support', icon: Headphones },
  { labelKey: 'home.trust.uptime', icon: Zap },
  { labelKey: 'home.trust.globalCdn', icon: Globe2 },
];

const HOW_IT_WORKS = [
  { step: 1, titleKey: 'home.howItWorks.step1Title', descKey: 'home.howItWorks.step1Desc', icon: Search },
  { step: 2, titleKey: 'home.howItWorks.step2Title', descKey: 'home.howItWorks.step2Desc', icon: ClipboardCheck },
  { step: 3, titleKey: 'home.howItWorks.step3Title', descKey: 'home.howItWorks.step3Desc', icon: Award },
];

const FEATURES = [
  { titleKey: 'home.features.expertInstructorsTitle', descKey: 'home.features.expertInstructorsDesc', icon: GraduationCap },
  { titleKey: 'home.features.selfPacedTitle', descKey: 'home.features.selfPacedDesc', icon: Clock },
  { titleKey: 'home.features.certificatesTitle', descKey: 'home.features.certificatesDesc', icon: Award },
  { titleKey: 'home.features.mobileTitle', descKey: 'home.features.mobileDesc', icon: Smartphone },
  { titleKey: 'home.features.secureTitle', descKey: 'home.features.secureDesc', icon: Shield },
  { titleKey: 'home.features.videoTitle', descKey: 'home.features.videoDesc', icon: Video },
];

const AUDIENCES = [
  { id: 'students', labelKey: 'home.audiences.studentsLabel', descKey: 'home.audiences.studentsDesc' },
  { id: 'instructors', labelKey: 'home.audiences.instructorsLabel', descKey: 'home.audiences.instructorsDesc' },
  { id: 'organizations', labelKey: 'home.audiences.organizationsLabel', descKey: 'home.audiences.organizationsDesc' },
];

const CATEGORIES = [
  { nameKey: 'home.categories.programming', slug: 'Programming', icon: Code },
  { nameKey: 'home.categories.design', slug: 'Design', icon: Palette },
  { nameKey: 'home.categories.business', slug: 'Business', icon: Briefcase },
  { nameKey: 'home.categories.dataScience', slug: 'Data Science', icon: TrendingUp },
  { nameKey: 'home.categories.marketing', slug: 'Marketing', icon: Sparkles },
];

const TESTIMONIALS = [
  { quoteKey: 'home.testimonials.quote1', nameKey: 'home.testimonials.name1', roleKey: 'home.testimonials.role1' },
  { quoteKey: 'home.testimonials.quote2', nameKey: 'home.testimonials.name2', roleKey: 'home.testimonials.role2' },
  { quoteKey: 'home.testimonials.quote3', nameKey: 'home.testimonials.name3', roleKey: 'home.testimonials.role3' },
];

const INSTRUCTORS = [
  { nameKey: 'home.instructors.name1', subjectKey: 'home.instructors.subject1', initials: 'ER' },
  { nameKey: 'home.instructors.name2', subjectKey: 'home.instructors.subject2', initials: 'JW' },
  { nameKey: 'home.instructors.name3', subjectKey: 'home.instructors.subject3', initials: 'PS' },
  { nameKey: 'home.instructors.name4', subjectKey: 'home.instructors.subject4', initials: 'AK' },
];

const FAQ_ITEMS = [
  { id: 'what-is', qKey: 'home.faq.whatIsQ', aKey: 'home.faq.whatIsA' },
  { id: 'free', qKey: 'home.faq.freeQ', aKey: 'home.faq.freeA' },
  { id: 'certificate', qKey: 'home.faq.certificateQ', aKey: 'home.faq.certificateA' },
  { id: 'cancel', qKey: 'home.faq.cancelQ', aKey: 'home.faq.cancelA' },
  { id: 'support', qKey: 'home.faq.supportQ', aKey: 'home.faq.supportA' },
];

const ACTIVITY_MESSAGE_KEYS = [
  'home.activity.msg1',
  'home.activity.msg2',
  'home.activity.msg3',
  'home.activity.msg4',
];

const TOP_FEATURES = [
  { titleKey: 'home.topFeatures.customTitle', descKey: 'home.topFeatures.customDesc', icon: Palette, highlight: true },
  { titleKey: 'home.topFeatures.modernTitle', descKey: 'home.topFeatures.modernDesc', icon: Layout, highlight: false },
  { titleKey: 'home.topFeatures.responsiveTitle', descKey: 'home.topFeatures.responsiveDesc', icon: Monitor, highlight: false },
];

// Reusable animation variants
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};
const staggerContainer = {
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.06 },
  },
};
const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};
const spring = { type: 'spring' as const, stiffness: 120, damping: 20 };
const springSoft = { type: 'spring' as const, stiffness: 100, damping: 24 };
const viewportOnce = { once: true, margin: '-40px' };

// Subtle idle motion for cards and blocks
const floatSubtle = (delay = 0) => ({
  y: [0, -6, 0],
  transition: { repeat: Infinity, duration: 4 + delay * 0.5, ease: 'easeInOut' as const, delay: delay * 0.3 },
});
const iconPulse = { scale: [1, 1.08, 1], transition: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' as const } };

/** Section shells: alternating visual rhythm using theme tokens only (primary / ring / muted) */
const band = {
  /** Hero — strongest focal block */
  hero: 'rounded-[2rem] border border-primary/30 bg-gradient-to-br from-primary/[0.1] via-background to-muted/30 p-6 sm:p-10 shadow-[0_28px_64px_-24px_hsl(var(--primary)/0.35)]',
  /** Soft gray wash */
  wash: 'rounded-[2rem] border border-border/50 bg-gradient-to-br from-muted/40 via-background/90 to-muted/25 px-5 py-10 sm:px-8 sm:py-12',
  /** Primary-tinted “spotlight” */
  glow: 'rounded-[2rem] border border-primary/25 bg-gradient-to-b from-primary/[0.09] via-background/40 to-ring/[0.06] px-5 py-10 sm:px-8 sm:py-12 shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.15)]',
  /** Elevated card feel */
  deep: 'rounded-[2rem] border border-border/60 bg-gradient-to-br from-card/90 to-muted/40 px-5 py-10 sm:px-8 sm:py-12 shadow-lg shadow-primary/[0.06]',
  /** Glassy card strip */
  card: 'rounded-[2rem] border border-border/55 bg-card/70 backdrop-blur-sm px-5 py-10 sm:px-8 sm:py-12 shadow-xl shadow-primary/[0.05]',
  /** Diagonal gradient accent */
  stripe:
    'relative overflow-hidden rounded-[2rem] border border-border/45 px-5 py-10 sm:px-8 sm:py-12 before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(125deg,hsl(var(--primary)/0.1)_0%,transparent_45%,hsl(var(--ring)/0.08)_100%)]',
} as const;

function SectionDivider() {
  return (
    <div
      className="relative py-6"
      aria-hidden
    >
      <div className="mx-auto h-px max-w-2xl bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
      <div className="absolute start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-2 w-2 rounded-full bg-primary/50 ring-4 ring-background" />
    </div>
  );
}

/** Optional colored label chip above section titles */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
      {children}
    </span>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
  return (
    <motion.div
      className="fixed top-0 start-0 end-0 h-1 bg-primary origin-left z-[100]"
      style={{ scaleX }}
    />
  );
}

type CelebrationState =
  | { phase: 'wizard' | 'firework'; theme: ThemeId }
  | { phase: 'color'; theme: ThemeId; oldBg: string; newBg: string };

function getCurrentBackgroundHsl(): string {
  if (typeof document === 'undefined') return 'hsl(0 0% 100%)';
  const v = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
  return v ? `hsl(${v})` : 'hsl(0 0% 100%)';
}

function ThemeCelebration({
  celebration,
  onComplete,
  setTheme,
}: {
  celebration: CelebrationState;
  onComplete: (next: CelebrationState | null) => void;
  setTheme: (theme: ThemeId) => void;
}) {
  const { t } = useTranslation(['public', 'common']);
  const { phase, theme: themeId } = celebration;
  const [logoPos, setLogoPos] = useState<{ x: number; y: number } | null>(null);
  const [fireworkDone, setFireworkDone] = useState(false);

  const sweepColors =
    celebration.phase === 'color'
      ? { old: celebration.oldBg, new: celebration.newBg }
      : null;

  // Advance: wizard → firework after delay
  useEffect(() => {
    if (phase === 'wizard') {
      const timer = setTimeout(() => onComplete({ phase: 'firework', theme: themeId }), 1100);
      return () => clearTimeout(timer);
    }
  }, [phase, themeId, onComplete]);

  // When firework phase: get logo position
  useEffect(() => {
    if (phase === 'firework') {
      const el = document.getElementById('academix-logo');
      if (el) {
        const r = el.getBoundingClientRect();
        setLogoPos({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }
      const timer = setTimeout(() => setFireworkDone(true), 50);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Transition to color WITH old/new bg; apply new theme immediately so overlay "reveal" matches
  useEffect(() => {
    if (phase === 'firework' && fireworkDone) {
      const oldBg = getCurrentBackgroundHsl();
      const newBg = THEME_BACKGROUNDS[themeId] ?? THEME_BACKGROUNDS.light;
      const timer = setTimeout(
        () => {
          setTheme(themeId);
          applyTheme(themeId);
          onComplete({ phase: 'color', theme: themeId, oldBg, newBg });
        },
        700
      );
      return () => clearTimeout(timer);
    }
  }, [phase, fireworkDone, themeId, onComplete, setTheme]);

  const wizardBottom = 100;
  const wizardRight = 320;
  const sparkStartX = typeof window !== 'undefined' ? window.innerWidth - wizardRight - 50 : 0;
  const sparkStartY = typeof window !== 'undefined' ? window.innerHeight - wizardBottom - 40 : 0;

  return (
    <>
      {/* Transformation: overlay of OLD color slides up to reveal the new theme (already applied) */}
      {phase === 'color' && sweepColors && (
        <motion.div
          className="fixed inset-0 z-[100] pointer-events-none overflow-hidden"
          style={{ background: sweepColors.old }}
          initial={{ y: 0 }}
          animate={{ y: '-100%' }}
          transition={{
            duration: 1.8,
            ease: [0.22, 0.61, 0.36, 1],
          }}
          onAnimationComplete={() => {
            onComplete(null);
            const matched = THEMES.find((th) => th.id === themeId);
            toast.success(t('public:home.themeApplied', { theme: matched?.label ?? themeId }));
          }}
        />
      )}

      {/* Wizard + firework: on top only during wizard/firework phases */}
      {(phase === 'wizard' || phase === 'firework') && (
    <div className="fixed inset-0 z-[200] pointer-events-auto">
      {/* Wizard — bouncy, alive, with wiggles and casting motion */}
        <motion.div
          className="absolute z-10"
          style={{ bottom: wizardBottom, right: wizardRight }}
          initial={{ x: 140, opacity: 0, rotate: -8 }}
          animate={{
            x: 0,
            opacity: 1,
            rotate: 0,
            y: [0, -3, 0],
          }}
          transition={{
            x: { type: 'spring', stiffness: 280, damping: 20 },
            opacity: { duration: 0.3 },
            rotate: { type: 'spring', stiffness: 200, damping: 18 },
            y: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' },
          }}
        >
          <div className="relative w-[72px] h-[88px]">
            {/* Robe — single clean shape */}
            <div
              className="absolute bottom-0 start-1/2 -translate-x-1/2 w-12 h-9 rounded-t-[2rem] border-2 border-gray-900 bg-indigo-600"
            />
            {/* Face — round head, skin tone */}
            <motion.div
              className="absolute bottom-7 start-1/2 -translate-x-1/2 w-10 h-10 rounded-full border-2 border-gray-900 bg-amber-100"
              animate={{ y: [0, -2, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            >
              {/* Eyes */}
              <motion.div
                className="absolute start-2 top-3 w-2.5 h-2.5 rounded-full bg-gray-900"
                animate={phase === 'firework' ? { scaleY: [1, 0.2, 1] } : {}}
                transition={{ duration: 0.15, repeat: 2 }}
              />
              <div className="absolute start-2.5 top-3 w-1 h-1 rounded-full bg-white" />
              <motion.div
                className="absolute end-2 top-3 w-2.5 h-2.5 rounded-full bg-gray-900"
                animate={phase === 'firework' ? { scaleY: [1, 0.2, 1] } : {}}
                transition={{ duration: 0.15, repeat: 2 }}
              />
              <div className="absolute end-2.5 top-3 w-1 h-1 rounded-full bg-white" />
              {/* Smile */}
              <div className="absolute start-1/2 top-[52%] -translate-x-1/2 w-4 border-b-2 border-gray-800 rounded-b-full h-1" />
            </motion.div>
            {/* Hat — pointed cone + band */}
            <motion.div
              className="absolute -top-0.5 start-1/2 -translate-x-1/2 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-b-[28px] border-b-indigo-900 border-[0]"
              animate={{ rotate: [0, 3, -2, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            />
            <div className="absolute top-5 start-1/2 -translate-x-1/2 w-7 h-2 rounded-sm border-2 border-gray-900 bg-amber-200" />
            <div className="absolute top-5 start-1/2 -translate-x-1/2 w-1.5 h-1.5 border border-gray-800 bg-amber-600" style={{ marginLeft: 2 }} />
            {/* Star on hat */}
            <motion.div className="absolute -top-6 start-1/2 -translate-x-1/2 text-yellow-400" animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9" /></svg>
            </motion.div>
            {/* Wand — stick + star, clearly to the side */}
            <motion.div
              className="absolute bottom-6 -right-1 origin-[90%_50%]"
              animate={phase === 'firework' ? { rotate: [-22, -38, -28] } : { rotate: -22 }}
              transition={phase === 'firework' ? { duration: 0.2 } : {}}
            >
              <div className="w-10 h-1.5 rounded-full bg-amber-800 border-2 border-gray-800" />
              <motion.div className="absolute -right-6 top-1/2 -translate-y-1/2 text-yellow-400" animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 0.7 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9" /></svg>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

      {/* Firework: main spark + trailing sparks */}
      {phase === 'firework' && logoPos && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="fixed rounded-full bg-primary pointer-events-none z-20"
              style={{
                width: 12 - i * 3,
                height: 12 - i * 3,
                left: sparkStartX - 6 + i * 2,
                top: sparkStartY - 6 + i * 2,
              }}
              initial={{ left: sparkStartX - 6 + i * 2, top: sparkStartY - 6 + i * 2, opacity: 0.9 - i * 0.25 }}
              animate={{
                left: logoPos.x - 6 + (i - 1) * 4,
                top: logoPos.y - 6 + (i - 1) * 4,
                opacity: 0,
              }}
              transition={{
                duration: 0.9 + i * 0.05,
                delay: i * 0.06,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            />
          ))}
          <motion.div
            className="fixed w-5 h-5 rounded-full pointer-events-none z-20"
            style={{
              left: sparkStartX - 10,
              top: sparkStartY - 10,
              background: 'radial-gradient(circle, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.4) 50%, transparent 70%)',
              boxShadow: '0 0 24px hsl(var(--primary)), 0 0 48px hsl(var(--primary) / 0.5)',
            }}
            initial={{ left: sparkStartX - 10, top: sparkStartY - 10 }}
            animate={{ left: logoPos.x - 10, top: logoPos.y - 10 }}
            transition={{ duration: 0.85, ease: [0.25, 0.46, 0.45, 0.94] }}
          />
        </>
      )}
    </div>
      )}
    </>
  );
}

export function HomePage() {
  const { t } = useTranslation(['public', 'common']);
  const [featuredCourses, setFeaturedCourses] = useState<CourseDto[]>([]);
  const [topRatedCourses, setTopRatedCourses] = useState<CourseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [audienceActive, setAudienceActive] = useState('students');
  const [email, setEmail] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [activityIndex, setActivityIndex] = useState(0);
  const [themePanelOpen, setThemePanelOpen] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationState | null>(null);

  const theme = useAppStore((s) => s.data.theme);
  const customThemeColor = useAppStore((s) => s.data.customThemeColor);
  const mixTheme = useAppStore((s) => s.data.mixTheme);
  const setTheme = useAppStore((s) => s.setTheme);
  const setCustomThemeColor = useAppStore((s) => s.setCustomThemeColor);

  const landingMetaDescription = t('public:home.metaDescription');

  /** Lenis smooth scroll — landing page only (destroyed when navigating away) */
  useLenis(true);

  useEffect(() => {
    applyTheme(theme, customThemeColor, mixTheme);
  }, [theme, customThemeColor, mixTheme]);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        const [featured, topRated] = await Promise.all([
          courseService.getFeaturedCourses(),
          courseService.getTopRatedCourses(6),
        ]);
        setFeaturedCourses(featured);
        setTopRatedCourses(topRated);
      } catch (error) {
        toast.error(t('public:home.loadCoursesFailed'), {
          description: error instanceof Error ? error.message : t('public:home.tryLater'),
        });
      } finally {
        setLoading(false);
      }
    };
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActivityIndex((i) => (i + 1) % ACTIVITY_MESSAGE_KEYS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setEmailSubmitting(true);
    setTimeout(() => {
      toast.success(t('public:home.newsletterSuccessTitle'), { description: t('public:home.newsletterSuccessBody') });
      setEmail('');
      setEmailSubmitting(false);
    }, 600);
  };

  const formatRating = (rating: number) => rating.toFixed(1);

  const scrollToFeatured = () => {
    document.getElementById('featured')?.scrollIntoView({ behavior: 'smooth' });
  };

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const canonicalUrl = siteUrl ? `${siteUrl}/` : '/';
  const jsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'AcademiX',
      description: landingMetaDescription,
      ...(siteUrl ? { url: canonicalUrl } : {}),
      publisher: {
        '@type': 'Organization',
        name: 'AcademiX',
        ...(siteUrl ? { url: siteUrl } : {}),
      },
    }),
    [landingMetaDescription, siteUrl, canonicalUrl]
  );

  return (
    <div className="relative min-h-screen">
      <Helmet>
        <title>{t('public:home.metaTitle')}</title>
        <meta name="description" content={landingMetaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={t('public:home.metaOgTitle')} />
        <meta property="og:description" content={landingMetaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t('public:home.metaOgTitle')} />
        <meta name="twitter:description" content={landingMetaDescription} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <ScrollProgress />
      {/* Background: when mix theme is active, keep transparent so body gradient shows; otherwise use theme gradient */}
      {!mixTheme && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10 -z-10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent_50%)] -z-10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.1),transparent_50%)] -z-10" />
        </>
      )}

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 space-y-14 sm:space-y-20 py-12 md:py-16">
        {/* Hero — headline + product-style preview */}
        <section className={cn('relative', band.hero)}>
          <div
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] dark:opacity-[0.2]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.12) 1px, transparent 0)`,
              backgroundSize: '24px 24px',
            }}
          />
          <div className="grid gap-12 lg:grid-cols-[1fr_minmax(0,420px)] lg:items-center lg:gap-10">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
              }}
              className="space-y-4 text-center lg:text-start"
            >
              <motion.div
                variants={fadeUp}
                transition={spring}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/25 border border-primary/40 text-foreground text-sm font-semibold shadow-md"
              >
                <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                {t('public:home.hero.welcome')}
              </motion.div>
              <motion.h1
                variants={fadeUp}
                transition={spring}
                className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground"
              >
                {t('public:home.hero.titleStart')}{' '}
                <span className="gradient-text">{t('public:home.hero.titleMatter')}</span>.
                <br className="hidden sm:block" />
                <span className="text-foreground"> {t('public:home.hero.titleFrom')} </span>
                <span className="gradient-text">{t('public:home.hero.titleAnywhere')}</span>.
              </motion.h1>
              <motion.p
                variants={fadeUp}
                transition={spring}
                className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed"
              >
                {t('public:home.hero.subtitle')}
              </motion.p>
              <motion.ul
                variants={fadeUp}
                transition={spring}
                className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-foreground/85"
              >
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  {t('public:home.hero.badgeSecurity')}
                </li>
                <li className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary shrink-0" />
                  {t('public:home.hero.badgeCerts')}
                </li>
              </motion.ul>
              <motion.div
                variants={fadeUp}
                transition={spring}
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2"
              >
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} transition={springSoft}>
                  <Button asChild size="lg" className="text-lg px-8 shadow-lg shadow-primary/20">
                    <Link to="/courses">{t('public:home.hero.browseCourses')}</Link>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} transition={springSoft}>
                  <Button size="lg" variant="outline" className="text-lg px-8" onClick={scrollToFeatured}>
                    {t('public:home.hero.seeFeatured')}
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} transition={springSoft}>
                  <Button asChild size="lg" variant="ghost" className="text-lg px-8">
                    <Link to="/register">{t('public:home.hero.getStartedFree')}</Link>
                  </Button>
                </motion.div>
              </motion.div>
              <motion.div
                variants={fadeIn}
                transition={{ delay: 0.6 }}
                className="pt-6 flex justify-center lg:justify-start"
              >
                <motion.button
                  type="button"
                  onClick={scrollToFeatured}
                  className="inline-flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t('public:home.hero.scrollToCourses')}
                  whileHover={{ y: 4 }}
                  animate={{ y: [0, 6, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                >
                  <span className="text-xs font-medium">{t('public:home.hero.explore')}</span>
                  <ChevronDown className="h-6 w-6" />
                </motion.button>
              </motion.div>
            </motion.div>

            {/* Product preview — browser chrome mockup */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.25 }}
              className="relative mx-auto w-full max-w-md lg:max-w-none"
            >
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-2xl -z-10" />
              <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-2xl shadow-primary/10 overflow-hidden ring-1 ring-border/40">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
                  <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-red-400/80" />
                    <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
                  </div>
                  <div className="flex-1 mx-4 rounded-md bg-background/80 border border-border/50 px-3 py-1 text-xs text-muted-foreground truncate">
                    app.academix.com/dashboard
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="h-2.5 w-32 rounded bg-primary/30" />
                      <div className="h-2 w-24 rounded bg-muted-foreground/20" />
                    </div>
                    <div className="h-9 w-24 rounded-lg bg-primary/15 border border-primary/20" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/20" />
                        <div className="h-2 w-full rounded bg-muted-foreground/15" />
                        <div className="h-2 w-2/3 rounded bg-muted-foreground/10" />
                      </div>
                    ))}
                  </div>
                  <div className="h-24 rounded-xl border border-dashed border-primary/25 bg-gradient-to-br from-primary/5 to-transparent flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Video className="h-5 w-5 text-primary" />
                    {t('public:home.hero.previewContinueWatching')}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <SectionDivider />

        {/* Stats strip — scroll-in with stagger */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className={cn('grid grid-cols-3 gap-6 sm:gap-8', band.wash)}
        >
          {STATS_VALUES.map(({ value, labelKey }, i) => (
            <motion.div
              key={labelKey}
              variants={staggerItem}
              transition={spring}
              className="text-center"
              animate={floatSubtle(i)}
            >
              <motion.div
                className="text-2xl sm:text-3xl font-bold text-primary"
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={viewportOnce}
                transition={springSoft}
                whileHover={{ scale: 1.05 }}
              >
                {value}
              </motion.div>
              <div className="text-sm font-medium text-foreground/90 mt-1">{t(`public:${labelKey}`)}</div>
            </motion.div>
          ))}
        </motion.section>

        {/* Top features — presentation-style, strong customization */}
        <motion.section
          id="top-features"
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className={cn('space-y-8 relative z-10', band.stripe)}
        >
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <motion.div variants={staggerItem} transition={spring} className="flex justify-center">
              <SectionLabel>{t('public:home.sectionLabels.platform')}</SectionLabel>
            </motion.div>
            <motion.h2 variants={staggerItem} transition={spring} className="text-3xl font-bold text-foreground">
              {t('public:home.topFeaturesTitle')}
            </motion.h2>
            <motion.p variants={staggerItem} transition={spring} className="text-foreground/90 mt-2 leading-relaxed">
              {t('public:home.topFeaturesSubtitle')}
            </motion.p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TOP_FEATURES.map((feature, index) => (
              <motion.div
                key={feature.titleKey}
                variants={staggerItem}
                transition={spring}
                animate={floatSubtle(index)}
                whileHover={{ y: -8, scale: 1.02, transition: springSoft }}
                className={`relative rounded-2xl border p-6 text-start transition-shadow ${
                  feature.highlight
                    ? 'border-primary/40 bg-primary/5 shadow-lg shadow-primary/10'
                    : 'border-border/50 bg-card hover:shadow-lg'
                }`}
              >
                {feature.highlight && (
                  <span className="absolute top-4 end-4 text-xs font-semibold text-primary bg-primary/15 px-2 py-1 rounded-full">
                    {t('public:home.tryItBelow')}
                  </span>
                )}
                <motion.div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${
                    feature.highlight ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'
                  }`}
                  whileHover={{ scale: 1.15, rotate: 5 }}
                  transition={springSoft}
                >
                  <feature.icon className="h-6 w-6" />
                </motion.div>
                <h3 className="text-xl font-semibold text-foreground">{t(`public:${feature.titleKey}`)}</h3>
                <p className="text-foreground/90 mt-2 text-sm leading-relaxed">{t(`public:${feature.descKey}`)}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Trust — partner strip + reliability badges */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className={cn('space-y-8', band.glow)}
        >
          <div className="text-center max-w-2xl mx-auto">
            <motion.p variants={staggerItem} transition={spring} className="text-xs font-semibold uppercase tracking-wider text-primary/90 mb-2">
              {t('public:home.trustedWorldwide')}
            </motion.p>
            <motion.h2 variants={staggerItem} transition={spring} className="text-2xl sm:text-3xl font-bold text-foreground">
              {t('public:home.trustHeading')}
            </motion.h2>
            <motion.p variants={staggerItem} transition={spring} className="text-muted-foreground mt-2 text-sm sm:text-base">
              {t('public:home.trustSubtitle')}
            </motion.p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {TRUST_PARTNERS.map((p) => (
              <motion.div
                key={p.nameKey}
                variants={staggerItem}
                transition={spring}
                whileHover={{ y: -4, transition: springSoft }}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 px-4 py-3 shadow-sm backdrop-blur-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-primary/10 text-xs font-bold text-primary ring-1 ring-primary/20">
                  {p.initials}
                </div>
                <span className="text-sm font-semibold text-foreground/90">{t(`public:${p.nameKey}`)}</span>
              </motion.div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
            {TRUST_BADGES.map(({ labelKey, icon: Icon }) => (
              <motion.div
                key={labelKey}
                variants={staggerItem}
                transition={spring}
                className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-3 py-3 text-start"
              >
                <Icon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-medium text-foreground/85 leading-snug">{t(`public:${labelKey}`)}</span>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* How it works — scroll-in + hover lift */}
        <motion.section
          id="how-it-works"
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className={cn('space-y-10', band.deep)}
        >
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <motion.div variants={staggerItem} transition={spring} className="flex justify-center">
              <SectionLabel>{t('public:home.sectionLabels.journey')}</SectionLabel>
            </motion.div>
            <motion.h2 variants={staggerItem} transition={spring} className="text-3xl font-bold text-foreground">{t('public:home.howItWorksTitle')}</motion.h2>
            <motion.p variants={staggerItem} transition={spring} className="text-foreground/90 mt-2 leading-relaxed">{t('public:home.howItWorksSubtitle')}</motion.p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((item, index) => (
              <motion.div
                key={item.step}
                variants={staggerItem}
                transition={spring}
                animate={floatSubtle(index + 2)}
                whileHover={{ y: -10, scale: 1.03, transition: springSoft }}
                className="relative text-center p-6 rounded-2xl border border-border/50 bg-card hover:shadow-xl hover:shadow-primary/5 transition-shadow"
              >
                <motion.div
                  className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/15 text-primary mb-4"
                  animate={iconPulse}
                  whileHover={{ scale: 1.2, rotate: 8 }}
                  transition={springSoft}
                >
                  <item.icon className="h-6 w-6" />
                </motion.div>
                <h3 className="text-xl font-semibold">{t(`public:${item.titleKey}`)}</h3>
                <p className="text-foreground/90 mt-2 text-sm leading-relaxed">{t(`public:${item.descKey}`)}</p>
                {index < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-border" aria-hidden />
                )}
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Features grid — stagger + hover */}
        <motion.section
          id="features"
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className={cn('space-y-10', band.wash)}
        >
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <motion.div variants={staggerItem} transition={spring} className="flex justify-center">
              <SectionLabel>{t('public:home.sectionLabels.whyUs')}</SectionLabel>
            </motion.div>
            <motion.h2 variants={staggerItem} transition={spring} className="text-3xl font-bold text-foreground">{t('public:home.whyTitle')}</motion.h2>
            <motion.p variants={staggerItem} transition={spring} className="text-foreground/90 mt-2 leading-relaxed">{t('public:home.whySubtitle')}</motion.p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.titleKey}
                variants={staggerItem}
                transition={spring}
                animate={floatSubtle(i + 1)}
                whileHover={{ y: -6, scale: 1.02, transition: springSoft }}
                className="flex gap-4 p-4 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-md transition-shadow"
              >
                <motion.div
                  className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"
                  whileHover={{ scale: 1.15, rotate: 6 }}
                  transition={springSoft}
                >
                  <feature.icon className="h-5 w-5 text-primary" />
                </motion.div>
                <div>
                  <h3 className="font-semibold">{t(`public:${feature.titleKey}`)}</h3>
                  <p className="text-sm text-foreground/90 mt-1 leading-relaxed">{t(`public:${feature.descKey}`)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Audience pills — animated description */}
        <motion.section
          id="audience"
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className={cn('space-y-6', band.card)}
        >
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <motion.div variants={staggerItem} transition={spring} className="flex justify-center">
              <SectionLabel>{t('public:home.sectionLabels.audience')}</SectionLabel>
            </motion.div>
            <motion.h2 variants={staggerItem} transition={spring} className="text-3xl font-bold text-foreground">{t('public:home.audienceTitle')}</motion.h2>
            <motion.p variants={staggerItem} transition={spring} className="text-foreground/90 mt-2 leading-relaxed">{t('public:home.audienceSubtitle')}</motion.p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {AUDIENCES.map((a) => (
              <motion.button
                key={a.id}
                type="button"
                onClick={() => setAudienceActive(a.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  audienceActive === a.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
                whileTap={{ scale: 0.96 }}
                transition={springSoft}
              >
                {t(`public:${a.labelKey}`)}
              </motion.button>
            ))}
          </div>
          <div className="max-w-xl mx-auto text-center min-h-[3rem]">
            <AnimatePresence mode="wait">
              {AUDIENCES.map((a) =>
                audienceActive === a.id ? (
                  <motion.p
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={springSoft}
                    className="text-foreground/80"
                  >
                    {t(`public:${a.descKey}`)}
                  </motion.p>
                ) : null
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* Categories — stagger chips */}
        <motion.section
          id="categories"
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className={cn('space-y-6 relative z-10', band.stripe)}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-2">
              <motion.div variants={staggerItem} transition={spring}>
                <SectionLabel>{t('public:home.sectionLabels.topics')}</SectionLabel>
              </motion.div>
              <motion.h2 variants={staggerItem} transition={spring} className="text-3xl font-bold text-foreground">{t('public:home.topicsTitle')}</motion.h2>
              <motion.p variants={staggerItem} transition={spring} className="text-foreground/90 mt-2 leading-relaxed">{t('public:home.topicsSubtitle')}</motion.p>
            </div>
            <motion.div variants={staggerItem} transition={spring}>
              <Button asChild variant="ghost">
                <Link to="/courses">{t('public:home.viewAllCourses')} <ArrowRight className="ms-2 h-4 w-4" /></Link>
              </Button>
            </motion.div>
          </div>
          <div className="flex flex-wrap gap-3">
            {CATEGORIES.map((cat) => (
              <motion.div
                key={cat.slug}
                variants={staggerItem}
                transition={spring}
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <Link
                  to={`/courses?category=${encodeURIComponent(cat.slug)}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-colors text-sm font-medium"
                >
                  <cat.icon className="h-4 w-4 text-primary" />
                  {t(`public:${cat.nameKey}`)}
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Featured Courses — scroll-in cards + hover lift */}
        <motion.section
          id="featured"
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className={cn('space-y-6', band.glow)}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-2">
              <motion.div variants={staggerItem} transition={spring}>
                <SectionLabel>{t('public:home.sectionLabels.curated')}</SectionLabel>
              </motion.div>
              <motion.h2 variants={staggerItem} transition={spring} className="text-3xl font-bold text-foreground">{t('public:home.featuredTitle')}</motion.h2>
              <motion.p variants={staggerItem} transition={spring} className="text-foreground/90 mt-2 leading-relaxed">{t('public:home.featuredSubtitle')}</motion.p>
            </div>
            <motion.div variants={staggerItem} transition={spring}>
              <Button asChild variant="ghost">
                <Link to="/courses">{t('public:home.viewAll')} <ArrowRight className="ms-2 h-4 w-4" /></Link>
              </Button>
            </motion.div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse overflow-hidden">
                  <div className="h-48 bg-muted" />
                  <CardHeader>
                    <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="flex justify-between">
                      <div className="h-4 bg-muted rounded w-16" />
                      <div className="h-4 bg-muted rounded w-12" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featuredCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredCourses.map((course, index) => (
                <motion.div
                  key={course.id}
                  variants={staggerItem}
                  transition={spring}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={viewportOnce}
                  whileHover={{ y: -10, scale: 1.02, transition: springSoft }}
                  className="cursor-pointer"
                >
                  <Card className="h-full hover:shadow-2xl hover:shadow-primary/10 transition-shadow duration-300 group overflow-hidden border-2 hover:border-primary/50">
                    <Link to={`/courses/${course.id}`}>
                      <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
                        {course.thumbnailUrl ? (
                          <>
                            <img
                              src={course.thumbnailUrl}
                              alt={course.title}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              onError={(e) => {
                                const el = e.target as HTMLImageElement;
                                el.style.display = 'none';
                                const next = el.nextElementSibling as HTMLElement;
                                if (next) next.style.display = 'flex';
                              }}
                            />
                            <div className="w-full h-full items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10" style={{ display: 'none' }}>
                              <BookOpen className="h-16 w-16 text-primary/40" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10">
                            <BookOpen className="h-16 w-16 text-primary/40" />
                          </div>
                        )}
                        {course.isFeatured && (
                          <Badge className="absolute top-3 end-3 shadow-lg">{t('public:courses.featured')}</Badge>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
                      </div>
                      <CardHeader>
                        <div className="flex-1">
                          <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors text-lg">
                            {course.title}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            {course.instructorName} • {course.category}
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-foreground/90 line-clamp-2 leading-relaxed">{course.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{formatRating(course.rating)}</span>
                            <span className="text-xs text-foreground/75">({course.ratingCount})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{course.level}</Badge>
                            {course.price ? (
                              <span className="text-sm font-bold text-primary">${course.price.toFixed(2)}</span>
                            ) : (
                              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">{t('public:courses.free')}</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-foreground/90 leading-relaxed">
              {t('public:home.noFeaturedAvailable')}
            </div>
          )}
        </motion.section>

        {/* Top Rated Courses */}
        <motion.section
          id="top-rated"
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className={cn('space-y-6', band.deep)}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-2">
              <motion.div variants={staggerItem} transition={spring}>
                <SectionLabel>{t('public:home.sectionLabels.trending')}</SectionLabel>
              </motion.div>
              <motion.h2 variants={staggerItem} transition={spring} className="text-3xl font-bold flex items-center gap-2">
                <TrendingUp className="h-8 w-8 text-primary" />
                {t('public:home.topRatedTitle')}
              </motion.h2>
              <motion.p variants={staggerItem} transition={spring} className="text-foreground/90 mt-2 leading-relaxed">{t('public:home.topRatedSubtitle')}</motion.p>
            </div>
            <motion.div variants={staggerItem} transition={spring}>
              <Button asChild variant="ghost">
                <Link to="/courses?sortBy=rating&sortDescending=true">{t('public:home.viewAll')} <ArrowRight className="ms-2 h-4 w-4" /></Link>
              </Button>
            </motion.div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse overflow-hidden">
                  <div className="h-48 bg-muted" />
                  <CardHeader>
                    <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="flex justify-between">
                      <div className="h-4 bg-muted rounded w-16" />
                      <div className="h-4 bg-muted rounded w-12" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : topRatedCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topRatedCourses.map((course, index) => (
                <motion.div
                  key={course.id}
                  variants={staggerItem}
                  transition={spring}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={viewportOnce}
                  whileHover={{ y: -10, scale: 1.02, transition: springSoft }}
                  className="cursor-pointer"
                >
                  <Card className="h-full hover:shadow-2xl hover:shadow-primary/10 transition-shadow duration-300 group overflow-hidden border-2 hover:border-primary/50">
                    <Link to={`/courses/${course.id}`}>
                      <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
                        {course.thumbnailUrl ? (
                          <>
                            <img
                              src={course.thumbnailUrl}
                              alt={course.title}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              onError={(e) => {
                                const el = e.target as HTMLImageElement;
                                el.style.display = 'none';
                                const next = el.nextElementSibling as HTMLElement;
                                if (next) next.style.display = 'flex';
                              }}
                            />
                            <div className="w-full h-full items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10" style={{ display: 'none' }}>
                              <BookOpen className="h-16 w-16 text-primary/40" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10">
                            <BookOpen className="h-16 w-16 text-primary/40" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
                      </div>
                      <CardHeader>
                        <div className="flex-1">
                          <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors text-lg">
                            {course.title}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            {course.instructorName} • {course.category}
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-foreground/90 line-clamp-2 leading-relaxed">{course.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{formatRating(course.rating)}</span>
                            <span className="text-xs text-foreground/75">({course.ratingCount})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{course.level}</Badge>
                            {course.price ? (
                              <span className="text-sm font-bold text-primary">${course.price.toFixed(2)}</span>
                            ) : (
                              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">{t('public:courses.free')}</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-foreground/90 leading-relaxed">
              {t('public:home.noTopRatedAvailable')}
            </div>
          )}
        </motion.section>

        {/* Testimonials — stagger + hover lift */}
        <motion.section
          id="testimonials"
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className={cn('space-y-8', band.wash)}
        >
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <motion.div variants={staggerItem} transition={spring} className="flex justify-center">
              <SectionLabel>{t('public:home.sectionLabels.socialProof')}</SectionLabel>
            </motion.div>
            <motion.h2 variants={staggerItem} transition={spring} className="text-3xl font-bold text-foreground">{t('public:home.testimonialsTitle')}</motion.h2>
            <motion.p variants={staggerItem} transition={spring} className="text-foreground/90 mt-2 leading-relaxed">{t('public:home.testimonialsSubtitle')}</motion.p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((tst, i) => {
              const name = t(`public:${tst.nameKey}`);
              return (
              <motion.div
                key={tst.nameKey}
                variants={staggerItem}
                transition={spring}
                animate={floatSubtle(i + 2)}
                whileHover={{ y: -8, scale: 1.02, transition: springSoft }}
                className="p-6 rounded-2xl border border-border/50 bg-card hover:shadow-xl hover:shadow-primary/5"
              >
                <motion.div whileHover={{ scale: 1.1, rotate: 5 }} transition={springSoft}>
                  <Quote className="h-8 w-8 text-primary/30 mb-4" />
                </motion.div>
                <p className="text-foreground mb-4 leading-relaxed">&ldquo;{t(`public:${tst.quoteKey}`)}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-sm">
                    {name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-medium">{name}</div>
                    <div className="text-sm text-foreground/90 leading-relaxed">{t(`public:${tst.roleKey}`)}</div>
                  </div>
                </div>
              </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Instructors — stagger + hover */}
        <motion.section
          id="instructors"
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className={cn('space-y-6', band.card)}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-2">
              <motion.div variants={staggerItem} transition={spring}>
                <SectionLabel>{t('public:home.sectionLabels.experts')}</SectionLabel>
              </motion.div>
              <motion.h2 variants={staggerItem} transition={spring} className="text-3xl font-bold text-foreground">{t('public:home.instructorsTitle')}</motion.h2>
              <motion.p variants={staggerItem} transition={spring} className="text-foreground/90 mt-2 leading-relaxed">{t('public:home.instructorsSubtitle')}</motion.p>
            </div>
            <motion.div variants={staggerItem} transition={spring}>
              <Button asChild variant="ghost">
                <Link to="/courses">{t('public:home.viewAllCourses')} <ArrowRight className="ms-2 h-4 w-4" /></Link>
              </Button>
            </motion.div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {INSTRUCTORS.map((inst) => (
              <motion.div
                key={inst.nameKey}
                variants={staggerItem}
                transition={spring}
                whileHover={{ scale: 1.04, y: -4, transition: springSoft }}
                whileTap={{ scale: 0.99 }}
                className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold">
                  {inst.initials}
                </div>
                <div>
                  <div className="font-medium">{t(`public:${inst.nameKey}`)}</div>
                  <div className="text-sm text-foreground/90 leading-relaxed">{t(`public:${inst.subjectKey}`)}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Live activity ticker — crossfade messages */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={spring}
          className="py-5 px-5 sm:px-6 rounded-2xl bg-gradient-to-r from-primary/[0.12] via-primary/[0.06] to-ring/[0.1] border border-primary/25 overflow-hidden shadow-md"
        >
          <div className="flex items-center gap-2 text-sm text-foreground/85">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="relative inline-block min-w-[200px] min-h-[1.25rem] ps-1">
              <AnimatePresence mode="wait">
                <motion.span
                  key={activityIndex}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                  className="block"
                >
                  {t('public:home.liveLabel')} {t(`public:${ACTIVITY_MESSAGE_KEYS[activityIndex]}`)}
                </motion.span>
              </AnimatePresence>
            </span>
          </div>
        </motion.section>

        {/* FAQ — fade-in section */}
        <motion.section
          id="faq"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={spring}
          className={cn('space-y-6 max-w-3xl mx-auto', band.glow)}
        >
          <div className="text-center space-y-3">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={spring}
              className="flex justify-center"
            >
              <SectionLabel>{t('public:home.sectionLabels.faq')}</SectionLabel>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={spring}
              className="text-3xl font-bold text-foreground"
            >
              {t('public:home.faqTitle')}
            </motion.h2>
            <p className="text-foreground/90 mt-2 leading-relaxed">{t('public:home.faqSubtitle')}</p>
          </div>
          <Accordion className="space-y-2">
            {FAQ_ITEMS.map((item) => (
              <AccordionItem key={item.id} id={item.id}>
                <AccordionTrigger>{t(`public:${item.qKey}`)}</AccordionTrigger>
                <AccordionContent>{t(`public:${item.aKey}`)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.section>

        {/* Email capture — scroll-in */}
        <motion.section
          id="newsletter"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={spring}
          className={cn('max-w-xl mx-auto text-center space-y-4', band.deep)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={viewportOnce}
            transition={springSoft}
          >
            <Mail className="h-10 w-10 text-primary mx-auto" />
          </motion.div>
          <div className="flex justify-center">
            <SectionLabel>{t('public:home.sectionLabels.newsletter')}</SectionLabel>
          </div>
          <h2 className="text-2xl font-bold text-foreground">{t('public:home.newsletterTitle')}</h2>
          <p className="text-foreground/90 text-sm leading-relaxed">
            {t('public:home.newsletterBody')}
          </p>
          <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <Input
              type="email"
              placeholder={t('public:home.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
              disabled={emailSubmitting}
            />
            <Button type="submit" disabled={emailSubmitting}>
              {emailSubmitting ? t('public:home.subscribing') : t('public:home.subscribe')}
            </Button>
          </form>
        </motion.section>

        {/* Final CTA — scale-in */}
        <motion.section
          id="final-cta"
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={viewportOnce}
          transition={spring}
          className="text-center py-16 px-6 sm:px-10 rounded-[2rem] bg-gradient-to-br from-primary/20 via-primary/12 to-ring/15 border border-primary/30 shadow-[0_24px_80px_-20px_hsl(var(--primary)/0.4)]"
        >
          <motion.h2
            className="text-3xl font-bold text-foreground"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={spring}
          >
            {t('public:home.finalCtaTitle')}
          </motion.h2>
          <p className="text-foreground/90 mt-2 max-w-lg mx-auto leading-relaxed">
            {t('public:home.finalCtaBody')}
          </p>
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center mt-8"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ ...spring, delay: 0.1 }}
          >
            <Button asChild size="lg" className="text-lg px-8">
              <Link to="/register">{t('public:home.createFreeAccount')}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-8">
              <Link to="/courses">{t('public:home.browseCoursesCta')}</Link>
            </Button>
          </motion.div>
        </motion.section>
      </div>

      {/* Theme celebration: wizard, firework to logo, color sweep */}
      {celebration && (
        <ThemeCelebration
          celebration={celebration}
          onComplete={setCelebration}
          setTheme={setTheme}
        />
      )}

      {/* Floating theme & color customizer — test the page look live */}
      <div className="fixed bottom-6 end-6 z-50 flex flex-col items-end gap-2">
        <AnimatePresence>
          {themePanelOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-sm rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-sm flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  {t('public:home.customizePanel.title')}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setThemePanelOpen(false)}
                  aria-label={t('common:close')}
                >
                  <ChevronDown className="h-4 w-4 rotate-180" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {t('public:home.customizePanel.description')}
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {THEMES.filter((th) => th.id !== 'custom').map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => {
                      setCelebration({ phase: 'wizard', theme: th.id as ThemeId });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      theme === th.id && !mixTheme
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary/50'
                        : 'bg-muted/80 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {th.label}
                  </button>
                ))}
              </div>
              <div className="pt-2 border-t border-border/50">
                <ColorPicker
                  placement="top"
                  value={customThemeColor ?? 'hsl(222, 84%, 60%)'}
                  onChange={(color) => {
                    setCustomThemeColor(color);
                    toast.success(t('public:home.customColorApplied'));
                  }}
                  onClose={() => {}}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          type="button"
          onClick={() => setThemePanelOpen((o) => !o)}
          className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-3 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow"
          animate={{ y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          whileHover={{ scale: 1.06, y: 0 }}
          whileTap={{ scale: 0.98 }}
          aria-label={themePanelOpen ? t('public:home.customizePanel.closeAria') : t('public:home.customizePanel.openAria')}
        >
          <motion.span animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}>
            <Palette className="h-5 w-5" />
          </motion.span>
          <span className="font-medium text-sm">{themePanelOpen ? t('public:home.customizePanel.toggleClose') : t('public:home.customizePanel.toggleOpen')}</span>
        </motion.button>
      </div>
    </div>
  );
}

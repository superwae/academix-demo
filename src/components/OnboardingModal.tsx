import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '../lib/cn';
import { onboardingService, type OnboardingCategoryDto, type UserInterestDto } from '../services/onboardingService';
import i18nInstance from '../i18n';
import { toast } from 'sonner';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Code,
  Database,
  Palette,
  Cloud,
  Smartphone,
  Shield,
  TrendingUp,
  Gamepad2,
  Brain,
  BookOpen,
  BarChart,
  Briefcase,
  User,
  Atom
} from 'lucide-react';

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
  userId?: string;
}

// The interest categories come from the backend in English. Until the API is
// localized, map the known names to Arabic so the onboarding modal isn't a
// block of English under an Arabic UI.
const ONBOARDING_CATEGORY_AR: Record<string, { name: string; description: string }> = {
  'Business & Management': { name: 'الأعمال والإدارة', description: 'استراتيجية الأعمال والقيادة ومهارات الإدارة' },
  'Data Science & Analytics': { name: 'علم البيانات والتحليلات', description: 'تحليل البيانات والتمثيل المرئي والتعلّم الآلي' },
  'Technology & Programming': { name: 'التقنية والبرمجة', description: 'تطوير البرمجيات وتطوير الويب ومهارات تقنية المعلومات' },
  'Science & Mathematics': { name: 'العلوم والرياضيات', description: 'المفاهيم العلمية والأسس الرياضية' },
  'Personal Development': { name: 'التطوير الشخصي', description: 'المهارات الناعمة والإنتاجية والنمو الشخصي' },
  'Design & Creative': { name: 'التصميم والإبداع', description: 'تصميم واجهات المستخدم والتصميم الجرافيكي والمهارات الإبداعية' },
};

function localizeOnboardingCategories(cats: OnboardingCategoryDto[]): OnboardingCategoryDto[] {
  if (!(i18nInstance.language || '').toLowerCase().startsWith('ar')) return cats;
  return cats.map((c) => {
    const tr = ONBOARDING_CATEGORY_AR[(c.name || '').trim()];
    return tr ? { ...c, name: tr.name, description: tr.description } : c;
  });
}

const categoryIcons: Record<string, React.ReactNode> = {
  // Backend icon names
  'code': <Code className="h-6 w-6" />,
  'barchart': <BarChart className="h-6 w-6" />,
  'briefcase': <Briefcase className="h-6 w-6" />,
  'palette': <Palette className="h-6 w-6" />,
  'user': <User className="h-6 w-6" />,
  'atom': <Atom className="h-6 w-6" />,
  // Fallback frontend icon names
  'programming': <Code className="h-6 w-6" />,
  'data-science': <Database className="h-6 w-6" />,
  'design': <Palette className="h-6 w-6" />,
  'cloud': <Cloud className="h-6 w-6" />,
  'mobile': <Smartphone className="h-6 w-6" />,
  'security': <Shield className="h-6 w-6" />,
  'marketing': <TrendingUp className="h-6 w-6" />,
  'game-dev': <Gamepad2 className="h-6 w-6" />,
  'ai': <Brain className="h-6 w-6" />,
  'default': <BookOpen className="h-6 w-6" />,
};

function getCategoryIcon(iconName: string) {
  return categoryIcons[iconName.toLowerCase()] || categoryIcons['default'];
}

export function OnboardingModal({ open, onComplete, userId }: OnboardingModalProps) {
  const { t } = useTranslation(['student', 'common']);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data from API
  const [categories, setCategories] = useState<OnboardingCategoryDto[]>([]);
  const [learningGoalOptions, setLearningGoalOptions] = useState<string[]>([]);
  const [experienceLevels, setExperienceLevels] = useState<string[]>([]);

  // User selections
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedTopics, setSelectedTopics] = useState<Map<string, Set<string>>>(new Map());
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());
  const [experienceLevel, setExperienceLevel] = useState<string>('');
  const [weeklyHours, setWeeklyHours] = useState<number>(5);

  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await onboardingService.getCategories();
      setCategories(localizeOnboardingCategories(response.categories || []));
      setLearningGoalOptions(response.learningGoalOptions || [
        t('student:components.onboarding.goals.career'),
        t('student:components.onboarding.goals.newSkills'),
        t('student:components.onboarding.goals.newCareer'),
        t('student:components.onboarding.goals.personal'),
        t('student:components.onboarding.goals.academic'),
        t('student:components.onboarding.goals.industry'),
      ]);
      setExperienceLevels(response.experienceLevels || [
        t('student:components.onboarding.levels.beginner'),
        t('student:components.onboarding.levels.some'),
        t('student:components.onboarding.levels.intermediate'),
        t('student:components.onboarding.levels.advanced'),
        t('student:components.onboarding.levels.expert'),
      ]);
    } catch (error) {
      console.error('Failed to load onboarding categories:', error);
      // Use fallback data if API fails
      setCategories([
        { id: 'programming', name: t('student:components.onboarding.fallbackCategories.programmingName'), description: t('student:components.onboarding.fallbackCategories.programmingDesc'), icon: 'programming', topics: ['JavaScript', 'Python', 'React', 'Node.js', 'TypeScript'] },
        { id: 'data-science', name: t('student:components.onboarding.fallbackCategories.dataScienceName'), description: t('student:components.onboarding.fallbackCategories.dataScienceDesc'), icon: 'data-science', topics: ['Machine Learning', 'Python', 'SQL', 'Data Analysis', 'Statistics'] },
        { id: 'design', name: t('student:components.onboarding.fallbackCategories.designName'), description: t('student:components.onboarding.fallbackCategories.designDesc'), icon: 'design', topics: ['UI/UX', 'Figma', 'Adobe XD', 'Graphic Design', 'User Research'] },
        { id: 'cloud', name: t('student:components.onboarding.fallbackCategories.cloudName'), description: t('student:components.onboarding.fallbackCategories.cloudDesc'), icon: 'cloud', topics: ['AWS', 'Azure', 'DevOps', 'Docker', 'Kubernetes'] },
        { id: 'mobile', name: t('student:components.onboarding.fallbackCategories.mobileName'), description: t('student:components.onboarding.fallbackCategories.mobileDesc'), icon: 'mobile', topics: ['Flutter', 'React Native', 'iOS', 'Android', 'Swift'] },
        { id: 'security', name: t('student:components.onboarding.fallbackCategories.securityName'), description: t('student:components.onboarding.fallbackCategories.securityDesc'), icon: 'security', topics: ['Ethical Hacking', 'Network Security', 'Penetration Testing', 'Security Compliance'] },
      ]);
      setLearningGoalOptions([
        t('student:components.onboarding.goals.career'),
        t('student:components.onboarding.goals.newSkills'),
        t('student:components.onboarding.goals.newCareer'),
        t('student:components.onboarding.goals.personal'),
        t('student:components.onboarding.goals.academic'),
        t('student:components.onboarding.goals.industry'),
      ]);
      setExperienceLevels([
        t('student:components.onboarding.levels.beginner'),
        t('student:components.onboarding.levels.some'),
        t('student:components.onboarding.levels.intermediate'),
        t('student:components.onboarding.levels.advanced'),
        t('student:components.onboarding.levels.expert'),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
      // Also remove topics for this category
      const newTopics = new Map(selectedTopics);
      newTopics.delete(categoryId);
      setSelectedTopics(newTopics);
    } else {
      newSelected.add(categoryId);
    }
    setSelectedCategories(newSelected);
  };

  const toggleTopic = (categoryId: string, topic: string) => {
    const newTopics = new Map(selectedTopics);
    const categoryTopics = newTopics.get(categoryId) || new Set();

    if (categoryTopics.has(topic)) {
      categoryTopics.delete(topic);
    } else {
      categoryTopics.add(topic);
    }

    newTopics.set(categoryId, categoryTopics);
    setSelectedTopics(newTopics);
  };

  const toggleGoal = (goal: string) => {
    const newGoals = new Set(selectedGoals);
    if (newGoals.has(goal)) {
      newGoals.delete(goal);
    } else {
      newGoals.add(goal);
    }
    setSelectedGoals(newGoals);
  };

  const handleComplete = async () => {
    try {
      setSaving(true);

      // Build interests array
      // IMPORTANT: Send category.id (e.g., "business") not category.name (e.g., "Business & Management")
      // because the backend CategoryMapping uses IDs as keys for course category expansion
      const interests: UserInterestDto[] = Array.from(selectedCategories).map(categoryId => {
        return {
          category: categoryId, // Use ID for proper category mapping in backend
          topics: Array.from(selectedTopics.get(categoryId) || []),
          interestScore: 5,
        };
      });

      await onboardingService.saveUserInterests({
        interests,
        learningGoals: Array.from(selectedGoals),
        experienceLevel: experienceLevel || undefined,
        weeklyTimeCommitment: weeklyHours,
      });

      await onboardingService.completeOnboarding();

      toast.success(t('student:components.onboarding.welcomeTitle'), {
        description: t('student:components.onboarding.welcomeBody'),
      });

      onComplete();
    } catch (error) {
      console.error('Failed to save onboarding data:', error);
      toast.error(t('student:components.onboarding.saveFailedTitle'), {
        description: t('student:components.onboarding.saveFailedBody'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    // Store that user skipped onboarding in localStorage (per user)
    // This prevents showing the modal again for this user
    if (userId) {
      localStorage.setItem(`onboarding_skipped_${userId}`, 'true');
    }
    onComplete();
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedCategories.size > 0;
      case 2:
        return true; // Topics are optional
      case 3:
        return selectedGoals.size > 0 || experienceLevel;
      default:
        return true;
    }
  };

  const totalSteps = 3;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="h-[min(860px,calc(100dvh-2rem))] max-h-[92dvh] overflow-hidden p-0 sm:w-[min(1120px,calc(100vw-2rem))] sm:max-w-5xl">
        {loading ? (
          <div className="flex h-full items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            {/* Header */}
            <DialogHeader className="border-b p-4 pb-3 sm:p-6 sm:pb-4">
              <div className="flex items-start gap-3 pe-8 sm:items-center">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-cyan-500 text-primary-foreground shadow-lg shadow-primary/20">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-lg sm:text-xl">{t('student:components.onboarding.title')}</DialogTitle>
                  <DialogDescription className="max-w-3xl">
                    {t('student:components.onboarding.subtitle')}
                  </DialogDescription>
                </div>
              </div>
              {/* Progress bar */}
              <div className="flex gap-2 mt-4">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1.5 flex-1 rounded-full transition-colors',
                      i + 1 <= step ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                ))}
              </div>
            </DialogHeader>

            {/* Content */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <h3 className="font-semibold text-lg">{t('student:components.onboarding.step1Heading')}</h3>
                    <p className="text-sm text-muted-foreground">{t('student:components.onboarding.step1Subtitle')}</p>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => toggleCategory(category.id)}
                          className={cn(
                            'min-h-[112px] w-full rounded-xl border-2 p-4 text-start transition-all hover:shadow-md',
                            selectedCategories.has(category.id)
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
                              selectedCategories.has(category.id)
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            )}>
                              {getCategoryIcon(category.icon)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-2 font-medium leading-snug">
                                <span className="min-w-0 flex-1">{category.name}</span>
                                {selectedCategories.has(category.id) && (
                                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                )}
                              </div>
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                                {category.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="font-semibold text-lg">{t('student:components.onboarding.step2Heading')}</h3>
                      <p className="text-sm text-muted-foreground">{t('student:components.onboarding.step2Subtitle')}</p>
                    </div>
                    {Array.from(selectedCategories).map((categoryId) => {
                      const category = categories.find(c => c.id === categoryId);
                      if (!category) return null;

                      return (
                        <div key={categoryId} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              {getCategoryIcon(category.icon)}
                            </div>
                            <span className="font-medium">{category.name}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {category.topics.map((topic) => {
                              const isSelected = selectedTopics.get(categoryId)?.has(topic);
                              return (
                                <Badge
                                  key={topic}
                                  variant={isSelected ? 'default' : 'outline'}
                                  className={cn(
                                    'cursor-pointer transition-all hover:scale-105',
                                    isSelected && 'bg-primary'
                                  )}
                                  onClick={() => toggleTopic(categoryId, topic)}
                                >
                                  {topic}
                                  {isSelected && <Check className="ms-1 h-3 w-3" />}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="font-semibold text-lg">{t('student:components.onboarding.step3Heading')}</h3>
                      <p className="text-sm text-muted-foreground">{t('student:components.onboarding.step3Subtitle')}</p>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium">{t('student:components.onboarding.learningGoalsLabel')}</label>
                      <div className="flex flex-wrap gap-2">
                        {learningGoalOptions.map((goal) => {
                          const isSelected = selectedGoals.has(goal);
                          return (
                            <Badge
                              key={goal}
                              variant={isSelected ? 'default' : 'outline'}
                              className={cn(
                                'cursor-pointer transition-all hover:scale-105',
                                isSelected && 'bg-primary'
                              )}
                              onClick={() => toggleGoal(goal)}
                            >
                              {goal}
                              {isSelected && <Check className="ms-1 h-3 w-3" />}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium">{t('student:components.onboarding.experienceLevelLabel')}</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {experienceLevels.map((level) => (
                          <button
                            key={level}
                            onClick={() => setExperienceLevel(level)}
                            className={cn(
                              'px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all',
                              experienceLevel === level
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium">
                        {t('student:components.onboarding.weeklyHoursLabel')}
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="1"
                          max="40"
                          value={weeklyHours}
                          onChange={(e) => setWeeklyHours(parseInt(e.target.value))}
                          className="flex-1 accent-primary"
                        />
                        <span className="text-sm font-medium w-20 text-end">
                          {t('student:components.onboarding.weeklyHoursValue', { count: weeklyHours })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-3 border-t p-4 pt-3 sm:flex-row sm:items-center sm:justify-between sm:p-6 sm:pt-4">
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={saving}
                className="justify-center sm:justify-start"
              >
                {t('student:components.onboarding.skipForNow')}
              </Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {step > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    disabled={saving}
                  >
                    <ChevronLeft className="h-4 w-4 me-1" />
                    {t('student:components.onboarding.back')}
                  </Button>
                )}
                {step < totalSteps ? (
                  <Button
                    onClick={() => setStep(step + 1)}
                    disabled={!canProceed()}
                    className="sm:min-w-28"
                  >
                    {t('student:components.onboarding.next')}
                    <ChevronRight className="h-4 w-4 ms-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleComplete}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 me-2 animate-spin" />
                        {t('student:components.onboarding.saving')}
                      </>
                    ) : (
                      <>
                        {t('student:components.onboarding.getStarted')}
                        <Sparkles className="h-4 w-4 ms-1" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

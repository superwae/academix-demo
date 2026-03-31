import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '../lib/cn';
import { onboardingService, type OnboardingCategoryDto, type UserInterestDto } from '../services/onboardingService';
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
      setCategories(response.categories || []);
      setLearningGoalOptions(response.learningGoalOptions || [
        'Career advancement',
        'Learn new skills',
        'Start a new career',
        'Personal interest',
        'Academic requirements',
        'Stay updated with industry'
      ]);
      setExperienceLevels(response.experienceLevels || [
        'Complete beginner',
        'Some experience',
        'Intermediate',
        'Advanced',
        'Expert'
      ]);
    } catch (error) {
      console.error('Failed to load onboarding categories:', error);
      // Use fallback data if API fails
      setCategories([
        { id: 'programming', name: 'Programming', description: 'Learn coding and software development', icon: 'programming', topics: ['JavaScript', 'Python', 'React', 'Node.js', 'TypeScript'] },
        { id: 'data-science', name: 'Data Science', description: 'Analytics, ML, and data visualization', icon: 'data-science', topics: ['Machine Learning', 'Python', 'SQL', 'Data Analysis', 'Statistics'] },
        { id: 'design', name: 'Design', description: 'UI/UX, graphic design, and creativity', icon: 'design', topics: ['UI/UX', 'Figma', 'Adobe XD', 'Graphic Design', 'User Research'] },
        { id: 'cloud', name: 'Cloud Computing', description: 'AWS, Azure, and cloud infrastructure', icon: 'cloud', topics: ['AWS', 'Azure', 'DevOps', 'Docker', 'Kubernetes'] },
        { id: 'mobile', name: 'Mobile Development', description: 'iOS, Android, and cross-platform apps', icon: 'mobile', topics: ['Flutter', 'React Native', 'iOS', 'Android', 'Swift'] },
        { id: 'security', name: 'Cybersecurity', description: 'Security, ethical hacking, and compliance', icon: 'security', topics: ['Ethical Hacking', 'Network Security', 'Penetration Testing', 'Security Compliance'] },
      ]);
      setLearningGoalOptions([
        'Career advancement',
        'Learn new skills',
        'Start a new career',
        'Personal interest',
        'Academic requirements',
        'Stay updated with industry'
      ]);
      setExperienceLevels([
        'Complete beginner',
        'Some experience',
        'Intermediate',
        'Advanced',
        'Expert'
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

      toast.success('Welcome to AcademiX!', {
        description: 'Your preferences have been saved. We\'ll personalize your experience.',
      });

      onComplete();
    } catch (error) {
      console.error('Failed to save onboarding data:', error);
      toast.error('Failed to save preferences', {
        description: 'Please try again or skip for now.',
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header */}
            <DialogHeader className="p-6 pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Personalize Your Experience</DialogTitle>
                  <DialogDescription>
                    Help us recommend the best courses for you
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
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <h3 className="font-semibold text-lg">What are you interested in learning?</h3>
                    <p className="text-sm text-muted-foreground">Select all categories that interest you</p>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => toggleCategory(category.id)}
                          className={cn(
                            'flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all hover:shadow-md',
                            selectedCategories.has(category.id)
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <div className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-lg',
                            selectedCategories.has(category.id)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          )}>
                            {getCategoryIcon(category.icon)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium flex items-center gap-2">
                              {category.name}
                              {selectedCategories.has(category.id) && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {category.description}
                            </p>
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
                      <h3 className="font-semibold text-lg">Select specific topics</h3>
                      <p className="text-sm text-muted-foreground">Choose topics within your selected categories</p>
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
                                  {isSelected && <Check className="ml-1 h-3 w-3" />}
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
                      <h3 className="font-semibold text-lg">Tell us about your goals</h3>
                      <p className="text-sm text-muted-foreground">This helps us recommend the right courses</p>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium">What are your learning goals?</label>
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
                              {isSelected && <Check className="ml-1 h-3 w-3" />}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium">What's your experience level?</label>
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
                        How many hours per week can you dedicate to learning?
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
                        <span className="text-sm font-medium w-20 text-right">
                          {weeklyHours} hrs/week
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-6 pt-4 border-t flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={saving}
              >
                Skip for now
              </Button>
              <div className="flex gap-2">
                {step > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    disabled={saving}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                )}
                {step < totalSteps ? (
                  <Button
                    onClick={() => setStep(step + 1)}
                    disabled={!canProceed()}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleComplete}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Get Started
                        <Sparkles className="h-4 w-4 ml-1" />
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

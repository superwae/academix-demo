import type { LessonDto, CourseSectionDto } from '../services/lessonService';

// Demo lessons data for UI/UX Design Fundamentals course
// This will be used until the backend implements lessons endpoints

export interface DemoCourseLessons {
  courseId: string;
  courseTitle: string;
  sections: {
    sectionId: string;
    title: string;
    order: number;
    lessons: LessonDto[];
  }[];
}

// Generate a consistent course ID based on title (this should match the backend)
// For now, we'll use a pattern that can be matched
const UIUX_COURSE_ID_PATTERN = /ui.*ux.*design.*fundamentals/i;

// Demo lessons organized into 3 sections
export const demoLessonsData: DemoCourseLessons = {
  courseId: '', // Will be matched dynamically
  courseTitle: 'UI/UX Design Fundamentals',
  sections: [
    {
      sectionId: 'section-1',
      title: 'Introduction to UI/UX Design',
      order: 1,
      lessons: [
        {
          id: 'lesson-1',
          sectionId: 'section-1',
          title: 'Welcome to UI/UX Design',
          description: 'An introduction to the world of user interface and user experience design. Learn what makes great design and why it matters.',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          durationMinutes: 12,
          order: 1,
          isPreview: true,
        },
        {
          id: 'lesson-2',
          sectionId: 'section-1',
          title: 'Understanding User-Centered Design',
          description: 'Explore the core principles of user-centered design and how to put users at the heart of your design process.',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
          durationMinutes: 18,
          order: 2,
          isPreview: true,
        },
        {
          id: 'lesson-3',
          sectionId: 'section-1',
          title: 'The Design Thinking Process',
          description: 'Master the five stages of design thinking: Empathize, Define, Ideate, Prototype, and Test.',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          durationMinutes: 25,
          order: 3,
          isPreview: false,
        },
        {
          id: 'lesson-4',
          sectionId: 'section-1',
          title: 'User Research Methods',
          description: 'Learn essential user research techniques including interviews, surveys, and usability testing.',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
          durationMinutes: 22,
          order: 4,
          isPreview: false,
        },
        {
          id: 'lesson-5',
          sectionId: 'section-1',
          title: 'Creating User Personas',
          description: 'Build detailed user personas to guide your design decisions and create more targeted experiences.',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
          durationMinutes: 15,
          order: 5,
          isPreview: false,
        },
      ],
    },
    {
      sectionId: 'section-2',
      title: 'Visual Design Principles',
      order: 2,
      lessons: [
        {
          id: 'lesson-6',
          sectionId: 'section-2',
          title: 'Typography Fundamentals',
          description: 'Master the art of typography: font selection, hierarchy, spacing, and readability principles.',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
          durationMinutes: 20,
          order: 6,
          isPreview: false,
        },
        {
          id: 'lesson-7',
          sectionId: 'section-2',
          title: 'Color Theory and Psychology',
          description: 'Understand how colors affect user emotions and behavior. Learn to create effective color palettes.',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
          durationMinutes: 18,
          order: 7,
          isPreview: false,
        },
        {
          id: 'lesson-8',
          sectionId: 'section-2',
          title: 'Layout and Grid Systems',
          description: 'Explore grid-based layouts, alignment principles, and how to create balanced, structured designs.',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
          durationMinutes: 24,
          order: 8,
          isPreview: false,
        },
        {
          id: 'lesson-9',
          sectionId: 'section-2',
          title: 'Visual Hierarchy and Spacing',
          description: 'Learn how to guide user attention through effective use of visual hierarchy, whitespace, and spacing.',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
          durationMinutes: 16,
          order: 9,
          isPreview: false,
        },
        {
          id: 'lesson-10',
          sectionId: 'section-2',
          title: 'Icons and Imagery',
          description: 'Best practices for selecting and using icons, images, and illustrations in your designs.',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
          durationMinutes: 19,
          order: 10,
          isPreview: false,
        },
      ],
    },
    {
      sectionId: 'section-3',
      title: 'Design Tools and Prototyping',
      order: 3,
      lessons: [
        {
          id: 'lesson-11',
          sectionId: 'section-3',
          title: 'Getting Started with Figma',
          description: 'Introduction to Figma: interface overview, essential tools, and your first design project.',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
          durationMinutes: 28,
          order: 11,
          isPreview: false,
        },
        {
          id: 'lesson-12',
          sectionId: 'section-3',
          title: 'Advanced Figma Techniques',
          description: 'Master components, auto-layout, constraints, and collaborative features in Figma.',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
          durationMinutes: 32,
          order: 12,
          isPreview: false,
        },
        {
          id: 'lesson-13',
          sectionId: 'section-3',
          title: 'Creating Interactive Prototypes',
          description: 'Build clickable prototypes to test user flows and validate design concepts before development.',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          durationMinutes: 26,
          order: 13,
          isPreview: false,
        },
        {
          id: 'lesson-14',
          sectionId: 'section-3',
          title: 'Design Systems and Component Libraries',
          description: 'Create and maintain design systems that ensure consistency across products and teams.',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
          durationMinutes: 30,
          order: 14,
          isPreview: false,
        },
        {
          id: 'lesson-15',
          sectionId: 'section-3',
          title: 'Portfolio Presentation and Case Studies',
          description: 'Learn how to present your design work effectively and create compelling case studies for your portfolio.',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          durationMinutes: 22,
          order: 15,
          isPreview: false,
        },
      ],
    },
  ],
};

// Helper function to check if a course matches UI/UX Design Fundamentals
export function isUIUXCourse(courseId: string, courseTitle: string): boolean {
  const titleLower = courseTitle.toLowerCase();
  return UIUX_COURSE_ID_PATTERN.test(courseTitle) || 
         titleLower.includes('ui/ux') ||
         titleLower.includes('ui ux') ||
         titleLower.includes('uiux') ||
         (titleLower.includes('design') && titleLower.includes('fundamental'));
}

// Get demo sections for a course
export function getDemoSections(courseId: string, courseTitle: string): CourseSectionDto[] {
  if (!isUIUXCourse(courseId, courseTitle)) {
    return [];
  }
  
  return demoLessonsData.sections.map(section => ({
    id: section.sectionId,
    courseId: courseId,
    title: section.title,
    order: section.order,
    description: `${section.lessons.length} lessons`,
  }));
}

// Get demo lessons for a section
export function getDemoLessons(courseId: string, courseTitle: string, sectionId: string): LessonDto[] {
  if (!isUIUXCourse(courseId, courseTitle)) {
    return [];
  }
  
  const section = demoLessonsData.sections.find(s => s.sectionId === sectionId);
  return section ? section.lessons : [];
}

// Get a specific demo lesson
export function getDemoLesson(lessonId: string): LessonDto | null {
  for (const section of demoLessonsData.sections) {
    const lesson = section.lessons.find(l => l.id === lessonId);
    if (lesson) {
      return lesson;
    }
  }
  return null;
}


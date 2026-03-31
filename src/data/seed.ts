import type {
  Assignment,
  Course,
  Exam,
  ExamQuestion,
  Message,
  Profile,
} from '../types/academix'

export type SeedData = {
  profile: Profile
  courses: Course[]
  assignments: Assignment[]
  exams: Exam[]
  examQuestionsByExamId: Record<string, ExamQuestion[]>
  messages: Message[]
}

export function createSeed(): SeedData {
  const courses: Course[] = [
    {
      id: 'c-ai-101',
      title: 'AI Foundations for Everyone',
      providerType: 'University',
      providerName: 'Northbridge University',
      instructor: 'Dr. Lina Farouk',
      level: 'Beginner',
      category: 'Computer Science',
      rating: 4.7,
      description:
        'A practical introduction to AI concepts, ethics, and modern applications. No prior experience required.',
      tags: ['Hybrid', 'Project-based'],
      modality: 'Hybrid',
      featured: true,
      sections: [
        {
          id: 'sec-ai-a',
          name: 'Section A',
          meetingTimes: [
            { day: 'Mon', startMin: 10 * 60, endMin: 11 * 60 + 30 },
            { day: 'Wed', startMin: 10 * 60, endMin: 11 * 60 + 30 },
          ],
          locationLabel: 'Room 2-114',
          seatsRemaining: 9,
        },
        {
          id: 'sec-ai-b',
          name: 'Section B',
          meetingTimes: [
            { day: 'Tue', startMin: 14 * 60, endMin: 15 * 60 + 30 },
            { day: 'Thu', startMin: 14 * 60, endMin: 15 * 60 + 30 },
          ],
          locationLabel: 'Zoom',
          joinUrl: 'https://example.com/zoom',
          seatsRemaining: 4,
        },
      ],
    },
    {
      id: 'c-mkt-201',
      title: 'Digital Marketing Analytics',
      providerType: 'Business',
      providerName: 'BrightEdge Academy',
      instructor: 'Sami Al-Khatib',
      level: 'Intermediate',
      category: 'Business',
      rating: 4.5,
      description:
        'Learn how to measure, attribute, and optimize campaigns using modern analytics workflows and dashboards.',
      tags: ['Online'],
      modality: 'Online',
      featured: true,
      sections: [
        {
          id: 'sec-mkt-a',
          name: 'Section A',
          meetingTimes: [
            { day: 'Mon', startMin: 12 * 60, endMin: 13 * 60 + 15 },
            { day: 'Wed', startMin: 12 * 60, endMin: 13 * 60 + 15 },
          ],
          locationLabel: 'Online (Live)',
          joinUrl: 'https://example.com/live',
          seatsRemaining: 18,
        },
        {
          id: 'sec-mkt-b',
          name: 'Section B',
          meetingTimes: [{ day: 'Thu', startMin: 18 * 60, endMin: 19 * 60 + 45 }],
          locationLabel: 'Online (Live)',
          joinUrl: 'https://example.com/live',
          seatsRemaining: 11,
        },
      ],
    },
    {
      id: 'c-bio-150',
      title: 'Human Biology: Systems & Health',
      providerType: 'School',
      providerName: 'Riverside College',
      instructor: 'Prof. Mira Haddad',
      level: 'Beginner',
      category: 'Health',
      rating: 4.3,
      description:
        'Explore core human body systems, foundational anatomy, and health case studies with interactive recitations.',
      tags: ['In-person'],
      modality: 'In-person',
      sections: [
        {
          id: 'sec-bio-a',
          name: 'Section A',
          meetingTimes: [
            { day: 'Tue', startMin: 9 * 60, endMin: 10 * 60 + 30 },
            { day: 'Thu', startMin: 9 * 60, endMin: 10 * 60 + 30 },
          ],
          locationLabel: 'Science Hall 305',
          seatsRemaining: 6,
        },
      ],
    },
    {
      id: 'c-des-310',
      title: 'Product Design Studio',
      providerType: 'University',
      providerName: 'Northbridge University',
      instructor: 'Nora Youssef',
      level: 'Advanced',
      category: 'Design',
      rating: 4.8,
      description:
        'A studio course focused on crafting delightful product experiences. Includes critique sessions and portfolio work.',
      tags: ['In-person', 'Portfolio'],
      modality: 'In-person',
      sections: [
        {
          id: 'sec-des-a',
          name: 'Section A',
          meetingTimes: [{ day: 'Fri', startMin: 13 * 60, endMin: 15 * 60 }],
          locationLabel: 'Design Lab 1',
          seatsRemaining: 3,
        },
      ],
    },
  ]

  const assignments: Assignment[] = [
    {
      id: 'a-ai-ethics',
      courseId: 'c-ai-101',
      title: 'Reflection: AI Ethics in Daily Life',
      dueAt: addDaysISO(3),
      status: 'Not Started',
      prompt:
        'Write 250–400 words about an AI system you interact with and discuss one ethical consideration.',
    },
    {
      id: 'a-mkt-attrib',
      courseId: 'c-mkt-201',
      title: 'Campaign Attribution Mini-Report',
      dueAt: addDaysISO(6),
      status: 'Draft',
      prompt:
        'Summarize attribution results using the provided CSV (demo). Explain your chosen model and one trade-off.',
    },
  ]

  const exams: Exam[] = [
    {
      id: 'e-ai-quiz-1',
      courseId: 'c-ai-101',
      title: 'AI Foundations Quiz 1',
      startsAt: addDaysISO(8),
      durationMin: 12,
    },
    {
      id: 'e-mkt-quiz-1',
      courseId: 'c-mkt-201',
      title: 'Analytics Basics Checkpoint',
      startsAt: addDaysISO(10),
      durationMin: 10,
    },
  ]

  const examQuestionsByExamId: Record<string, ExamQuestion[]> = {
    'e-ai-quiz-1': [
      {
        id: 'q1',
        prompt: 'Which is an example of supervised learning?',
        choices: [
          'Clustering customers by behavior',
          'Predicting house prices from labeled data',
          'Reducing dimensions with PCA',
          'Generating random noise',
        ],
        answerIndex: 1,
      },
      {
        id: 'q2',
        prompt: 'What is a key risk of biased training data?',
        choices: [
          'Higher battery usage',
          'Models may make unfair decisions',
          'Faster compilation',
          'Improved accuracy in all groups',
        ],
        answerIndex: 1,
      },
      {
        id: 'q3',
        prompt: 'Which metric often helps evaluate classification performance?',
        choices: ['RMSE', 'Precision/Recall', 'MAE', 'MSE'],
        answerIndex: 1,
      },
      {
        id: 'q4',
        prompt: 'A model that memorizes training data but performs poorly on new data is…',
        choices: ['Underfitting', 'Overfitting', 'Calibrated', 'Optimal'],
        answerIndex: 1,
      },
      {
        id: 'q5',
        prompt: 'A good practice for responsible AI is…',
        choices: [
          'Avoiding evaluation',
          'Ignoring user feedback',
          'Documenting model limitations',
          'Only testing on one dataset',
        ],
        answerIndex: 2,
      },
    ],
    'e-mkt-quiz-1': [
      {
        id: 'q1',
        prompt: 'What does CTR stand for?',
        choices: ['Click-Through Rate', 'Cost To Run', 'Content Traffic Ratio', 'Click Time Range'],
        answerIndex: 0,
      },
      {
        id: 'q2',
        prompt: 'Which is a common KPI for conversion-focused campaigns?',
        choices: ['Bounce rate', 'Cost per acquisition (CPA)', 'Time on page', 'Sessions'],
        answerIndex: 1,
      },
      {
        id: 'q3',
        prompt: 'Attribution aims to…',
        choices: [
          'Increase server memory',
          'Assign credit to touchpoints contributing to conversions',
          'Reduce page load speed',
          'Eliminate analytics',
        ],
        answerIndex: 1,
      },
      {
        id: 'q4',
        prompt: 'A/B testing compares…',
        choices: ['Two variants to measure impact', 'Two databases', 'Two servers', 'Two browsers only'],
        answerIndex: 0,
      },
      {
        id: 'q5',
        prompt: 'A dashboard is useful because it…',
        choices: [
          'Hides metrics',
          'Shows key metrics in a single view',
          'Deletes data',
          'Always guarantees conversions',
        ],
        answerIndex: 1,
      },
    ],
  }

  const messages: Message[] = [
    {
      id: 'm-ai-welcome',
      courseId: 'c-ai-101',
      from: 'Dr. Lina Farouk',
      subject: 'Welcome + Week 1 Prep',
      body:
        'Welcome to AI Foundations!\n\nPlease review the Week 1 slides and bring one example of AI you’ve seen this week.\n\nSee you soon.',
      sentAt: addDaysISO(-1),
    },
    {
      id: 'm-mkt-office',
      courseId: 'c-mkt-201',
      from: 'Sami Al-Khatib',
      subject: 'Office hours + dataset notes',
      body:
        'Quick note: office hours are open this week for the attribution mini-report.\n\nDataset tips: focus on channel trends and describe at least one limitation.',
      sentAt: addDaysISO(-2),
    },
    {
      id: 'm-admin',
      from: 'AcademiX',
      subject: 'Demo portal update',
      body:
        'We added a new weekly calendar view and improved course discovery.\n\nTip: Use Settings → Reset Demo Data if you want a fresh start.',
      sentAt: addDaysISO(-3),
    },
  ]

  const profile: Profile = {
    id: 'stu-001',
    name: 'Amina Hassan',
    email: 'amina.hassan@student.example',
    major: 'Information Systems',
    year: 'Year 2',
    notificationsEnabled: true,
  }

  return { profile, courses, assignments, exams, examQuestionsByExamId, messages }
}

function addDaysISO(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(10, 0, 0, 0)
  return d.toISOString()
}




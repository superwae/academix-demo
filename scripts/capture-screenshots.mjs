#!/usr/bin/env node
/**
 * Captures screenshots of AcademiX LMS pages for the presentation.
 * Requires: npm run dev (frontend) and backend running.
 * Run: node scripts/capture-screenshots.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.BASE_URL || 'http://localhost:5174';
const OUT_DIR = join(__dirname, '..', 'presentation-screenshots');
const VIEWPORT = { width: 1280, height: 800 };

const PAGES = [
  // Public
  { url: '/', name: 'home' },
  { url: '/login', name: 'login' },
  { url: '/register', name: 'register' },
  { url: '/courses', name: 'courses' },
  { url: 'COURSE_DETAILS', name: 'course-details', dynamic: true },
  { url: '/forgot-password', name: 'forgot-password' },
  // Student (needs login)
  { url: '/student/dashboard', name: 'student-dashboard', role: 'student' },
  { url: '/student/catalog', name: 'student-catalog', role: 'student' },
  { url: '/student/my-classes', name: 'student-my-classes', role: 'student' },
  { url: '/student/calendar', name: 'student-calendar', role: 'student' },
  { url: '/student/assignments', name: 'student-assignments', role: 'student' },
  { url: '/student/exams', name: 'student-exams', role: 'student' },
  { url: '/student/messages', name: 'student-messages', role: 'student' },
  { url: '/student/profile', name: 'student-profile', role: 'student' },
  { url: '/student/settings', name: 'student-settings', role: 'student' },
  { url: 'STUDENT_LESSONS', name: 'student-course-lessons', role: 'student', dynamic: true },
  // Teacher
  { url: '/teacher/dashboard', name: 'teacher-dashboard', role: 'teacher' },
  { url: '/teacher/courses', name: 'teacher-courses', role: 'teacher' },
  { url: '/teacher/create-course', name: 'teacher-create-course', role: 'teacher' },
  { url: '/teacher/assignments', name: 'teacher-assignments', role: 'teacher' },
  { url: '/teacher/assignments/create', name: 'teacher-assignments-create', role: 'teacher' },
  { url: '/teacher/exams', name: 'teacher-exams', role: 'teacher' },
  { url: '/teacher/calendar', name: 'teacher-calendar', role: 'teacher' },
  { url: '/teacher/students', name: 'teacher-students', role: 'teacher' },
  { url: '/teacher/at-risk-students', name: 'teacher-at-risk-students', role: 'teacher' },
  // Admin
  { url: '/admin/dashboard', name: 'admin-dashboard', role: 'admin' },
  { url: '/admin/users', name: 'admin-users', role: 'admin' },
  { url: '/admin/courses', name: 'admin-courses', role: 'admin' },
  { url: '/admin/finance', name: 'admin-finance', role: 'admin' },
  { url: '/admin/finance/transactions', name: 'admin-finance-transactions', role: 'admin' },
  { url: '/admin/finance/payouts', name: 'admin-finance-payouts', role: 'admin' },
  { url: '/admin/finance/revenue-split', name: 'admin-finance-revenue-split', role: 'admin' },
  { url: '/admin/reports', name: 'admin-reports', role: 'admin' },
  { url: '/admin/audit-logs', name: 'admin-audit-logs', role: 'admin' },
  { url: '/admin/settings', name: 'admin-settings', role: 'admin' },
];

// Use real accounts with data - override via env: STUDENT_EMAIL, STUDENT_PASSWORD, TEACHER_EMAIL, TEACHER_PASSWORD
const CREDS = {
  student: {
    email: process.env.STUDENT_EMAIL || 'abed.j.omar@gmail.com',
    password: process.env.STUDENT_PASSWORD || 'Student123!',
  },
  teacher: {
    email: process.env.TEACHER_EMAIL || 'instructor2@test.com',
    password: process.env.TEACHER_PASSWORD || 'Instructor123!',
  },
  admin: { email: 'admin@academixlms.com', password: 'Admin123!' },
};

const FALLBACK_CREDS = {
  student: { email: 'student@academix.com', password: 'Student123!' },
  teacher: { email: 'instructor@test.com', password: 'Instructor123!' },
};

async function login(page, role) {
  let { email, password } = CREDS[role] || CREDS.student;
  const fallback = FALLBACK_CREDS[role];

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#email, input[type="email"]', { timeout: 5000 });
      await page.fill('#email, input[type="email"]', email);
      await page.fill('#password, input[type="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
      await page.waitForTimeout(3000);
      if (attempt > 0) console.log(`  (استخدام حساب بديل: ${email})`);
      return;
    } catch (e) {
      if (attempt === 0 && fallback && (email !== fallback.email)) {
        console.warn(`  تحذير: فشل تسجيل الدخول بـ ${email}، جاري المحاولة بـ ${fallback.email}`);
        email = fallback.email;
        password = fallback.password;
      } else {
        throw e;
      }
    }
  }
}

/** Wait for page content to load (not empty) - wait for API data */
async function waitForContent(page, role, url) {
  try {
    await page.waitForLoadState('networkidle', { timeout: 12000 });
  } catch (_) {}
  await page.waitForTimeout(2500);
  if (role === 'student') {
    try {
      if (url.includes('dashboard')) {
        await page.waitForSelector('main, [role="main"], [class*="grid"], [class*="card"]', { timeout: 6000 });
      } else if (url.includes('my-classes') || url.includes('lessons')) {
        await page.waitForSelector('main, a[href*="/lessons"], [class*="grid"]', { timeout: 6000 });
      } else if (url.includes('catalog')) {
        await page.waitForSelector('main, [class*="grid"], [class*="course"]', { timeout: 6000 });
      } else {
        await page.waitForSelector('main, [role="main"]', { timeout: 5000 });
      }
    } catch (_) {}
  } else if (role === 'teacher') {
    try {
      await page.waitForSelector('main, [role="main"], [class*="grid"], table', { timeout: 6000 });
    } catch (_) {}
  } else if (role === 'admin') {
    try {
      await page.waitForSelector('main, [role="main"], [class*="grid"], table', { timeout: 6000 });
    } catch (_) {}
  }
  await page.waitForTimeout(1500);
}

async function main() {
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

  console.log('Using accounts:');
  console.log('  Student:', CREDS.student.email);
  console.log('  Teacher:', CREDS.teacher.email);
  console.log('  (Override via STUDENT_EMAIL, STUDENT_PASSWORD, TEACHER_EMAIL, TEACHER_PASSWORD)\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    locale: 'ar',
  });

  let currentRole = null;
  const page = await context.newPage();

  for (const { url, name, role, dynamic } of PAGES) {
    try {
      if (role && role !== currentRole) {
        await login(page, role);
        currentRole = role;
      } else if (!role) {
        currentRole = null;
      }

      let fullUrl;
      if (dynamic && url === 'STUDENT_LESSONS') {
        await page.goto(`${BASE_URL}/student/my-classes`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(1500);
        const lessonsHref = await page.evaluate(() => {
          const link = document.querySelector('a[href*="/my-classes/"][href*="/lessons"]');
          return link ? link.getAttribute('href') : null;
        });
        if (!lessonsHref) {
          console.error(`✗ ${name}: No course lessons link found (student may have no enrollments)`);
          continue;
        }
        fullUrl = `${BASE_URL}${lessonsHref}`;
      } else if (dynamic && url === 'COURSE_DETAILS') {
        await page.goto(`${BASE_URL}/courses`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(1500);
        const courseHref = await page.evaluate(() => {
          const link = document.querySelector('a[href*="/courses/"]');
          return link ? link.getAttribute('href') : null;
        });
        if (!courseHref) {
          console.error(`✗ ${name}: No course link found`);
          continue;
        }
        fullUrl = courseHref.startsWith('http') ? courseHref : `${BASE_URL}${courseHref}`;
      } else {
        fullUrl = `${BASE_URL}${url}`;
      }

      await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await waitForContent(page, role, fullUrl);

      const path = join(OUT_DIR, `${name}.png`);
      await page.screenshot({ path, fullPage: false });
      console.log(`✓ ${name}.png`);
    } catch (e) {
      console.error(`✗ ${name}:`, e.message);
    }
  }

  await browser.close();
  console.log('\nDone. Screenshots saved to presentation-screenshots/');
}

main().catch(console.error);

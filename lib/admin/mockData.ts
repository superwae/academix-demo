// Mock data for AcademiX Admin Panel

// Users
export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "instructor" | "student" | "accountant" | "secretary";
  status: "active" | "suspended" | "pending";
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
}

export const mockUsers: User[] = [
  {
    id: "1",
    name: "John Smith",
    email: "john.smith@academix.com",
    role: "admin",
    status: "active",
    createdAt: "2024-01-15",
    lastLogin: "2025-01-19",
  },
  {
    id: "2",
    name: "Sarah Wilson",
    email: "sarah.wilson@example.com",
    role: "instructor",
    status: "active",
    createdAt: "2024-02-20",
    lastLogin: "2025-01-18",
  },
  {
    id: "3",
    name: "Mike Johnson",
    email: "mike.j@example.com",
    role: "student",
    status: "active",
    createdAt: "2024-03-10",
    lastLogin: "2025-01-17",
  },
  {
    id: "4",
    name: "Emily Brown",
    email: "emily.b@example.com",
    role: "student",
    status: "suspended",
    createdAt: "2024-04-05",
    lastLogin: "2025-01-10",
  },
  {
    id: "5",
    name: "David Lee",
    email: "david.lee@example.com",
    role: "instructor",
    status: "active",
    createdAt: "2024-05-12",
    lastLogin: "2025-01-19",
  },
  {
    id: "6",
    name: "Lisa Anderson",
    email: "lisa.a@example.com",
    role: "accountant",
    status: "active",
    createdAt: "2024-06-01",
    lastLogin: "2025-01-18",
  },
  {
    id: "7",
    name: "James Taylor",
    email: "james.t@example.com",
    role: "student",
    status: "pending",
    createdAt: "2025-01-15",
  },
  {
    id: "8",
    name: "Amanda Clark",
    email: "amanda.c@example.com",
    role: "secretary",
    status: "active",
    createdAt: "2024-07-20",
    lastLogin: "2025-01-19",
  },
  {
    id: "9",
    name: "Robert Martinez",
    email: "robert.m@example.com",
    role: "student",
    status: "active",
    createdAt: "2024-08-15",
    lastLogin: "2025-01-16",
  },
  {
    id: "10",
    name: "Jennifer White",
    email: "jennifer.w@example.com",
    role: "instructor",
    status: "active",
    createdAt: "2024-09-10",
    lastLogin: "2025-01-19",
  },
  {
    id: "11",
    name: "Kevin Thomas",
    email: "kevin.t@example.com",
    role: "student",
    status: "active",
    createdAt: "2024-10-05",
    lastLogin: "2025-01-15",
  },
  {
    id: "12",
    name: "Michelle Garcia",
    email: "michelle.g@example.com",
    role: "student",
    status: "pending",
    createdAt: "2025-01-18",
  },
];

// Roles & Permissions
export interface Role {
  id: string;
  name: string;
  description: string;
  usersCount: number;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  module: string;
}

export const allPermissions: Permission[] = [
  { id: "p1", name: "View Dashboard", module: "Dashboard" },
  { id: "p2", name: "View Analytics", module: "Dashboard" },
  { id: "p3", name: "Manage Users", module: "Users" },
  { id: "p4", name: "Create Users", module: "Users" },
  { id: "p5", name: "Delete Users", module: "Users" },
  { id: "p6", name: "Manage Courses", module: "Courses" },
  { id: "p7", name: "Create Courses", module: "Courses" },
  { id: "p8", name: "Approve Courses", module: "Courses" },
  { id: "p9", name: "View Finance", module: "Finance" },
  { id: "p10", name: "Manage Payments", module: "Finance" },
  { id: "p11", name: "Generate Reports", module: "Reports" },
  { id: "p12", name: "Export Data", module: "Reports" },
  { id: "p13", name: "System Settings", module: "System" },
  { id: "p14", name: "View Audit Logs", module: "Audit" },
  { id: "p15", name: "Manage Enrollments", module: "Courses" },
];

export const mockRoles: Role[] = [
  {
    id: "r1",
    name: "Admin",
    description: "Full system access with all permissions",
    usersCount: 3,
    permissions: allPermissions,
  },
  {
    id: "r2",
    name: "Instructor",
    description: "Can manage own courses and view enrolled students",
    usersCount: 15,
    permissions: allPermissions.filter((p) =>
      ["p1", "p6", "p7", "p15"].includes(p.id)
    ),
  },
  {
    id: "r3",
    name: "Student",
    description: "Can enroll in courses and access learning materials",
    usersCount: 450,
    permissions: allPermissions.filter((p) => ["p1"].includes(p.id)),
  },
  {
    id: "r4",
    name: "Accountant",
    description: "Financial management and reporting access",
    usersCount: 5,
    permissions: allPermissions.filter((p) =>
      ["p1", "p2", "p9", "p10", "p11", "p12"].includes(p.id)
    ),
  },
  {
    id: "r5",
    name: "Secretary",
    description: "Administrative support and user management",
    usersCount: 8,
    permissions: allPermissions.filter((p) =>
      ["p1", "p3", "p4", "p15"].includes(p.id)
    ),
  },
];

// Courses
export interface Course {
  id: string;
  title: string;
  instructor: string;
  instructorId: string;
  enrollments: number;
  status: "published" | "draft" | "pending" | "rejected";
  price: number;
  category: string;
  createdAt: string;
  thumbnail?: string;
}

export const mockCourses: Course[] = [
  {
    id: "c1",
    title: "Advanced React Patterns",
    instructor: "Sarah Wilson",
    instructorId: "2",
    enrollments: 234,
    status: "published",
    price: 99.99,
    category: "Web Development",
    createdAt: "2024-06-15",
  },
  {
    id: "c2",
    title: "Machine Learning Fundamentals",
    instructor: "David Lee",
    instructorId: "5",
    enrollments: 189,
    status: "published",
    price: 149.99,
    category: "Data Science",
    createdAt: "2024-07-20",
  },
  {
    id: "c3",
    title: "Node.js Backend Masterclass",
    instructor: "Jennifer White",
    instructorId: "10",
    enrollments: 0,
    status: "pending",
    price: 79.99,
    category: "Web Development",
    createdAt: "2025-01-10",
  },
  {
    id: "c4",
    title: "UI/UX Design Principles",
    instructor: "Sarah Wilson",
    instructorId: "2",
    enrollments: 156,
    status: "published",
    price: 69.99,
    category: "Design",
    createdAt: "2024-08-05",
  },
  {
    id: "c5",
    title: "DevOps & CI/CD Pipeline",
    instructor: "David Lee",
    instructorId: "5",
    enrollments: 0,
    status: "draft",
    price: 119.99,
    category: "DevOps",
    createdAt: "2025-01-05",
  },
  {
    id: "c6",
    title: "Python for Data Analysis",
    instructor: "Jennifer White",
    instructorId: "10",
    enrollments: 312,
    status: "published",
    price: 89.99,
    category: "Data Science",
    createdAt: "2024-05-01",
  },
  {
    id: "c7",
    title: "Blockchain Development",
    instructor: "David Lee",
    instructorId: "5",
    enrollments: 0,
    status: "pending",
    price: 199.99,
    category: "Blockchain",
    createdAt: "2025-01-15",
  },
  {
    id: "c8",
    title: "AWS Cloud Solutions",
    instructor: "Sarah Wilson",
    instructorId: "2",
    enrollments: 98,
    status: "published",
    price: 129.99,
    category: "Cloud",
    createdAt: "2024-09-12",
  },
];

// Transactions
export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  courseId: string;
  courseTitle: string;
  amount: number;
  status: "completed" | "pending" | "failed" | "refunded";
  paymentMethod: "credit_card" | "paypal" | "bank_transfer";
  createdAt: string;
}

export const mockTransactions: Transaction[] = [
  {
    id: "t1",
    userId: "3",
    userName: "Mike Johnson",
    courseId: "c1",
    courseTitle: "Advanced React Patterns",
    amount: 99.99,
    status: "completed",
    paymentMethod: "credit_card",
    createdAt: "2025-01-19T10:30:00",
  },
  {
    id: "t2",
    userId: "9",
    userName: "Robert Martinez",
    courseId: "c2",
    courseTitle: "Machine Learning Fundamentals",
    amount: 149.99,
    status: "completed",
    paymentMethod: "paypal",
    createdAt: "2025-01-18T15:45:00",
  },
  {
    id: "t3",
    userId: "11",
    userName: "Kevin Thomas",
    courseId: "c6",
    courseTitle: "Python for Data Analysis",
    amount: 89.99,
    status: "pending",
    paymentMethod: "bank_transfer",
    createdAt: "2025-01-18T09:20:00",
  },
  {
    id: "t4",
    userId: "3",
    userName: "Mike Johnson",
    courseId: "c4",
    courseTitle: "UI/UX Design Principles",
    amount: 69.99,
    status: "completed",
    paymentMethod: "credit_card",
    createdAt: "2025-01-17T14:10:00",
  },
  {
    id: "t5",
    userId: "9",
    userName: "Robert Martinez",
    courseId: "c8",
    courseTitle: "AWS Cloud Solutions",
    amount: 129.99,
    status: "refunded",
    paymentMethod: "credit_card",
    createdAt: "2025-01-16T11:30:00",
  },
  {
    id: "t6",
    userId: "11",
    userName: "Kevin Thomas",
    courseId: "c1",
    courseTitle: "Advanced React Patterns",
    amount: 99.99,
    status: "completed",
    paymentMethod: "paypal",
    createdAt: "2025-01-15T16:00:00",
  },
  {
    id: "t7",
    userId: "7",
    userName: "James Taylor",
    courseId: "c2",
    courseTitle: "Machine Learning Fundamentals",
    amount: 149.99,
    status: "failed",
    paymentMethod: "credit_card",
    createdAt: "2025-01-14T13:25:00",
  },
];

// Audit Logs
export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  actorId: string;
  target: string;
  targetType: "user" | "course" | "payment" | "system" | "role";
  details?: string;
  ipAddress: string;
  timestamp: string;
}

export const mockAuditLogs: AuditLog[] = [
  {
    id: "a1",
    action: "User Login",
    actor: "John Smith",
    actorId: "1",
    target: "Session",
    targetType: "system",
    ipAddress: "192.168.1.100",
    timestamp: "2025-01-19T10:30:00",
  },
  {
    id: "a2",
    action: "Course Approved",
    actor: "John Smith",
    actorId: "1",
    target: "Advanced React Patterns",
    targetType: "course",
    details: "Course approved for publication",
    ipAddress: "192.168.1.100",
    timestamp: "2025-01-19T09:45:00",
  },
  {
    id: "a3",
    action: "User Suspended",
    actor: "Amanda Clark",
    actorId: "8",
    target: "Emily Brown",
    targetType: "user",
    details: "Suspended due to policy violation",
    ipAddress: "192.168.1.105",
    timestamp: "2025-01-18T16:20:00",
  },
  {
    id: "a4",
    action: "Payment Refunded",
    actor: "Lisa Anderson",
    actorId: "6",
    target: "Transaction #t5",
    targetType: "payment",
    details: "Refund processed - customer request",
    ipAddress: "192.168.1.110",
    timestamp: "2025-01-18T14:30:00",
  },
  {
    id: "a5",
    action: "Role Modified",
    actor: "John Smith",
    actorId: "1",
    target: "Instructor Role",
    targetType: "role",
    details: "Added course creation permission",
    ipAddress: "192.168.1.100",
    timestamp: "2025-01-17T11:00:00",
  },
  {
    id: "a6",
    action: "System Settings Updated",
    actor: "John Smith",
    actorId: "1",
    target: "Email Configuration",
    targetType: "system",
    details: "SMTP settings updated",
    ipAddress: "192.168.1.100",
    timestamp: "2025-01-17T09:15:00",
  },
  {
    id: "a7",
    action: "User Created",
    actor: "Amanda Clark",
    actorId: "8",
    target: "James Taylor",
    targetType: "user",
    details: "New student registration",
    ipAddress: "192.168.1.105",
    timestamp: "2025-01-15T10:45:00",
  },
  {
    id: "a8",
    action: "Course Created",
    actor: "Jennifer White",
    actorId: "10",
    target: "Node.js Backend Masterclass",
    targetType: "course",
    details: "New course submitted for review",
    ipAddress: "192.168.1.120",
    timestamp: "2025-01-10T14:20:00",
  },
];

// Dashboard Chart Data
export const userGrowthData = [
  { month: "Jul", users: 1200 },
  { month: "Aug", users: 1450 },
  { month: "Sep", users: 1680 },
  { month: "Oct", users: 1920 },
  { month: "Nov", users: 2150 },
  { month: "Dec", users: 2400 },
  { month: "Jan", users: 2680 },
];

export const monthlyRevenueData = [
  { month: "Jul", revenue: 45000 },
  { month: "Aug", revenue: 52000 },
  { month: "Sep", revenue: 48000 },
  { month: "Oct", revenue: 61000 },
  { month: "Nov", revenue: 55000 },
  { month: "Dec", revenue: 72000 },
  { month: "Jan", revenue: 68000 },
];

export const userRolesDistribution = [
  { name: "Students", value: 450, color: "#3b82f6" },
  { name: "Instructors", value: 15, color: "#10b981" },
  { name: "Admins", value: 3, color: "#f59e0b" },
  { name: "Accountants", value: 5, color: "#8b5cf6" },
  { name: "Secretaries", value: 8, color: "#ec4899" },
];

// Recent Activity
export interface Activity {
  id: string;
  type: "registration" | "course_approval" | "payment";
  title: string;
  description: string;
  timestamp: string;
  user?: string;
  amount?: number;
}

export const recentActivity: Activity[] = [
  {
    id: "act1",
    type: "registration",
    title: "New User Registration",
    description: "James Taylor registered as a student",
    timestamp: "2025-01-19T10:30:00",
    user: "James Taylor",
  },
  {
    id: "act2",
    type: "payment",
    title: "Payment Received",
    description: "Payment for Advanced React Patterns",
    timestamp: "2025-01-19T09:45:00",
    user: "Mike Johnson",
    amount: 99.99,
  },
  {
    id: "act3",
    type: "course_approval",
    title: "Course Pending Approval",
    description: "Node.js Backend Masterclass needs review",
    timestamp: "2025-01-19T08:20:00",
    user: "Jennifer White",
  },
  {
    id: "act4",
    type: "registration",
    title: "New User Registration",
    description: "Michelle Garcia registered as a student",
    timestamp: "2025-01-18T16:30:00",
    user: "Michelle Garcia",
  },
  {
    id: "act5",
    type: "payment",
    title: "Payment Received",
    description: "Payment for Machine Learning Fundamentals",
    timestamp: "2025-01-18T15:45:00",
    user: "Robert Martinez",
    amount: 149.99,
  },
  {
    id: "act6",
    type: "course_approval",
    title: "Course Pending Approval",
    description: "Blockchain Development needs review",
    timestamp: "2025-01-15T14:00:00",
    user: "David Lee",
  },
];

// System Settings
export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: "general" | "experimental" | "beta";
}

export const mockFeatureFlags: FeatureFlag[] = [
  {
    id: "ff1",
    name: "New Dashboard",
    description: "Enable the redesigned admin dashboard",
    enabled: true,
    category: "general",
  },
  {
    id: "ff2",
    name: "AI Course Recommendations",
    description: "ML-powered course recommendations for students",
    enabled: false,
    category: "experimental",
  },
  {
    id: "ff3",
    name: "Live Streaming",
    description: "Allow instructors to live stream classes",
    enabled: true,
    category: "beta",
  },
  {
    id: "ff4",
    name: "Payment Installments",
    description: "Enable course payment in installments",
    enabled: false,
    category: "beta",
  },
  {
    id: "ff5",
    name: "Two-Factor Authentication",
    description: "Require 2FA for all admin accounts",
    enabled: true,
    category: "general",
  },
  {
    id: "ff6",
    name: "API Rate Limiting",
    description: "Enable advanced API rate limiting",
    enabled: true,
    category: "general",
  },
];

// System Health
export const systemHealth = {
  status: "healthy" as const,
  uptime: "99.98%",
  lastIncident: "45 days ago",
  services: [
    { name: "API Server", status: "operational" as const },
    { name: "Database", status: "operational" as const },
    { name: "Cache", status: "operational" as const },
    { name: "Storage", status: "operational" as const },
    { name: "Email Service", status: "degraded" as const },
    { name: "Payment Gateway", status: "operational" as const },
  ],
};

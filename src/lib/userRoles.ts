/**
 * Highest-privilege role label for UI (independent of which portal route you are on).
 */
export function getAccountRoleLabel(roles: string[] | undefined): string {
  const r = new Set((roles ?? []).map((x) => x.toLowerCase()));
  if (r.has('superadmin')) return 'Super Admin';
  if (r.has('admin')) return 'Admin';
  if (r.has('instructor') || r.has('teacher')) return 'Instructor';
  if (r.has('accountant')) return 'Accountant';
  if (r.has('secretary')) return 'Secretary';
  if (r.has('student')) return 'Student';
  return 'Member';
}

/** True if the account is not student-only (can access other portals). */
export function hasElevatedRole(roles: string[] | undefined): boolean {
  const r = new Set((roles ?? []).map((x) => x.toLowerCase()));
  return (
    r.has('superadmin') ||
    r.has('admin') ||
    r.has('instructor') ||
    r.has('teacher')
  );
}

/** Admin / SuperAdmin — may browse teacher or student portals for support. */
export function isPlatformAdminAccount(roles: string[] | undefined): boolean {
  const r = new Set((roles ?? []).map((x) => x.toLowerCase()));
  return r.has('superadmin') || r.has('admin');
}

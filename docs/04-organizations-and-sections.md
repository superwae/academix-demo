# 4. Organization Types + Course Modality Expansion

> This is the largest and highest-priority change. Many other features
> depend on the two organization types existing. Read this in full before
> starting.

## Why

Today an "Admin" in AcademixLMS is just a user with the Admin role. There's
no real concept of an **organization** (a school, a university, a company,
a training center). In practice we have two very different customer
archetypes, and we need the data model to support both cleanly.

### Organization Type A — Teaching Organization
Example: a university, a coding bootcamp, a language institute.
- Has **teachers / instructors** under it.
- Teachers create **public courses** that are sold on the catalog.
- Revenue from course sales is split:
  `platform fee % + org fee % + teacher %` (rule configurable by admin).
- The org's subscription tier (already built) caps how many courses and
  seats their teachers can create collectively.
- Students are external buyers.

### Organization Type B — Employer / Corporate Training
Example: a software company training their employees, a hospital running
compliance courses.
- Has **employees / members** under it (they are "students" in our schema).
- Courses are either:
  - **Created internally** by the org's own teachers/admins, **private to
    the org** (employees-only) — *exclusive course*.
  - **Licensed from the public catalog** — the org pays for N seats of
    course X, assigns those seats to specific employees. Employees get
    enrolled for free to them; the org is the actual customer.
- No revenue goes TO the org (they are a spender, not a seller).
- Org admin tracks compliance: who completed what, deadlines, retakes.

### Course modality (the "bnaan land" question)

Today `Course.Modality` is an enum: `Online`, `InPerson`, `Hybrid`. This is
too thin for real-world usage. A course or a section can actually be:

| Modality | Meaning | Notes |
|----------|---------|-------|
| `RecordedOnly` | Pre-recorded lessons, self-paced, no live element | Asynchronous |
| `LiveOnline` | All classes held via Zoom/Meet/Teams | Join URL per section |
| `InPerson` | Physical location required | LocationLabel shown |
| `Hybrid` | Mix of live-online + in-person sessions | Both fields used |
| `SelfPacedWithMentor` | Recorded + scheduled 1:1 or group Q&A sessions | New |
| `Cohort` | Starts on a fixed date, everyone moves through together | Orthogonal to the above |

Note that `Cohort` vs `SelfPaced` is **not** the same dimension as `Online`
vs `InPerson`. We should model them separately.

## Proposed data model

### New entity: `Organization`

```csharp
public class Organization : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? LogoUrl { get; set; }
    public string? Website { get; set; }
    public OrganizationType Type { get; set; }  // TeachingInstitution | Employer
    public Guid OwnerUserId { get; set; }       // primary admin
    public Guid? SubscriptionId { get; set; }   // active platform subscription
    public bool IsActive { get; set; } = true;
}

public enum OrganizationType
{
    TeachingInstitution = 1, // Type A
    Employer = 2,            // Type B
}
```

### New entity: `OrganizationMember`

```csharp
public class OrganizationMember : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public Guid UserId { get; set; }
    public OrgMemberRole Role { get; set; }      // Admin, Manager, Teacher, Employee
    public DateTime JoinedAt { get; set; }
    public DateTime? LeftAt { get; set; }
    public bool IsActive { get; set; } = true;
}

public enum OrgMemberRole
{
    OrgAdmin = 1,       // can manage the org
    OrgManager = 2,     // HR / training manager (Type B) — can assign courses
    OrgTeacher = 3,     // Type A only — creates courses under the org
    OrgEmployee = 4,    // Type B only — is a learner owned by the org
}
```

### Modify `Course`

Add:
```csharp
public Guid? OrganizationId { get; set; } // null = independent teacher
public bool IsOrgExclusive { get; set; }  // only accessible to members of OrganizationId
public CourseRunType RunType { get; set; } // Cohort | SelfPaced
public CourseModality ModalityDetailed { get; set; } // new fuller enum
```

Deprecate the current `Modality` field in favor of `ModalityDetailed`, but
keep a migration path.

### New enums

```csharp
public enum CourseRunType
{
    Cohort = 1,         // fixed start/end, synchronous
    SelfPaced = 2,      // students start anytime
}

public enum CourseModality
{
    RecordedOnly = 1,
    LiveOnline = 2,
    InPerson = 3,
    Hybrid = 4,
    SelfPacedWithMentor = 5,
}
```

### New entity: `CourseLicense` (Type B only)

When an Employer-org licenses a public course for their employees, we
reserve N seats and can assign them.

```csharp
public class CourseLicense : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public Guid CourseId { get; set; }
    public int SeatsTotal { get; set; }
    public int SeatsUsed { get; set; }
    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidUntil { get; set; }
    public Guid? PaymentId { get; set; }  // links to how they paid
}
```

An Employer admin can then "assign" a license to an employee, which creates
a normal `Enrollment` row but flagged as `AssignedByOrgId`.

Add `Enrollment.AssignedByOrgId` (nullable Guid) so we can report on what
was self-enrolled vs org-assigned.

## Permission matrix

| Action | Platform Admin | Org Admin (A) | Org Teacher (A) | Org Admin (B) | Org Manager (B) | Org Employee (B) | Independent Teacher | Student |
|--------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Create org | ✓ | | | | | | | |
| Add org members | ✓ | ✓ (own org) | | ✓ (own org) | | | | |
| Create course under org | ✓ | ✓ | ✓ | ✓ (internal) | | | | |
| Create exclusive (internal) course | ✓ | | | ✓ | | | | |
| License a public course for employees | | | | ✓ | | | | |
| Assign license to employee | | | | ✓ | ✓ | | | |
| See org-level finance | ✓ | ✓ | | ✓ | | | | |
| See personal teacher earnings | ✓ | | ✓ | | | | ✓ | |
| Subscribe to platform plan | ✓ | ✓ | | ✓ | | | ✓ | |

## Flows to redesign

### Teacher onboarding
- If they're joining as an independent teacher → existing subscribe-to-plan
  flow.
- If they're invited by an org admin → accept invite → become
  `OrganizationMember{role=OrgTeacher}`. Their courses inherit the org's
  seat limits.

### Employee onboarding (Type B)
- Org admin sends invite (email with signup link).
- Employee signs up, is auto-added as `OrganizationMember{role=OrgEmployee}`.
- Org admin can bulk import a CSV of employees.

### Course creation
- If the teacher belongs to a `TeachingInstitution` org → the course is
  created with `OrganizationId = org.Id`. Revenue split applies org's rule.
- If the teacher belongs to an `Employer` org → the course is created with
  `OrganizationId = org.Id` and `IsOrgExclusive = true` by default. Org
  admin can flip to public later if they want to sell it too.
- Independent teacher → `OrganizationId = null`.

### Course discovery (public catalog)
- Filter: exclude any course where `IsOrgExclusive = true`.
- Exclusive courses are only visible to members of that org.

### Enrollment (Type B employees)
- For exclusive courses: employee browses their org's course catalog and
  self-enrolls (if org allows) OR waits to be assigned by a manager.
- For licensed public courses: only accessible after assignment.
- `Enrollment.AssignedByOrgId` set so org reports distinguish
  self-enrolled vs assigned.

### Finance
- All earnings are allocated per the revenue split rules (see doc #3).
- Employer orgs see a "Spending" view, not an "Earnings" view (separate page).

## Migration plan (for existing data)

1. Create the new tables — no data moved yet.
2. Migrate every existing Admin user → create a default `Organization` with
   `Type = TeachingInstitution`, add the user as `OrgAdmin`.
3. Every course with an instructor who is inside that org → set
   `Course.OrganizationId`.
4. Independent teachers (not in any org) keep `OrganizationId = null`.
5. Seed data: add one example of each org type for demos.

## Frontend work

### New pages
- `/admin/organizations` (platform admin) — list and manage orgs.
- `/admin/organization` (org admin — renamed existing admin scope to be
  org-scoped; platform admin keeps `/admin`).
- `/org/members` — manage teachers or employees.
- `/org/licenses` — (Type B) buy + assign course licenses.
- `/org/compliance` — (Type B) completion / compliance reports.

### Sidebar changes
- Platform Admin sees everything.
- Org Admin (A) sees: Dashboard, Members (teachers), Courses, Finance,
  Subscription, Settings.
- Org Admin (B) sees: Dashboard, Members (employees), Courses (internal),
  Licenses, Compliance, Spending, Subscription, Settings.
- Employee (B) sees a student-like portal scoped to org courses +
  assigned licenses.

### Routing gates
Replace the current single `RoleGuard` with a compound check:
`RoleGuard + OrgMembershipGuard + OrgTypeGuard`.

## Backward compatibility

Existing users and courses must keep working during the transition:
- Admin users without an org should still hit the platform-admin screens
  during the migration window.
- `Course.Modality` (the old enum) stays in the DB; `ModalityDetailed` is
  added alongside and the UI uses the detailed one once available,
  falling back to the legacy value.

## Testing

- At least one test account per role × org type.
- An integration test that a course marked exclusive does NOT appear in
  the public catalog and cannot be enrolled in by a non-member.

## Definition of done

- [ ] `Organization`, `OrganizationMember`, `CourseLicense` tables exist
      and are seeded with one example of each type.
- [ ] Existing demo users migrated into an org; nothing previously working
      is broken.
- [ ] Org admin (Type A) can invite teachers; teachers' courses are owned
      by the org and share its subscription limits.
- [ ] Org admin (Type B) can invite employees, create exclusive courses,
      license public courses, and assign them.
- [ ] Exclusive courses are not visible outside their org.
- [ ] Permission matrix is enforced — a quick probe with Swagger confirms
      each endpoint returns 403 for the wrong role.
- [ ] Sidebar and dashboards render the right pages for each role.
- [ ] Revenue / spending views split cleanly between seller orgs and
      buyer orgs (depends on finance doc #3 landing).

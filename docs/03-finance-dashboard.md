# 3. Finance / Earnings Dashboard

## Why
Teachers and organization admins need to see exactly how much money they've
earned on the platform, what's pending, what's been paid out, what fees
were deducted, and download statements for tax / accounting purposes. The
current `AccountantPayoutsPage` and admin `FinanceOverviewPage` show mock
data — nothing real is wired up.

## Current state

- `Payment` entity exists and is recorded for every course purchase and
  subscription payment.
- `PaymentService.GetAllPaymentsAsync` returns platform-wide payments (admin
  view) but there's no scoped variant for "payments for my courses".
- `PaymentSummaryDto` aggregates revenue, transactions, pending payouts,
  refunds — but the values are computed on every call and not grouped by
  teacher / org.
- There is no `Payout` entity — platform never "paid out" anyone yet, so
  all revenue is conceptually still held by the platform.
- Revenue split percentages (platform takes X%, teacher gets Y%) are not
  modeled anywhere.

## Target users

| Role | What they need to see |
|------|-----------------------|
| Independent teacher | Total earnings, per-course revenue, pending/paid payouts, payout method, transactions |
| Org admin (company that has teachers) | Same as teacher, aggregated across all their teachers' courses, plus per-teacher breakdown |
| Org admin (company that buys/licenses courses for employees) | What they've spent, what's active, licenses remaining |
| Platform admin | Platform total revenue, fees collected, payouts due, per-teacher summaries |

## Data model additions

### Entity: `RevenueSplitRule`
Configurable per course OR per plan. Defaults to platform-wide values in
`appsettings.json` when no override exists.

```csharp
public class RevenueSplitRule : BaseEntity
{
    public Guid? CourseId { get; set; }            // null = default rule
    public Guid? OrganizationId { get; set; }      // null = all orgs
    public decimal PlatformPercentage { get; set; } // e.g. 15.00 = 15%
    public decimal TeacherPercentage { get; set; }  // e.g. 85.00
    public decimal? OrgPercentage { get; set; }     // when teacher is inside an org
}
```

### Entity: `Payout`
Tracks money paid out of the platform to teachers / orgs.

```csharp
public class Payout : BaseEntity
{
    public Guid RecipientUserId { get; set; }   // instructor or org admin
    public Guid? OrganizationId { get; set; }
    public long AmountSmallestUnit { get; set; }
    public string Currency { get; set; } = "ILS";
    public PayoutStatus Status { get; set; }    // Pending, Processing, Paid, Failed
    public string? ProviderReference { get; set; }  // bank transfer ref
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public DateTime? PaidAt { get; set; }
    public string? Notes { get; set; }
}
```

### Entity: `Earning` (materialized view / ledger)
One row per payment line item attributable to a recipient. Makes it easy
to answer "what did teacher X earn in March 2026" without recalculating
from `Payment` × `RevenueSplitRule` every time.

```csharp
public class Earning : BaseEntity
{
    public Guid PaymentId { get; set; }
    public Guid RecipientUserId { get; set; }  // teacher or org admin
    public Guid? OrganizationId { get; set; }
    public long AmountSmallestUnit { get; set; }
    public string Currency { get; set; } = "ILS";
    public decimal AppliedSplitPercentage { get; set; }
    public EarningStatus Status { get; set; }  // Available, InPendingPayout, PaidOut, Refunded
    public Guid? PayoutId { get; set; }
}
```

Create one `Earning` row per `Payment` line that produces recipient income.
Trigger: whenever a `Payment` transitions to `Completed`, run
`EarningService.AllocateFromPayment(payment)` which applies the revenue
rules and inserts earning rows.

## Backend services

### `IEarningsService`
- `GetEarningsForUserAsync(userId, filters, page)` — list of earnings with filters (status, date range, course)
- `GetEarningsSummaryForUserAsync(userId, dateRange)` — totals + charts
- `GetEarningsForOrgAsync(orgId, filters, page)`
- `GetEarningsSummaryForOrgAsync(orgId, dateRange)`
- `AllocateFromPaymentAsync(paymentId)` — called by `PaymentService` on success

### `IPayoutsService`
- `GetMyPayoutsAsync(userId, page)`
- `GetPayoutsForOrgAsync(orgId, page)`
- `RequestPayoutAsync(userId)` — bundles all `Available` earnings into a new `Pending` payout
- `AdminListPayoutsAsync(filters)` — platform admin view
- `MarkPayoutPaidAsync(payoutId, providerRef)` — admin action after bank transfer

### Modifications to `IPaymentService`
- On payment verification success, call `EarningsService.AllocateFromPaymentAsync`.

## API endpoints

Scoped to the requesting user's ownership:

```
GET  /api/v1/earnings/me?from=&to=&courseId=&status=&page=    # teacher/org admin
GET  /api/v1/earnings/me/summary?from=&to=                    # aggregates for charts
GET  /api/v1/earnings/org/{orgId}                             # org admin
GET  /api/v1/earnings/org/{orgId}/summary
GET  /api/v1/earnings/org/{orgId}/by-teacher                  # org admin sees each teacher's numbers

GET  /api/v1/payouts/me
POST /api/v1/payouts/me/request                               # teacher requests a payout
GET  /api/v1/payouts/org/{orgId}

GET  /api/v1/admin/payouts                                    # admin queue
POST /api/v1/admin/payouts/{id}/mark-paid
```

## Frontend pages

### `/teacher/finance`
- Summary cards: Total earned, This month, Available for payout, Pending payouts
- Chart: earnings over time (line chart, monthly grouping)
- Table: per-course breakdown
- Transactions list (filterable by date range + status)
- "Request payout" button when Available > threshold
- "Payment method" section (bank details stub for now — just a note that
  payouts go to the account on file; expand later)

### `/admin/finance` (replace current mock page)
- Platform KPIs: gross revenue, platform fees collected, net payouts owed
- Charts: revenue by month, by category
- Top-earning teachers / courses
- Payout queue with "Mark paid" action

### `/admin/finance/teachers/{userId}` (new)
- Deep-dive on a single teacher's earnings (admin view)

### For org-admin users
- Same teacher view, but scoped to all teachers inside the org plus an
  aggregate top card.

### For org-admin buying courses (type B from doc #4)
- Different page: `/admin/finance/spending`
- Shows money spent on the platform (course licenses, subscriptions), not earned.

## Reports / exports

- CSV export for earnings (current filter state).
- PDF statement for a given month / payout period (header: logo, user info,
  totals; body: line items; footer: disclaimers, tax notes). Use a
  lightweight PDF generator like **QuestPDF** (C#) on the backend.

## Security

- Every endpoint re-checks that the requesting user owns the resource
  (teacher can only see their own earnings, org admin only their org).
- `Earning` and `Payout` rows are never directly mutated by clients — only
  via service methods that run server-side rules.
- Payout request cannot be submitted if Available balance is below a
  configurable minimum (e.g. 100 ILS).
- Audit log every payout status change.

## Settings (platform admin)

Add to `AdminSettingsPage`:
- Default platform fee (%)
- Minimum payout amount
- Payout schedule (manual for now; cron later)
- Per-org override table

## Definition of done

- [ ] `Earning` rows are generated for every historical + new completed payment.
- [ ] Teacher finance page shows correct totals that match
      sum(earnings for user, status != Refunded).
- [ ] Org admin sees teachers under them and can drill in.
- [ ] Platform admin can mark a payout as paid, and the teacher's
      Available balance decreases accordingly.
- [ ] CSV and PDF exports match the on-screen numbers exactly.
- [ ] No mock data anywhere in `/admin/finance/*` or `/teacher/finance/*`.

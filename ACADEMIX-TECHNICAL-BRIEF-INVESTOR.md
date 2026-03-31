# AcademiX LMS — العرض الفني التفصيلي للمستثمر

## نظرة عامة

AcademiX منصة تعليمية متكاملة (LMS) مصممة لإدارة التعلم الإلكتروني بثلاث بوابات: **الطالب**، **المدرّس**، و**المسؤول**.

---

## ١. الذكاء الاصطناعي والتحليلات

### نظام التوصيات الذكي (Recommendation Engine)
- **التصفية التعاونية** (Collaborative Filtering) + **التصفية المعتمدة على المحتوى** (Content-Based Filtering)
- **بدون APIs خارجية** — جميع العمليات داخلية (in-memory)
- ميزات:
  - توصيات شخصية حسب التسجيلات والتصنيفات
  - دورات مشابهة
  - الدورات الرائجة
  - واصل التعلم (Continue Learning)
  - خرائط التصنيفات (Technology → Programming, Cloud, DevOps)

### تحليلات الأداء والتنبؤ (Analytics Service)
- **درجة المخاطر (Risk Score):** عدم النشاط (7/14 يوم)، تقدم منخفض (<25%)، درجات منخفضة (<60%)
- **التنبؤ بالدرجة النهائية (Predicted Final Grade)**
- **درجة المشاركة (Engagement Score)**
- **توصيات نصية تلقائية** للطلاب
- تقارير إحصائية للدورات

### التقارير والرسوم البيانية
- Recharts للرسوم البيانية
- تصدير CSV (مستخدمين، طلاب معرضين للخطر)
- لوحة مالية مع KPIs

---

## ٢. الألوان والأنماط

### ثيمات جاهزة (14)
Light, Dark, Purple, Sky Blue, Sky & Purple, Green, Emerald, Orange, Amber, Red, Rose, Pink, Indigo, **Custom**

### ثيمات التدرجات (Mix Themes)
Red & Blue | White & Black | Sky Blue & Purple | Black & Gold

### متغيرات CSS
`--background`, `--foreground`, `--primary`, `--card`, `--border`, `--ring`, `--gradient-primary`, `--radius`

### الحفظ
Zustand + localStorage — الثيم يُحمّل تلقائياً عند الفتح

---

## ٣. المحادثة والملاحظات والإشعارات

### المحادثة
- **SignalR** — اتصال فوري (Real-time)
- Hub: `/hubs/messaging`
- محادثات مستخدم لمستخدم (ليست AI chatbot)

### الملاحظات
- ملاحظات مرتبطة بتوقيت الفيديو (timestamp)
- النقر ينقل الفيديو للتوقيت
- تخزين: localStorage
- بحث في المحتوى

### الإشعارات
- أنواع: assignment, exam, announcement, grade, message, deadline
- API + Fallback localStorage
- حد أقصى 100 إشعار

---

## ٤. المعمارية التقنية

### نموذج
- **Modular Monolith** — API واحد
- **Clean Architecture** بأربع طبقات

### الهيكل المعماري (Domain, Application, API, Infrastructure)

| الطبقة | الدور | الميزات |
|--------|-------|---------|
| **Domain** | قلب المنطق — كيانات وثوابت فقط | BaseEntity (Id, audit, soft delete)، Enums، Entities (User, Course, Enrollment, Lesson, Assignment, Exam, Conversation, Notification...) |
| **Application** | حالات الاستخدام والمنطق التجاري | Interfaces (IApplicationDbContext, I*Service)، Services (Auth, Course, Recommendation, Analytics...)، DTOs، Result&lt;T&gt;، PagedResult&lt;T&gt; |
| **API** | استقبال الطلبات والتشغيل | Controllers، Middleware (Exception, Logging, SecurityHeaders)، SignalR Hub، JWT, CORS, Swagger, Rate Limiting |
| **Infrastructure** | تفاصيل تقنية خارجية | ApplicationDbContext (EF + PostgreSQL)، Migrations، JwtService، MailjetEmailService، LocalStorageService |

**تبعيات:** Domain مستقل ← Application → Domain ← Infrastructure ينفذ واجهات Application ← API يجمع كل الطبقات

### API
- REST: `api/v1/[controller]`
- SignalR: `/hubs/messaging`

### Frontend
- React 19, TypeScript, Vite 7
- Zustand, React Router 7
- Tailwind, Radix UI, Recharts, SignalR

### Backend
- ASP.NET Core 8
- Entity Framework Core + PostgreSQL
- JWT, Serilog, Rate Limiting

---

## التقنيات المستخدمة

| الفئة | التقنيات |
|-------|----------|
| Frontend | React 19, TypeScript, Vite 7, Zustand, Tailwind, Radix UI, Framer Motion, Recharts, FullCalendar, SignalR |
| Backend | ASP.NET Core 8, EF Core, JWT, Swagger, Serilog, SignalR |
| Database | PostgreSQL |
| Email | Mailjet |

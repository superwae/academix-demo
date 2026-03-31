# التقاط صور العرض التقديمي

## الحسابات المستخدمة (مع بيانات حقيقية)

- **طالب:** `abed.j.omar@gmail.com` — إذا فشل تسجيل الدخول يُستخدم `student@academix.com`
- **معلم:** `instructor2@test.com` (كلمة المرور: `Instructor123!`)

## تشغيل السكربت

```bash
# تأكد أن الواجهة الأمامية والخلفية تعملان
npm run dev   # في طرفية
# والخلفية على المنفذ 5261

# ثم في طرفية أخرى:
npm run screenshots
```

## تخصيص كلمة مرور الطالب

إذا كانت كلمة مرور `abed.j.omar@gmail.com` مختلفة عن `Student123!`، السكربت سيستخدم تلقائياً `student@academix.com` كحساب بديل. لاستخدام حسابك:

```bash
# Windows PowerShell
$env:STUDENT_PASSWORD="كلمة_المرور_الصحيحة"; npm run screenshots
```

## متغيرات البيئة

| المتغير | الوصف | الافتراضي |
|---------|-------|-----------|
| `STUDENT_EMAIL` | بريد الطالب | abed.j.omar@gmail.com |
| `STUDENT_PASSWORD` | كلمة مرور الطالب | Student123! |
| `TEACHER_EMAIL` | بريد المعلم | instructor2@test.com |
| `TEACHER_PASSWORD` | كلمة مرور المعلم | Instructor123! |
| `BASE_URL` | عنوان الواجهة | http://localhost:5174 |

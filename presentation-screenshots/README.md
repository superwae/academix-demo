# إضافة صور العرض التقديمي

لإضافة صور حقيقية للصفحات في ملف `ACADEMIX-LMS-PRESENTATION.html`:

1. التقط لقطات شاشة لكل صفحة من النظام (شغّل المشروع وانتقل للصفحة ثم التقط)
2. احفظ الصور في هذا المجلد بأسماء واضحة مثل:
   - `home.png` - الصفحة الرئيسية
   - `login.png` - تسجيل الدخول
   - `student-dashboard.png` - لوحة تحكم الطالب
   - `teacher-dashboard.png` - لوحة تحكم المعلم
   - `admin-dashboard.png` - لوحة تحكم الإدارة
   - إلخ...

3. استبدل داخل كل `<div class="page-mockup">` النص التوضيحي بـ:
   ```html
   <img src="presentation-screenshots/اسم-الصورة.png" alt="وصف الصفحة">
   ```

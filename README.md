# شريك + — قائمة أسعار قابلة للإدارة

موقع عربي متجاوب لعرض قائمة خدمات وأسعار الشركاء. يستعمل Supabase لتخزين البيانات وتسجيل دخول الأدمن، ويمكن نشر الملفات الثابتة على GitHub Pages.

## إعداد Supabase

1. أنشئ مشروعًا جديدًا في [Supabase](https://supabase.com/).
2. افتح **SQL Editor** وشغّل محتوى `supabase.sql`.
3. من **Authentication → Users** أنشئ مستخدمًا للأدمن ببريد إلكتروني وكلمة مرور قوية.
4. بعد إنشاء المستخدم، أضفه إلى قائمة الأدمن بتشغيل الاستعلام التالي في SQL Editor، مع استبدال البريد:

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'admin@example.com'
   on conflict (user_id) do nothing;
   ```

5. من **Project Settings → API** انسخ **Project URL** و **anon/public key**. ضع القيم في `config.js`:

   ```js
   window.APP_CONFIG = {
     supabaseUrl: "https://YOUR_PROJECT.supabase.co",
     supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY"
   };
   ```

   المفتاح المستخدم في الواجهة هو المفتاح العام `anon` فقط. لا تضع `service_role` أو أي سرّ خاص في ملفات الموقع.

## النشر على GitHub Pages

1. ارفع ملفات المشروع إلى مستودع GitHub.
2. من **Settings → Pages** اختر الفرع ومجلد النشر (عادةً `/(root)`)، ثم احفظ.
3. أضف عنوان الموقع المنشور إلى قائمة **Redirect URLs** في **Supabase → Authentication → URL Configuration**.
4. افتح رابط الموقع. تظهر الأسعار في الصفحة الرئيسية، وتتم إدارة الأقسام والخدمات من `admin.html`.

## الاستخدام

- أضف قسمًا من لوحة الأدمن، ثم أضف خدمة وحدد سعر الشريك والسعر الأساسي بالريال.
- يمكنك تعديل اسم القسم أو حذفه من قائمة الأقسام؛ حذف القسم يحذف خدماته المرتبطة بعد تأكيد العملية.
- استخدم زر **تعديل** لتغيير البيانات والأسعار، أو **حذف** لإزالة الخدمة.
- التغييرات محفوظة في Supabase وتظهر للزوار مباشرة بعد تحديث الصفحة.
- تسجيل الدخول وحده لا يمنح صلاحية تعديل البيانات؛ يجب إضافة المستخدم أيضًا إلى `public.admin_users`. سياسات RLS في قاعدة البيانات تمنع الكتابة من المستخدمين غير المصرح لهم.

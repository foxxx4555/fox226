import { createRoot } from "react-dom/client";
import '@/i18n';
import App from "./App.tsx";
import "./index.css";

// 🔐 نظام قفل الدومين (Domain Lock)
const allowedDomains = [
  "sasgoo.com",      // بدون https وبدون / في النهاية
  "fox226.vercel.app",  // أضف هذه أيضاً احتياطاً
  "fox3-nu.vercel.app",
  "localhost",
  "127.0.0.1",
  "192.168.1.4",
  "192.168.1.4:8081"
];


if (!allowedDomains.includes(window.location.hostname)) {
  document.body.innerHTML = `
    <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; font-family:sans-serif; direction:rtl; background:#0a0c10; color:white; text-align:center; padding:20px;">
      <h1 style="color:#ef4444;">النسخة غير مرخصة لهذا النطاق</h1>
      <p style="color:#94a3b8;">برجاء التواصل مع المطور لتفعيل النظام على هذا الدومين.</p>
      <a href="mailto:sas.3pl@gmail.com" style="margin-top:20px; color:#3b82f6; text-decoration:none; border:1px solid #3b82f6; padding:10px 20px; rounded:10px;">طلب ترخيص</a>
    </div>
  `;
  throw new Error("Unauthorized Domain Lock Active");
}

createRoot(document.getElementById("root")!).render(<App />);

// نظام العمل في الخلفية
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('✅ تم تفعيل نظام العمل في الخلفية', reg);
    }).catch(err => {
      console.log('❌ فشل تفعيل نظام الخلفية', err);
    });
  });
}

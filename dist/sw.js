// public/sw.js
self.addEventListener('push', function(event) {
  const data = event.data.json();
  const options = {
    body: data.message,
    icon: '/logo.png', // حط مسار اللوجو بتاعك
    badge: '/logo.png',
    vibrate: [200, 100, 200], // اهتزاز الموبايل
    data: {
      url: data.url
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// لما المستخدم يدوس على الإشعار يفتح الموقع
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

const start = new URL(self.registration.scope);

self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || request.mode !== 'navigate') return;
  const url = new URL(request.url);
  if (url.origin !== start.origin || ![start.pathname, start.pathname + 'index.html'].includes(url.pathname)) return;

  // Family data always comes from the network. Only a generic offline screen is available here.
  event.respondWith(fetch(request).catch(() => new Response(`<!doctype html>
<html lang="ru">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Школа и кружки</title>
<style>
  :root { color-scheme: light dark; }
  body { max-width: 480px; margin: 12vh auto 0; padding: 0 24px; font: 16px/1.5 system-ui, sans-serif; }
</style>
<h1>Школа и кружки</h1>
<p>Для загрузки расписания нужно подключение к интернету.</p>
<a href="./">Попробовать снова</a>
</html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })));
});

// Service worker padrão dos jogos (app instalável que abre rápido e funciona sem internet).
// Copie para a pasta public/ do jogo (vai para a raiz do build, ao lado do index.html).
// O publicar.ps1 troca 2026.09.30-2125 pela data da publicação: cada versão nova apaga o cache antigo
// e o jogo baixa de novo o que precisar (quem abre o app com internet já pega a versão nova).
const VERSAO = '2026.09.30-2125';
// vários jogos podem morar no mesmo site (ex.: guheck.github.io/jogo-a e /jogo-b): o nome do cache leva o endereço do jogo
const PREFIXO = `jogo:${self.registration.scope}:`;
const CACHE = PREFIXO + VERSAO;
// fontes do Google usadas pelos jogos: também ficam guardadas (senão, sem internet, o texto muda de fonte)
const FORA = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(['./', './index.html']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIXO) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const local = url.origin === self.location.origin;
  if (!local && !FORA.includes(url.origin)) return;

  // a página: tenta a internet primeiro (versão nova); sem internet, usa a guardada.
  // 'no-cache' confere com o servidor: sem isso o navegador pode entregar a página guardada há até 10 min
  // (o GitHub Pages manda max-age=600) e a versão nova demora a aparecer
  if (local && req.mode === 'navigate') {
    e.respondWith(
      fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copia));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // o resto (código, imagens, sons, fontes): se já está guardado, usa; senão baixa e guarda.
  // Ao baixar, confere com o servidor ('no-cache'): uma cópia velha do navegador nunca entra no cache da versão
  // nova (misturar arquivos de versões diferentes deixava as falas cortadas no Fodinha)
  e.respondWith(
    caches.match(req).then(
      (guardado) =>
        guardado ||
        fetch(req, { cache: 'no-cache' }).then((res) => {
          if (res.ok || res.type === 'opaque') {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return res;
        }),
    ),
  );
});

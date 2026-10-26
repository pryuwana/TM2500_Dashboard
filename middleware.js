// Proteksi password (HTTP Basic Auth) untuk seluruh dashboard, termasuk data.json.
// Username & password diatur di Vercel: Project Settings → Environment Variables
//   DASH_USER, DASH_PASS  (ubah nilainya lalu Redeploy untuk ganti password)
// Bila env belum diisi, semua akses ditolak (fail closed).

export const config = { matcher: '/:path*' };

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export default function middleware(request) {
  const USER = process.env.DASH_USER;
  const PASS = process.env.DASH_PASS;
  const auth = request.headers.get('authorization') || '';
  const [scheme, encoded] = auth.split(' ');

  if (USER && PASS && scheme === 'Basic' && encoded) {
    let decoded = '';
    try { decoded = atob(encoded); } catch (e) { decoded = ''; }
    const i = decoded.indexOf(':');
    if (i > -1 && safeEqual(decoded.slice(0, i), USER) && safeEqual(decoded.slice(i + 1), PASS)) {
      return; // lanjut ke file statis
    }
  }

  return new Response('Akses terbatas — masukkan username & password dashboard TM2500.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="TM2500 Dashboard", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

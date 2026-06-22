const https = require('https');
const http = require('http');

function resolveUrl(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'curl/7.68.0' } }, (res) => {
      console.log('Status Code:', res.statusCode);
      console.log('Location:', res.headers.location);
      if (res.headers.location) {
        resolve(res.headers.location);
      } else {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve({ body_length: body.length, body: body.slice(0, 500) });
        });
      }
    }).on('error', reject);
  });
}
resolveUrl('https://maps.app.goo.gl/wJk4zU48n2xS7s9A9').then(console.log).catch(console.error);

const https = require('https');
https.get('https://www.google.co.id/maps/place/Medalion+service+hp/data=!4m7!3m6!1s0x2e68e1004d9af107:0xf97705143980627c!8m2!3d-6.8369695!4d107.6145916!16s%2Fg%2F11yzlsnbgc!19sChIJB_GaTQDhaC4RfGKAORQFd_k?authuser=0&hl=id&rclk=1', {
  headers: { 'User-Agent': 'Mozilla/5.0' }
}, (res) => {
  if (res.statusCode === 302 || res.statusCode === 301) {
     https.get(res.headers.location, { headers: {'User-Agent': 'Mozilla/5.0'} }, (res2) => {
         let data = ''; res2.on('data', c => data += c); res2.on('end', () => check(data));
     });
  } else {
     let data = ''; res.on('data', c=>data+=c); res.on('end', ()=>check(data));
  }
});
function check(data) {
  const match = data.match(/window\.APP_INITIALIZATION_STATE=([^;]+);/);
  if (match) {
    const s = match[1];
    const m = s.match(/(Jl.*Indonesia)/i);
    console.log(m ? m[1] : 'not found address');
  } else {
    console.log('no state');
  }
}

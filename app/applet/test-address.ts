import fs from 'fs';

async function test() {
  const r = await fetch('https://www.google.co.id/maps/place/Medalion+service+hp/data=!4m7!3m6!1s0x2e68e1004d9af107:0xf97705143980627c!8m2!3d-6.8369695!4d107.6145916!16s%2Fg%2F11yzlsnbgc!19sChIJB_GaTQDhaC4RfGKAORQFd_k?authuser=0&hl=id&rclk=1', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const html = await r.text();
  const stateMatch = html.match(/window\.APP_INITIALIZATION_STATE=([^;]+);/);
  if (stateMatch) {
    const s = stateMatch[1];
    console.log("Length:", s.length);
    const match = s.match(/"([^"]*Wangun[^"]*)"/i);
    console.log("Wangunsari full match:", match ? match[1] : null);
    
    // Attempt pattern to find the address array. 
    // Usually Google Maps address string contains comma separated parts.
    const indonesiaMatch = s.match(/"([^"]+Indonesia)"/);
    console.log("Indonesia address string match:", indonesiaMatch ? indonesiaMatch[1] : null);
  } else {
    console.log("Not found state");
  }
}
test();

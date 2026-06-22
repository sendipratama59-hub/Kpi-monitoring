import fs from 'fs';
async function test() {
  const url = "https://www.google.com/maps/place/VIO+Cell+sparepart+hp+dan+accesories/@-6.8789502,107.5303728,17z/data=!3m1!4b1!4m6!3m5!1s0x2e68e43e2e8b2b73:0x1b138e8ecab089db!8m2!3d-6.8789555!4d107.5329477!16s%2Fg%2F11fy0kdzny?entry=ttu";
  const getResponse = await fetch(url, { headers: { 
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
  }});
  const html = await getResponse.text();
  // Try to find address pattern
  const addressMatch = html.match(/\["([^"]+)",(?:null,){2,}\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/);
  console.log("Addr match 1:", addressMatch);
  const nameAddrMatch = html.match(/"([^"]+)",\[\[\d+\.\d+,[^\]]+\],null,\[\d+,\d+\],\d+\.\d+\],\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/);
  console.log("Name addr match:", nameAddrMatch ? nameAddrMatch[1] : null);
}
test();

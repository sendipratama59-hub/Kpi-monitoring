async function test() {
  const finalUrl = "https://maps.app.goo.gl/vA8BndhC6rM1x7X79"; // An example shortlink (not Grasela exactly but a shortlink)
  const fetchOpts = {
    redirect: 'follow' as any,
    headers: {
      'User-Agent': 'curl/7.81.0'
    }
  };
  const getResponse = await fetch(finalUrl, fetchOpts);
  const html = await getResponse.text();
  console.log(html.substring(0, 1000));
  const metaMatch = html.match(/<meta\s+property="og:url"\s+content="([^"]+)"/i);
  console.log("META URL:", metaMatch ? metaMatch[1] : null);
}
test();

async function test() {
  const url = 'https://maps.app.goo.gl/9uK2RyBvjXwTzGzG7';
  try {
    const res = await fetch(url, {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    console.log('Status', res.status);
    console.log('Location', res.headers.get('location'));
  } catch(e) {
    console.error(e);
  }
}
test();

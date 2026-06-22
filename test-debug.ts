async function test() {
  const getResponse = await fetch("http://localhost:3000/api/resolve-maps", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: "https://www.google.co.id/maps/place/Bananatech+Smartphone+Repair,+Jl.+Kp.+Wr.+No.10,+Margamulya,+Kec.+Pasirjambu,+Kabupaten+Bandung,+Jawa+Barat+40972/@-7.1040747,107.4672893,16z/data=!4m6!3m5!1s0x2e688dcbf186913b:0x6aab490aa95bd8ca!8m2!3d-7.1040747!4d107.4672893!16s%2Fg%2F11k4426flb?utm_campaign=ml-ardi-aht_2026&g_ep=Eg1tbF8yMDI2MDUyMF8wIJvbDyoASAJQAQ%3D%3D" })
  });
  const data = await getResponse.json();
  console.log("SERVER OUTPUT:", data);
}
test();

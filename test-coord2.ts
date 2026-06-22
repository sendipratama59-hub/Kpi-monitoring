async function test() {
  const url = 'https://www.google.com/maps/place/STONES+CELL,+Jl.+Sentral+No.89A,+Cibabat,+Kec.+Cimahi+Utara,+Kota+Cimahi,+Jawa+Barat+40513/data=!4m2!3m1!1s0x2e68e5f731be1ac7:0xa8e2c27dea53de34!18m1!1e1?utm_source=mstt_1&entry=gps&coh=192189&g_ep=CAESBzI2LjIxLjEYACCenQoqiwEsOTQyNjc3MjcsOTQyOTIxOTUsOTQyOTk1MzIsMTAwNzk2NDk4LDEwMDc5Nzc2MSwxMDA3OTY1MzUsOTQyODA1NzYsOTQyMDczOTQsOTQyMDc1MDYsOTQyMDg1MDYsOTQyMTg2NTMsOTQyMjk4MzksOTQyNzUxNjgsOTQyNzk2MTksMTAwODEwNDYyQgJJRA%3D%3D&skid=62626d34-e99e-490d-993c-dc8f7be0081e&g_st=ac';
  
  // Format 2: 1d and 2d
  const dMatch = url.match(/!3d([-\d.]+)!4d([-\d.]+)/);
  if (dMatch) {
      console.log('3d 4d:', dMatch[1], dMatch[2]);
  } else {
      console.log('3d 4d not found');
  }
}
test();

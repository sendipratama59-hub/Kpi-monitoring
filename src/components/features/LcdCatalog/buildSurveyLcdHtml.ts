export const buildSurveyLcdHtml = (
  SUPABASE_URL: string,
  SUPABASE_KEY: string
) => {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Survey Teknisi LCD</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
  <style>
    :root {
      --primary: #6366f1;
      --primary-dark: #4f46e5;
      --bg: #f8fafc;
      --surface: #ffffff;
      --text: #0f172a;
      --text-light: #64748b;
    }
    body {
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 0;
      background-color: var(--bg);
      color: var(--text);
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      overflow-x: hidden;
      overflow-y: auto;
    }
    .container {
      flex: 1;
      display: flex;
      flex-direction: column;
      max-width: 480px;
      margin: 0 auto;
      width: 100%;
      background: var(--surface);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
      position: relative;
    }
    .header {
      padding: 24px 20px 10px;
      text-align: center;
    }
    .psychology-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
      letter-spacing: -0.5px;
    }
    .psychology-subtitle {
      font-size: 13px;
      color: var(--text-light);
      margin: 0 0 16px 0;
      line-height: 1.4;
    }
    .progress-card {
      background: #fafafa;
      border: 1px solid #f1f5f9;
      border-radius: 20px;
      padding: 18px 16px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.01), 0 2px 4px -1px rgba(0,0,0,0.01);
      text-align: left;
    }
    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .progress-title {
      font-size: 13px;
      font-weight: 700;
      color: #4f46e5;
    }
    .progress-percentage {
      font-size: 14px;
      font-weight: 800;
      color: #4f46e5;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .progress-bar-container {
      position: relative;
      background: #e2e8f0;
      height: 10px;
      border-radius: 999px;
      margin-bottom: 16px;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #ef4444, #f97316, #6366f1);
      background-size: 300% 100%;
      animation: fireGradient 3s ease infinite;
      width: 20%;
      border-radius: 999px;
      transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
      position: relative;
    }
    .progress-fill::after {
      content: '🔥';
      position: absolute;
      right: -8px;
      top: 50%;
      transform: translateY(-50%) scale(var(--fire-scale, 1));
      font-size: 16px;
      filter: drop-shadow(0 2px 4px rgba(239, 68, 68, 0.4));
      transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes fireGradient {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .progress-steps {
      display: flex;
      justify-content: space-between;
      position: relative;
    }
    .progress-steps::before {
      content: '';
      position: absolute;
      top: 10px;
      left: 10%;
      right: 10%;
      height: 2px;
      background: #e2e8f0;
      z-index: 1;
    }
    .progress-step-node {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      position: relative;
      z-index: 2;
    }
    .step-circle {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid #e2e8f0;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
      color: #94a3b8;
      transition: all 0.4s ease;
    }
    .step-label {
      font-size: 10px;
      font-weight: 600;
      color: #94a3b8;
      margin-top: 6px;
      transition: all 0.4s ease;
      text-align: center;
    }
    /* Completed Node: Checkmark */
    .progress-step-node.completed .step-circle {
      border-color: #6366f1;
      background: #6366f1;
      color: white;
    }
    .progress-step-node.completed .step-label {
      color: #6366f1;
      font-weight: 700;
    }
    /* Active Node: Dot style */
    .progress-step-node.active .step-circle {
      border-color: #6366f1;
      background: #6366f1;
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
    }
    .progress-step-node.active .step-circle::after {
      content: '';
      width: 6px;
      height: 6px;
      background: white;
      border-radius: 50%;
    }
    .progress-step-node.active .step-label {
      color: #4f46e5;
      font-weight: 800;
    }
    .step {
      display: none;
      flex-direction: column;
      padding: 24px 20px 40px;
      animation: fadeIn 0.4s ease forwards;
    }
    .step.active {
      display: flex;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .question-title {
      font-size: 20px;
      font-weight: 800;
      margin-bottom: 8px;
      line-height: 1.3;
      letter-spacing: -0.3px;
    }
    .question-subtitle {
      font-size: 13px;
      color: var(--text-light);
      margin-bottom: 24px;
      line-height: 1.4;
    }
    .options-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .option-btn {
      background: var(--surface);
      border: 1.5px solid #e2e8f0;
      border-radius: 16px;
      padding: 16px 20px;
      font-size: 15px;
      font-weight: 600;
      color: var(--text);
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: all 0.2s ease;
      text-align: left;
      position: relative;
      -webkit-tap-highlight-color: transparent;
    }
    .option-btn:hover {
      border-color: #cbd5e1;
      transform: translateY(-1px);
    }
    .option-btn:active {
      transform: translateY(1px);
    }
    .option-btn.selected {
      border-color: var(--primary-dark);
      background: #f5f3ff;
      color: var(--primary-dark);
      box-shadow: inset 0 0 0 1px var(--primary-dark);
    }
    /* Recommendation Styling: Extremely soft and warm, no badges */
    .option-btn.is-recommended {
      background-color: #f0fdf4;
      border-color: #d1fae5;
    }
    .option-btn.is-recommended:hover {
      border-color: #a7f3d0;
    }
    .option-btn.selected.is-recommended {
      border-color: #10b981;
      background: #ecfdf5;
      color: #065f46;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.08), inset 0 0 0 1px #10b981;
    }
    .option-icon {
      font-size: 22px;
      margin-right: 14px;
      background: #f1f5f9;
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      transition: background-color 0.2s;
    }
    .option-btn.selected .option-icon {
      background: white;
    }
    .footer {
      padding: 20px;
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #f1f5f9;
      background: var(--surface);
    }
    .nav-btn {
      padding: 14px 24px;
      border-radius: 999px;
      font-weight: 600;
      font-size: 15px;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-prev {
      background: #f1f5f9;
      color: var(--text-light);
    }
    .btn-prev:hover {
      background: #e2e8f0;
    }
    .btn-next {
      background: var(--primary-dark);
      color: white;
      flex: 1;
      margin-left: 12px;
      opacity: 0.5;
      pointer-events: none;
    }
    .btn-next.enabled {
      opacity: 1;
      pointer-events: auto;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }
    .btn-next.enabled:active {
      transform: scale(0.98);
    }
    .success-screen {
      text-align: center;
      padding: 20px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      flex: 1;
    }
    .check-circle {
      width: 80px;
      height: 80px;
      background: #10b981;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 40px;
      margin-bottom: 24px;
      animation: scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
    @keyframes scaleIn {
      from { transform: scale(0); }
      to { transform: scale(1); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header" id="header" style="display: none;">
      <h1 class="psychology-title">Hebat sekali! 🥳</h1>
      <p class="psychology-subtitle">Tinggal beberapa pertanyaan lagi untuk menyelesaikan survei.</p>
      
      <!-- Progress Card matching user's image exactly -->
      <div class="progress-card">
        <div class="progress-header">
          <div class="progress-title">Progres Anda</div>
          <div class="progress-percentage" id="progress-percentage">20% 🔥</div>
        </div>
        
        <div class="progress-bar-container">
          <div class="progress-fill" id="progress-bar"></div>
        </div>
        
        <div class="progress-steps">
          <div class="progress-step-node" id="node-1">
            <div class="step-circle"></div>
            <div class="step-label" id="label-node-1">Nama</div>
          </div>
          <div class="progress-step-node" id="node-2">
            <div class="step-circle"></div>
            <div class="step-label" id="label-node-2">Brand</div>
          </div>
          <div class="progress-step-node" id="node-3">
            <div class="step-circle"></div>
            <div class="step-label" id="label-node-3">Jumlah</div>
          </div>
          <div class="progress-step-node" id="node-4">
            <div class="step-circle"></div>
            <div class="step-label" id="label-node-4">Suka</div>
          </div>
          <div class="progress-step-node" id="node-5">
            <div class="step-circle"></div>
            <div class="step-label" id="label-node-5">Selesai</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 0: Sales Screening -->
    <div class="step active" id="step-sales">
      <div style="text-align: center; padding: 20px 0;">
        <div style="font-size: 54px; margin-bottom: 20px; animation: bounce 2s infinite;">💼</div>
        <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.5px; color: #0f172a;">Sebagai Salesman</h2>
        <p style="color: var(--text-light); margin-bottom: 30px; line-height: 1.5; font-size: 14px;">Tentukan status mitra untuk memulai survei:</p>
        
        <div class="options-grid" data-question="status_toko" data-type="single">
          <button class="option-btn" data-value="Sudah Pakai" style="display: flex; gap: 16px; align-items: center; width: 100%;">
            <div class="option-icon" style="background: #ecfdf5; color: #10b981;">✅</div>
            <div style="text-align: left;">
              <div style="font-weight: 700; font-size: 15px;">Toko Sudah Pakai</div>
              <div style="font-size: 12px; color: var(--text-light); font-weight: 400; margin-top: 2px;">Mitra aktif menggunakan LCD Vivan / Xpas</div>
            </div>
          </button>
          <button class="option-btn" data-value="Belum Pakai" style="display: flex; gap: 16px; align-items: center; width: 100%;">
            <div class="option-icon" style="background: #fef2f2; color: #ef4444;">❌</div>
            <div style="text-align: left;">
              <div style="font-weight: 700; font-size: 15px;">Toko Belum Pakai</div>
              <div style="font-size: 12px; color: var(--text-light); font-weight: 400; margin-top: 2px;">Mitra belum pernah mencoba LCD Vivan / Xpas</div>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Step 1: Welcome -->
    <div class="step" id="step-0">
      <div style="text-align: center; padding: 20px 0;">
        <div style="font-size: 54px; margin-bottom: 20px; animation: bounce 2s infinite;">👋</div>
        <h2 style="font-size: 26px; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.5px;">Halo Mitra Teknisi!</h2>
        <p style="color: var(--text-light); margin-bottom: 30px; line-height: 1.5; font-size: 14px;">Bantu kami menghadirkan produk terbaik dengan membagikan sedikit pengalaman berharga Anda.</p>
        
        <div style="text-align: left; margin-bottom: 30px; background: #fafafa; padding: 20px; border-radius: 16px; border: 1px dashed #e2e8f0;">
          <label style="display: block; font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Nama Toko / Nama Anda</label>
          <input type="text" id="technicianName" placeholder="Tulis nama atau toko Anda disini..." style="width: 100%; padding: 16px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 15px; font-family: inherit; box-sizing: border-box; outline: none; transition: all 0.2s; background: white;" oninput="validateWelcomeForm()">
        </div>

        <button class="nav-btn" id="startSurveyBtn" style="background: var(--primary-dark); color: white; width: 100%; font-size: 16px; padding: 18px; border-radius: 16px; box-shadow: 0 8px 20px rgba(79, 70, 229, 0.25); font-weight: 700; transition: transform 0.2s; opacity: 0.6; pointer-events: none;">Saya Siap Berbagi Pengalaman 🚀</button>
      </div>
    </div>

    <!-- Step 2: Question 1 -->
    <div class="step" id="step-1">
      <!-- Dynamically generated -->
    </div>

    <!-- Step 3: Question 2 -->
    <div class="step" id="step-2">
      <!-- Dynamically generated -->
    </div>

    <!-- Step 4: Question 3 -->
    <div class="step" id="step-3">
      <!-- Dynamically generated -->
    </div>

    <!-- Step 5: Success Screen -->
    <div class="step" id="step-4">
      <div class="success-screen">
        <div class="check-circle" style="background: #10b981;">✓</div>
        <h2 style="font-size: 26px; font-weight: 800; margin-bottom: 10px; letter-spacing: -0.5px; color: #10b981;">Survei Selesai! 🎉</h2>
        <p style="color: var(--text-light); line-height: 1.6; font-size: 15px; max-width: 320px; margin: 0 auto; margin-bottom: 12px;">Survei Anda berhasil disimpan dengan aman.</p>
        <button class="nav-btn" style="background: var(--primary-dark); color: white; width: 100%; margin-top: 24px; padding: 16px; border-radius: 14px; font-weight: 700; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);" onclick="location.reload()">Selesai & Muat Ulang</button>
      </div>
    </div>

    <div class="footer" id="footer" style="display: none;">
      <button class="nav-btn btn-prev" id="btnPrev">Kembali</button>
      <button class="nav-btn btn-next" id="btnNext">Lanjut</button>
    </div>
  </div>

  <script>
    const SUPABASE_URL = '${SUPABASE_URL}';
    const SUPABASE_KEY = '${SUPABASE_KEY}';

    let currentStep = 0;
    const totalSteps = 6;
    const answers = {
      status_toko: '',
      nama: '',
      brand_pilihan: 'Xpas',
      qty_perbulan: '20',
      suka_sudah: 'Garansi dan kualitas',
      brand_lain: 'Og',
      suka_belum: 'Grosir dekat',
      qty_service_perbulan: '20'
    };
    let confettiFired = false;

    function validateWelcomeForm() {
      const input = document.getElementById('technicianName').value.trim();
      const btn = document.getElementById('startSurveyBtn');
      if (input.length > 1) {
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
        btn.style.transform = 'scale(1)';
      } else {
        btn.style.opacity = '0.6';
        btn.style.pointerEvents = 'none';
      }
    }

    function generateStepsHTML() {
      const isSudah = answers.status_toko === 'Sudah Pakai';
      
      // Step 2 (Question 1)
      const step1 = document.getElementById('step-1');
      if (isSudah) {
        step1.innerHTML = '<div class="question-title">Lebih Sering Pakai VIVAN atau XPAS? 🟦🟥</div>' +
          '<div class="question-subtitle">Pilih salah satu brand yang paling sering Anda gunakan di toko</div>' +
          '<div class="options-grid" data-question="brand_pilihan" data-type="single">' +
            '<button class="option-btn" data-value="Vivan"><div class="option-icon">🟦</div><span>Vivan</span></button>' +
            '<button class="option-btn is-recommended" data-value="Xpas"><div class="option-icon">🟥</div><span>Xpas</span></button>' +
            '<button class="option-btn" data-value="Keduanya"><div class="option-icon">🤩</div><span>Keduanya</span></button>' +
          '</div>';
      } else {
        step1.innerHTML = '<div class="question-title">Lebih Sering Pakai Brand Apa? 📱</div>' +
          '<div class="question-subtitle">Pilih satu atau lebih brand LCD yang biasa Anda gunakan (Bisa pilih lebih dari 1)</div>' +
          '<div class="options-grid" data-question="brand_lain" data-type="multi">' +
            '<button class="option-btn" data-value="Meetoo"><div class="option-icon">📱</div><span>Meetoo</span></button>' +
            '<button class="option-btn is-recommended" data-value="Og"><div class="option-icon">⭐</div><span>Og</span></button>' +
            '<button class="option-btn" data-value="Lf"><div class="option-icon">⚙️</div><span>Lf</span></button>' +
            '<button class="option-btn" data-value="Hx"><div class="option-icon">⚡</div><span>Hx</span></button>' +
            '<button class="option-btn" data-value="Brader"><div class="option-icon">🤝</div><span>Brader</span></button>' +
          '</div>';
      }

      // Step 3 (Question 2)
      const step2 = document.getElementById('step-2');
      if (isSudah) {
        step2.innerHTML = '<div class="question-title">Qty Vivan/Xpas Perbulan 📦</div>' +
          '<div class="question-subtitle">Berapa rata-rata jumlah pembelian LCD Vivan/Xpas di toko Anda setiap bulan?</div>' +
          '<div class="options-grid" data-question="qty_perbulan" data-type="single">' +
            '<button class="option-btn" data-value="10"><div class="option-icon">📦</div><span>10</span></button>' +
            '<button class="option-btn is-recommended" data-value="20"><div class="option-icon">🔥</div><span>20</span></button>' +
            '<button class="option-btn" data-value="30"><div class="option-icon">⚡</div><span>30</span></button>' +
            '<button class="option-btn" data-value="50"><div class="option-icon">🚀</div><span>50</span></button>' +
          '</div>';
      } else {
        step2.innerHTML = '<div class="question-title">Apa yang Anda Sukai dari LCD Tersebut? 💡</div>' +
          '<div class="question-subtitle">Faktor utama apa yang membuat Anda menyukai brand LCD yang saat ini digunakan?</div>' +
          '<div class="options-grid" data-question="suka_belum" data-type="single">' +
            '<button class="option-btn" data-value="Murah dan berkualitas"><div class="option-icon">💰</div><span>Murah dan berkualitas</span></button>' +
            '<button class="option-btn" data-value="Murah dan garansi"><div class="option-icon">🛡️</div><span>Murah dan garansi</span></button>' +
            '<button class="option-btn is-recommended" data-value="Grosir dekat"><div class="option-icon">📍</div><span>Grosir dekat</span></button>' +
          '</div>';
      }

      // Step 4 (Question 3)
      const step3 = document.getElementById('step-3');
      if (isSudah) {
        step3.innerHTML = '<div class="question-title">Apa yang Paling Anda Sukai dari Vivan/Xpas? ❤️</div>' +
          '<div class="question-subtitle">Keunggulan utama apa yang paling Anda rasakan dari LCD Vivan/Xpas?</div>' +
          '<div class="options-grid" data-question="suka_sudah" data-type="single">' +
            '<button class="option-btn is-recommended" data-value="Garansi dan kualitas"><div class="option-icon">⭐</div><span>Garansi dan kualitas</span></button>' +
            '<button class="option-btn" data-value="Murah dan berkualitas"><div class="option-icon">💰</div><span>Murah dan berkualitas</span></button>' +
            '<button class="option-btn" data-value="Murah dan garansi"><div class="option-icon">🛡️</div><span>Murah dan garansi</span></button>' +
          '</div>';
      } else {
        step3.innerHTML = '<div class="question-title">Rata-Rata Service LCD Per Bulan 🛠️</div>' +
          '<div class="question-subtitle">Berapa banyak LCD yang diservice oleh toko Anda setiap bulan?</div>' +
          '<div class="options-grid" data-question="qty_service_perbulan" data-type="single">' +
            '<button class="option-btn is-recommended" data-value="20"><div class="option-icon">🛠️</div><span>20</span></button>' +
            '<button class="option-btn" data-value="30"><div class="option-icon">📈</div><span>30</span></button>' +
            '<button class="option-btn" data-value="60"><div class="option-icon">⚡</div><span>60</span></button>' +
            '<button class="option-btn" data-value="100"><div class="option-icon">🏆</div><span>100</span></button>' +
          '</div>';
      }

      // Update node labels
      const label2 = document.getElementById('label-node-2');
      const label3 = document.getElementById('label-node-3');
      const label4 = document.getElementById('label-node-4');
      if (isSudah) {
        if (label2) label2.innerText = 'Brand';
        if (label3) label3.innerText = 'Jumlah';
        if (label4) label4.innerText = 'Suka';
      } else {
        if (label2) label2.innerText = 'Brand';
        if (label3) label3.innerText = 'Suka';
        if (label4) label4.innerText = 'Service';
      }

      // Re-apply click listeners for dynamically rendered buttons
      document.querySelectorAll('.step .option-btn').forEach(btn => {
        btn.addEventListener('click', handleOptionClick);
      });
    }

    function handleOptionClick() {
      const grid = this.closest('.options-grid');
      const questionId = grid.dataset.question;
      const selectType = grid.dataset.type || 'single';
      const value = this.dataset.value;

      if (selectType === 'single') {
        grid.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        answers[questionId] = value;
        
        // Auto-advance after small delay
        setTimeout(() => {
          if (currentStep < totalSteps - 1) {
             document.getElementById('btnNext').click();
          }
        }, 350);
      } else {
        this.classList.toggle('selected');
        const selectedButtons = grid.querySelectorAll('.option-btn.selected');
        const values = Array.from(selectedButtons).map(b => b.dataset.value);
        answers[questionId] = values.join(', ');
      }

      validateNextButton();
    }

    function validateNextButton() {
      const btnNext = document.getElementById('btnNext');
      if (currentStep >= 2 && currentStep < totalSteps - 1) {
        const activeStep = document.querySelectorAll('.step')[currentStep];
        const grid = activeStep.querySelector('.options-grid');
        if (grid) {
          const questionId = grid.dataset.question;
          if (answers[questionId] && answers[questionId].length > 0) {
            btnNext.classList.add('enabled');
          } else {
            btnNext.classList.remove('enabled');
          }
        }
      }
    }

    const updateUI = () => {
      // Update step visibility
      document.querySelectorAll('.step').forEach((el, idx) => {
        if (idx === currentStep) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });

      const header = document.getElementById('header');
      const footer = document.getElementById('footer');
      const psychTitle = document.querySelector('.psychology-title');
      const psychSubtitle = document.querySelector('.psychology-subtitle');

      if (currentStep <= 1) {
        header.style.display = 'none';
        footer.style.display = 'none';
      } else {
        header.style.display = 'block';
        
        if (currentStep < totalSteps - 2) {
          footer.style.display = 'flex';
          if (psychTitle) psychTitle.innerHTML = 'Hebat sekali! 🥳';
          if (psychSubtitle) psychSubtitle.innerHTML = 'Tinggal beberapa pertanyaan lagi untuk menyelesaikan survei.';
        } else if (currentStep === totalSteps - 2) {
          footer.style.display = 'flex';
          if (psychTitle) psychTitle.innerHTML = 'Hebat sekali! 🥳';
          if (psychSubtitle) psychSubtitle.innerHTML = 'Tinggal beberapa pertanyaan lagi untuk menyelesaikan survei.';
        } else {
          footer.style.display = 'none';
          if (psychTitle) psychTitle.innerHTML = 'Terima kasih banyak! ❤️';
          if (psychSubtitle) psychSubtitle.innerHTML = 'Kontribusi Anda sangat berharga bagi peningkatan kualitas produk kami.';
        }

        // Percentage mapping
        const percentages = [0, 0, 20, 50, 80, 100];
        const progress = percentages[currentStep] || 100;
        
        // Update progress bar
        const progressBar = document.getElementById('progress-bar');
        progressBar.style.width = progress + '%';
        
        // Update fire emoji scale
        let fireScale = 1.0;
        if (progress === 50) fireScale = 1.3;
        else if (progress === 80) fireScale = 1.6;
        else if (progress === 100) fireScale = 2.0;
        progressBar.style.setProperty('--fire-scale', fireScale);
        
        // Update percentage display text
        const percentageText = document.getElementById('progress-percentage');
        if (currentStep === totalSteps - 1) {
          percentageText.innerHTML = '100% Selesai 🎉';
        } else {
          percentageText.innerHTML = progress + '% 🔥';
        }

        // Update checkpoints
        for (let i = 1; i <= 5; i++) {
          const node = document.getElementById('node-' + i);
          if (!node) continue;
          const circle = node.querySelector('.step-circle');
          
          node.classList.remove('active', 'completed');
          circle.innerHTML = '';
          
          if (i < currentStep) {
            node.classList.add('completed');
            circle.innerHTML = '✓';
          } else if (i === currentStep) {
            if (currentStep === totalSteps - 1) {
              node.classList.add('completed');
              circle.innerHTML = '✓';
            } else {
              node.classList.add('active');
            }
          }
        }

        // Ensure active options are styled with "selected" class
        document.querySelectorAll('.step .option-btn').forEach(btn => {
          const grid = btn.closest('.options-grid');
          if (!grid) return;
          const qId = grid.dataset.question;
          const val = btn.dataset.value;
          const type = grid.dataset.type || 'single';
          
          if (type === 'single') {
            if (answers[qId] === val) {
              btn.classList.add('selected');
            } else {
              btn.classList.remove('selected');
            }
          } else {
            const vals = (answers[qId] || '').split(',').map(s => s.trim());
            if (vals.includes(val)) {
              btn.classList.add('selected');
            } else {
              btn.classList.remove('selected');
            }
          }
        });

        // Toggle "Kembali" button
        const btnPrev = document.getElementById('btnPrev');
        btnPrev.style.visibility = currentStep === 2 ? 'hidden' : 'visible';

        validateNextButton();
      }

      // Confetti logic
      if (currentStep === totalSteps - 1 && !confettiFired) {
        confettiFired = true;
        if (typeof confetti === 'function') {
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });
          setTimeout(() => {
            confetti({
              particleCount: 100,
              angle: 60,
              spread: 60,
              origin: { x: 0, y: 0.6 }
            });
            confetti({
              particleCount: 100,
              angle: 120,
              spread: 60,
              origin: { x: 1, y: 0.6 }
            });
          }, 250);
        }
      }

      const btnNext = document.getElementById('btnNext');
      if (currentStep === totalSteps - 2) {
        btnNext.textContent = 'Kirim Survei';
        btnNext.classList.add('enabled'); // Always allow submission since default values are chosen
      } else {
        btnNext.textContent = 'Lanjut';
      }
    };

    // Sales screening click event
    document.querySelectorAll('#step-sales .option-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const val = this.dataset.value;
        answers.status_toko = val;
        
        document.querySelectorAll('#step-sales .option-btn').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        
        setTimeout(() => {
          currentStep = 1;
          updateUI();
        }, 350);
      });
    });

    // Start Survey Button Click
    document.getElementById('startSurveyBtn').addEventListener('click', () => {
      const nameInput = document.getElementById('technicianName').value.trim();
      answers.nama = nameInput || 'Teknisi Tanpa Nama';
      
      generateStepsHTML();
      currentStep = 2;
      updateUI();
    });

    // Next Button Clicked
    document.getElementById('btnNext').addEventListener('click', async () => {
      if (currentStep < totalSteps - 2) {
        currentStep++;
        updateUI();
      } else if (currentStep === totalSteps - 2) {
        const btnNext = document.getElementById('btnNext');
        btnNext.textContent = 'Mengirim...';
        btnNext.style.opacity = '0.7';
        btnNext.style.pointerEvents = 'none';
        
        try {
          let brand_lcd_val = '';
          let qty_lcd_val = '';
          let alamat_asli_val = '';
          
          if (answers.status_toko === 'Sudah Pakai') {
            brand_lcd_val = '[SUDAH PAKAI] Terbiasa: ' + answers.brand_pilihan;
            qty_lcd_val = answers.qty_perbulan;
            alamat_asli_val = '[Sudah Pakai] Suka: ' + answers.suka_sudah;
          } else {
            brand_lcd_val = '[BELUM PAKAI] Brand Lain: ' + answers.brand_lain;
            qty_lcd_val = 'Service Qty: ' + answers.qty_service_perbulan;
            alamat_asli_val = '[Belum Pakai] Suka: ' + answers.suka_belum;
          }

          // Submit answers to Supabase REST endpoint
          await fetch(SUPABASE_URL + '/rest/v1/survey_lcd', {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': 'Bearer ' + SUPABASE_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              nama_toko: answers.nama,
              brand_lcd: brand_lcd_val,
              qty_lcd: qty_lcd_val,
              alamat_asli: alamat_asli_val,
              created_at: new Date().toISOString()
            })
          });
          
          currentStep++;
          updateUI();
        } catch (e) {
          alert('Gagal mengirim data');
          btnNext.textContent = 'Kirim Survei';
          btnNext.style.opacity = '1';
          btnNext.style.pointerEvents = 'auto';
        }
      }
    });

    // Prev Button Clicked
    document.getElementById('btnPrev').addEventListener('click', () => {
      if (currentStep > 2) {
        currentStep--;
        updateUI();
      }
    });

    updateUI();
  </script>
</body>
</html>`;
};

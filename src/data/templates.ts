export const SPREADSHEET_TEMPLATE_INFO = `
Struktur Kolom Spreadsheet (Google Sheets) yang Direkomendasikan:

1. Sheet: "Pelanggan"
Kolom:
- A: ID_PELANGGAN (Teks - Kunci Unik)
- B: NAMA_PELANGGAN (Teks)
- C: NO_TELEPON (Teks)
- D: ALAMAT (Teks)
- E: AREA_DESA (Teks - e.g. Dusun Krajan)
- F: ID_METER_PLN (Teks)
- G: ID_METER_PDAM (Teks)
- H: STATUS_WIFI (AKTIF/NONAKTIF)

2. Sheet: "Tagihan_Belum_Bayar"
Kolom:
- A: ID_TAGIHAN (Teks - Kunci Unik)
- B: ID_PELANGGAN (Teks)
- C: NAMA_PELANGGAN (Teks)
- D: JENIS_TAGIHAN (wifi / pln / pdam)
- E: PERIODE_BULAN (YYYY-MM)
- F: JUMLAH_TAGIHAN (Angka)
- G: TANGGAL_JATUH_TEMPO (Tanggal)
- H: AREA_DESA (Teks)

3. Sheet: "Pembayaran_Selesai"
Kolom:
- A: ID_TRANSAKSI (Teks)
- B: ID_TAGIHAN (Teks)
- C: ID_PELANGGAN (Teks)
- D: NAMA_PELANGGAN (Teks)
- E: JENIS_TAGIHAN (wifi / pln / pdam)
- F: PERIODE_BULAN (YYYY-MM)
- G: JUMLAH_BAYAR (Angka)
- H: TANGGAL_BAYAR (Tanggal & Waktu)
- I: PETUGAS_KASIR (Teks)
- J: NO_REFERENSI (Teks)

4. Sheet: "Arus_Kas"
Kolom:
- A: ID_KAS (Teks)
- B: TANGGAL (Tanggal)
- C: TIPE (MASUK/KELUAR)
- D: KATEGORI (Teks)
- E: NOMINAL (Angka)
- F: KETERANGAN (Teks)
`;

export const CODE_GS_TEMPLATE = `/**
 * Google Apps Script (code.gs)
 * Untuk mengintegrasikan Aplikasi Tagihan Desa dengan Google Sheets Anda.
 * Deploy ini sebagai "Web App" dengan akses "Anyone" (Siapa Saja).
 */

const SPREADSHEET_ID = "MASUKKAN_ID_SPREADSHEET_ANDA_DISINI";

function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Sistem Pembayaran Tagihan Desa')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Handler POST dari luar (React App / HTTP client luar)
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const result = handleAction(params);
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch(e) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: e.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Server-side function untuk dipanggil dari index.html via google.script.run
function executeServerAction(params) {
  try {
    return JSON.stringify(handleAction(params));
  } catch(e) {
    return JSON.stringify({ status: "error", message: e.toString() });
  }
}

// Fungsi inti pemrosesan aksi
function handleAction(params) {
  const action = params.action;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  if (action === "syncPelanggan") {
    const sheet = ss.getSheetByName("Pelanggan") || ss.insertSheet("Pelanggan");
    sheet.clear();
    sheet.appendRow(["ID_PELANGGAN", "NAMA_PELANGGAN", "NO_TELEPON", "ALAMAT", "AREA_DESA", "ID_METER_PLN", "ID_METER_PDAM", "STATUS_WIFI"]);
    
    params.data.forEach(function(item) {
      sheet.appendRow([
        item.id,
        item.name,
        item.phone,
        item.address,
        item.area,
        item.plnId,
        item.pdamId,
        item.wifiStatus
      ]);
    });
    return { status: "success", message: "Data pelanggan berhasil disinkronkan" };
  }
  
  if (action === "bayarTagihan") {
    const sheetBayar = ss.getSheetByName("Pembayaran_Selesai") || ss.insertSheet("Pembayaran_Selesai");
    const sheetKas = ss.getSheetByName("Arus_Kas") || ss.insertSheet("Arus_Kas");
    
    if (sheetBayar.getLastRow() === 0) {
      sheetBayar.appendRow(["ID_TRANSAKSI", "ID_TAGIHAN", "ID_PELANGGAN", "NAMA_PELANGGAN", "JENIS_TAGIHAN", "PERIODE_BULAN", "JUMLAH_BAYAR", "TANGGAL_BAYAR", "PETUGAS_KASIR", "NO_REFERENSI"]);
    }
    
    const paymentId = "TX" + new Date().getTime();
    const refNo = params.referenceNo || ("REF-" + Math.floor(100000 + Math.random() * 900000));
    
    sheetBayar.appendRow([
      paymentId,
      params.tagihanId,
      params.pelangganId,
      params.pelangganName,
      params.type,
      params.month,
      params.amount,
      new Date(),
      params.cashierName,
      refNo
    ]);
    
    // Catat ke Arus Kas
    if (sheetKas.getLastRow() === 0) {
      sheetKas.appendRow(["ID_KAS", "TANGGAL", "TIPE", "KATEGORI", "NOMINAL", "KETERANGAN"]);
    }
    sheetKas.appendRow([
      "KAS" + new Date().getTime(),
      new Date(),
      "MASUK",
      "Pembayaran " + params.type.toUpperCase() + " - " + params.pelangganName,
      params.amount,
      "Pembayaran Tagihan periode " + params.month + " via Kasir " + params.cashierName
    ]);
    
    return {
      status: "success",
      paymentId: paymentId,
      referenceNo: refNo,
      message: "Pembayaran berhasil dicatat di Google Sheets"
    };
  }

  if (action === "catatArusKas") {
    const sheetKas = ss.getSheetByName("Arus_Kas") || ss.insertSheet("Arus_Kas");
    if (sheetKas.getLastRow() === 0) {
      sheetKas.appendRow(["ID_KAS", "TANGGAL", "TIPE", "KATEGORI", "NOMINAL", "KETERANGAN"]);
    }
    sheetKas.appendRow([
      "KAS" + new Date().getTime(),
      params.date || new Date(),
      params.type, // MASUK / KELUAR
      params.category,
      params.amount,
      params.description
    ]);
    return { status: "success", message: "Arus kas berhasil dicatat" };
  }
  
  return { status: "error", message: "Aksi tidak dikenal" };
}
`;

export const INDEX_HTML_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
  </style>
</head>
<body class="bg-slate-900 min-h-screen text-slate-100 p-4 md:p-8 flex items-center justify-center">
  <div class="w-full max-w-xl bg-slate-800 rounded-3xl shadow-2xl border border-slate-700 p-6 md:p-8 space-y-6">
    <div class="border-b border-slate-700 pb-4 flex justify-between items-center">
      <div>
        <h1 class="text-lg font-bold text-white tracking-tight">Loket Digital Quick-Pay</h1>
        <p class="text-xs text-slate-400 mt-1">Formulir Pembayaran Cepat Terintegrasi Google Sheets</p>
      </div>
      <div class="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
        Apps Script
      </div>
    </div>

    <form id="payForm" onsubmit="submitForm(event)" class="space-y-4">
      <div>
        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">NAMA PELANGGAN</label>
        <input type="text" id="pelangganName" required placeholder="Nama Lengkap Pelanggan" class="w-full text-xs bg-slate-950 border border-slate-700/60 rounded-xl p-3 focus:outline-none focus:border-emerald-500 text-slate-200 transition">
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">ID PELANGGAN / ID METER</label>
          <input type="text" id="pelangganId" required placeholder="E.g. PLG-KJT-001" class="w-full text-xs bg-slate-950 border border-slate-700/60 rounded-xl p-3 focus:outline-none focus:border-emerald-500 text-slate-200 transition">
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">JENIS LAYANAN</label>
          <select id="billType" required class="w-full text-xs bg-slate-950 border border-slate-700/60 rounded-xl p-3 focus:outline-none focus:border-emerald-500 text-slate-200 transition">
            <option value="wifi">WiFi Internet</option>
            <option value="pln">Listrik PLN</option>
            <option value="pdam">PDAM Air Bersih</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">PERIODE BULAN</label>
          <input type="month" id="month" required class="w-full text-xs bg-slate-950 border border-slate-700/60 rounded-xl p-3 focus:outline-none focus:border-emerald-500 text-slate-200 transition">
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">NOMINAL BAYAR (Rp)</label>
          <input type="number" id="amount" required placeholder="150000" class="w-full text-xs bg-slate-950 border border-slate-700/60 rounded-xl p-3 focus:outline-none focus:border-emerald-500 text-slate-200 transition">
        </div>
      </div>

      <div>
        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">NAMA PETUGAS KASIR LOKET</label>
        <input type="text" id="cashierName" required placeholder="Nama Kasir yang Melayani" class="w-full text-xs bg-slate-950 border border-slate-700/60 rounded-xl p-3 focus:outline-none focus:border-emerald-500 text-slate-200 transition">
      </div>

      <div class="pt-2">
        <button type="submit" id="btnSubmit" class="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl py-3.5 cursor-pointer transition">
          Simpan Transaksi ke Google Sheets
        </button>
      </div>
    </form>

    <div id="resultBox" class="hidden p-4 rounded-xl text-xs text-center border"></div>
  </div>

  <script>
    // Set default month
    const d = new Date();
    const currentMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    document.getElementById('month').value = currentMonth;

    function submitForm(event) {
      event.preventDefault();
      const btn = document.getElementById('btnSubmit');
      const resBox = document.getElementById('resultBox');
      
      btn.disabled = true;
      btn.innerText = "MEMPROSES TRANSAKSI...";
      btn.className = "w-full bg-slate-700 text-slate-400 text-xs font-bold uppercase tracking-wider rounded-xl py-3.5 cursor-not-allowed";

      const payload = {
        action: "bayarTagihan",
        pelangganId: document.getElementById('pelangganId').value,
        pelangganName: document.getElementById('pelangganName').value,
        type: document.getElementById('billType').value,
        month: document.getElementById('month').value,
        amount: Number(document.getElementById('amount').value),
        cashierName: document.getElementById('cashierName').value,
        tagihanId: "T_" + new Date().getTime()
      };

      google.script.run
        .withSuccessHandler(function(res) {
          const resp = JSON.parse(res);
          btn.disabled = false;
          btn.innerText = "Simpan Transaksi ke Google Sheets";
          btn.className = "w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl py-3.5 cursor-pointer transition";
          
          if (resp.status === "success") {
            resBox.className = "p-4 rounded-xl text-xs text-center bg-emerald-500/10 text-emerald-400 border-emerald-500/20 block";
            resBox.innerHTML = "<p class='font-bold text-sm'>Pembayaran Berhasil!</p><p class='mt-1 opacity-90'>No Ref: " + resp.referenceNo + " telah dicatat dalam Google Sheet.</p>";
            document.getElementById('payForm').reset();
            document.getElementById('month').value = currentMonth;
          } else {
            resBox.className = "p-4 rounded-xl text-xs text-center bg-rose-500/10 text-rose-400 border-rose-500/20 block";
            resBox.innerHTML = "<p class='font-bold text-sm'>Gagal Mencatat</p><p class='mt-1 opacity-90'>" + resp.message + "</p>";
          }
        })
        .withFailureHandler(function(err) {
          btn.disabled = false;
          btn.innerText = "Simpan Transaksi ke Google Sheets";
          btn.className = "w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl py-3.5 cursor-pointer transition";
          resBox.className = "p-4 rounded-xl text-xs text-center bg-rose-500/10 text-rose-400 border-rose-500/20 block";
          resBox.innerHTML = "<p class='font-bold text-sm'>Koneksi Error</p><p class='mt-1 opacity-90'>" + err.toString() + "</p>";
        })
        .executeServerAction(payload);
    }
  </script>
</body>
</html>
`;


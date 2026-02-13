// Memecah key menjadi potongan kecil
const part1 = "$2a$10$4v5UzmjJBEf7T6RUlR7";
const part2 = "CfeJERCrf/waXNcO7pxUk3OYGOzBNLJ7Fy";
const API_KEY = part1 + part2; // Gabungkan kembali saat dipakai

const BIN_ID = "6967465dd0ea881f406adee4";
let localUsers = [], localCodes = []; 
let globalGroupData = {}; // Store data for iOS modal
let globalSettings = { wdEnabled: false }; // Default setting
let currentWdCode = ""; // Menyimpan kode yang sedang di-withdraw

function switchTab(name) {
    ['detail', 'database', 'gabung'].forEach(t => {
        document.getElementById('tab-'+t).classList.remove('active');
        document.getElementById('view-'+t).classList.remove('active-view');
    });
    document.getElementById('tab-'+name).classList.add('active');
    document.getElementById('view-'+name).classList.add('active-view');
    if(name === 'database') fetchPublicData();
}

function checkAdminAccess() {
    let pass = prompt("Masukkan Sandi Admin:");
    if(pass === "2003") {
        toggleOverlay('admin-panel');
    } else if(pass !== null) {
        alert("Sandi Salah!");
    }
}

function toggleOverlay(id) {
    const el = document.getElementById(id);
    if(el.style.display === 'flex') {
        el.style.display = 'none';
        if(id === 'admin-panel') { closeAction('add'); closeAction('codes'); closeAction('filter'); closeAction('settings'); }
    } else {
        el.style.display = 'flex';
        if(id === 'admin-panel') fetchAdminData();
    }
}

/* --- FUNGSI CUSTOM ALERT --- */
function triggerLockedPopup() {
    const modal = document.getElementById('custom-alert');
    modal.classList.add('active');
}
function closeCustomAlert() {
    document.getElementById('custom-alert').classList.remove('active');
}
/* -------------------------- */

/* --- COPY CODE FUNCTION (NEW) --- */
function copyCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        alert("Kode tersalin: " + code);
    });
}

/* --- iOS DETAIL MODAL LOGIC --- */
function openIosDetail(code) {
    const data = globalGroupData[code];
    if(!data) return;

    document.getElementById('ios-modal-title').innerText = `Detail: ${code}`;
    const container = document.getElementById('ios-modal-content');
    
    const emailListHTML = data.emails.map(e => `<div class="email-item">${maskEmail(e)}</div>`).join('');
    const lockedBtn = `<div class="locked-btn" onclick="triggerLockedPopup()">🔒 Lihat Semua Email (Full)</div>`;
    
    // NEW: BIG COPY CARD
    const copyCardHTML = `
        <div class="ios-copy-card" onclick="copyCode('${code}')">
            <div style="text-align:left;">
                <div class="ios-copy-label">Kode Referral</div>
                <div class="ios-code-text">${code}</div>
            </div>
            <svg class="ios-copy-icon icon" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </div>
    `;

    container.innerHTML = `
        ${copyCardHTML}
        <div class="revenue-summary-box">
            <div class="rev-label">Total Pendapatan</div><div class="rev-amount">${data.revenue}</div>
            <div style="font-size:0.75rem; color:#666">Pola: 48rb - 64rb - 48rb...</div>
        </div>
        <div style="padding:0 5px;">
            <div style="font-size:0.8rem; color:#8892b0; margin-bottom:10px; font-weight:700;">DAFTAR USER (${data.count})</div>
            ${emailListHTML}
        </div>
        ${lockedBtn}
    `;

    document.getElementById('ios-detail-modal').classList.add('active');
}

// FUNGSI BARU UNTUK MEMBUKA POPUP WITHDRAW
function openWdPopup(code) {
    currentWdCode = code; // Simpan kode global
    const data = globalGroupData[code];
    
    // Isi info ringkas di popup
    document.getElementById('wd-popup-code').innerText = code;
    document.getElementById('wd-popup-revenue').innerText = data.revenue;
    
    // Buka popup
    toggleOverlay('wd-popup');
}

// FUNGSI BARU UNTUK KIRIM WA DARI POPUP
function sendWdWa() {
    if(!currentWdCode) return;
    
    const data = globalGroupData[currentWdCode];
    const name = document.getElementById('wdName-input').value;
    const bank = document.getElementById('wdBank-input').value;
    const rek = document.getElementById('wdRek-input').value;

    if(!name || !bank || !rek) return alert("Mohon lengkapi semua data pembayaran!");

    // Generate list email
    const emailList = data.emails.map((e, i) => `${i+1}. ${e}`).join('\n');

    const text = `Halo Admin Zen, saya mau Withdraw! 💸\n\n🆔 Kode: *${currentWdCode}*\n💰 Total: *${data.revenue}*\n👥 Jumlah: *${data.count}* Users\n\n🏦 Bank: *${bank}*\n💳 No Rek: *${rek}*\n👤 A/N: *${name}*\n\n📝 *Detail User:*\n${emailList}\n\nMohon diproses. Terima kasih!`;
    
    window.open(`https://wa.me/6289513304878?text=${encodeURIComponent(text)}`);
    toggleOverlay('wd-popup'); // Tutup popup setelah kirim
}

function closeIosDetail() {
    document.getElementById('ios-detail-modal').classList.remove('active');
}
/* -------------------------- */

function maskEmail(email) {
    let parts = email.split('@');
    if(parts.length < 2) return email; 
    let name = parts[0];
    let domain = parts[1];
    let visible = name.substring(0, 3);
    return `${visible}xxxx@${domain}`;
}

async function fetchPublicData() {
    const listContainer = document.getElementById('leaderboardList');
    listContainer.innerHTML = '<div style="text-align:center; padding:30px; color:#888;">Memuat data terbaru...</div>';
    try {
        const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { 'X-Master-Key': API_KEY } });
        const data = await res.json();
        localUsers = data.record.users || [];
        // Load settings from JSON
        globalSettings = data.record.settings || { wdEnabled: false };
        
        globalGroupData = {}; // Reset data container
        
        listContainer.innerHTML = '';
        if(localUsers.length === 0) { listContainer.innerHTML = '<div style="text-align:center; padding:30px; color:#888;">Belum ada data partner.</div>'; return; }

        const groups = {};
        localUsers.forEach(u => { if(!groups[u.code]) groups[u.code] = []; groups[u.code].push(u.email); });
        const sortedCodes = Object.keys(groups).sort((a,b) => groups[b].length - groups[a].length);

        sortedCodes.forEach((code, i) => {
            let rankClass = i===0?'top-1':(i===1?'top-2':(i===2?'top-3':''));
            const emails = groups[code];
            const count = emails.length;
            
            let pairs = Math.floor(count / 2);
            let remainder = count % 2;
            let revenue = (pairs * (48000 + 64000)) + (remainder * 48000);

            let revFmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(revenue);
            
            // Store data for the modal
            globalGroupData[code] = {
                emails: emails,
                revenue: revFmt,
                count: count
            };

            const uid = `group-${i}`;
            
            // LOGIC TOMBOL WD (STACKED FULL WIDTH)
            let wdBtnHTML = '';
            if(globalSettings.wdEnabled) {
                wdBtnHTML = `<button class="btn-action-full wd" onclick="openWdPopup('${code}')"><svg class="icon" viewBox="0 0 24 24" style="width:16px;"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> Tarik Uang (Withdraw)</button>`;
            }

            listContainer.innerHTML += `
                <div class="group-card ${rankClass}" id="card-${uid}">
                    <div class="group-header">
                        <div style="display:flex; align-items:center;">
                            <div class="rank-badge">#${i+1}</div>
                            <div class="group-info"><div class="group-code">${code}</div><div class="group-label">Referral Code</div></div>
                        </div>
                        <div class="count-pill">${count} User</div>
                    </div>
                    <div class="group-actions">
                        ${wdBtnHTML}
                        <button class="btn-action-full dt" onclick="openIosDetail('${code}')">Lihat Detail <svg class="icon" viewBox="0 0 24 24" style="width:16px;"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
                    </div>
                </div>`;
        });
    } catch(e) { listContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#ff6b6b;">Gagal memuat data.</div>`; }
}

function openAction(type) {
    document.querySelectorAll('.action-dialog').forEach(el => el.classList.remove('show'));
    document.getElementById('dialog-' + type).classList.add('show');
    if(type === 'add') updateSelectOptions();
    if(type === 'codes') renderCodeList();
    if(type === 'settings') {
        document.getElementById('wdToggle').checked = globalSettings.wdEnabled;
    }
}
function closeAction(type) { document.getElementById('dialog-' + type).classList.remove('show'); }

function updateSelectOptions() {
    const sel = document.getElementById('admKode'); sel.innerHTML = '<option value="">-- Pilih Kode --</option>';
    localCodes.forEach(c => { const opt = document.createElement('option'); opt.value = c; opt.innerText = c; sel.appendChild(opt); });
}

async function fetchAdminData() {
    const tbody = document.getElementById('adminTableBody'); tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Syncing...</td></tr>';
    try {
        const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { 'X-Master-Key': API_KEY } });
        const data = await res.json();
        localUsers = data.record.users || []; localCodes = data.record.codes || [];
        globalSettings = data.record.settings || { wdEnabled: false };
        renderAdminTable();
    } catch (e) { alert("Error: " + e.message); }
}

function renderAdminTable() {
    const tbody = document.getElementById('adminTableBody'); 
    tbody.innerHTML = '';
    const searchTerm = document.getElementById('adminSearch').value.toLowerCase();
    let filteredData = localUsers.map((u, i) => ({ ...u, originalIndex: i }))
                                 .filter(u => u.email.toLowerCase().includes(searchTerm) || u.code.toLowerCase().includes(searchTerm));

    if(filteredData.length === 0) { 
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px; color:#555;">Data tidak ditemukan</td></tr>'; 
        return; 
    }

    filteredData.forEach((u) => {
        tbody.innerHTML += `<tr>
            <td style="text-align:center"><input type="checkbox" class="row-check" value="${u.originalIndex}" onchange="checkMassDeleteState()"></td>
            <td><span style="color:#00c6ff; font-family:monospace">${u.code}</span></td><td>${u.email}</td>
            <td style="text-align:right"><button class="btn-action" style="color:#ffd700" onclick="editData(${u.originalIndex})"><svg class="icon" viewBox="0 0 24 24" style="width:16px;height:16px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button><button class="btn-action" style="color:#ff6b6b" onclick="deleteData(${u.originalIndex})"><svg class="icon" viewBox="0 0 24 24" style="width:16px;height:16px"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></td>
        </tr>`;
    });
    checkMassDeleteState();
}

function renderCodeList() {
    const cont = document.getElementById('codeListContainer'); cont.innerHTML = '';
    if(localCodes.length === 0) cont.innerHTML = '<div style="text-align:center; color:#555; font-size:0.75rem;">Belum ada kode master.</div>';
    localCodes.forEach((c, i) => { cont.innerHTML += `<div class="code-item"><span style="color:#00c6ff;">${c}</span><span class="code-del-btn" onclick="deleteCode(${i})">x</span></div>`; });
}

async function addNewCode() {
    const inp = document.getElementById('newCodeInput'), val = inp.value.trim();
    if(!val || localCodes.includes(val)) return alert("Kode tidak valid atau sudah ada");
    localCodes.push(val); inp.value = ''; renderCodeList(); await pushToBinAll();
}
async function deleteCode(i) { if(!confirm("Hapus kode?")) return; localCodes.splice(i, 1); renderCodeList(); await pushToBinAll(); }

async function saveData() {
    const c = document.getElementById('admKode').value, raw = document.getElementById('admEmail').value, idx = parseInt(document.getElementById('admEditIndex').value);
    if(!c || !raw.trim()) return alert("Data tidak lengkap");
    const emails = raw.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/g) || [];
    if(!emails.length) return alert("Email tidak valid");

    const dups = emails.filter(ne => localUsers.some((ex, i) => (idx !== -1 && i === idx ? false : ex.email.toLowerCase() === ne.toLowerCase())));
    if(dups.length) return alert(`Email duplikat:\n${dups.join('\n')}`);

    const btns = document.querySelectorAll('.btn-submit'); btns.forEach(b => b.innerText = 'Saving...');
    if(idx !== -1) localUsers[idx] = { code: c, email: emails[0] };
    else emails.forEach(e => localUsers.push({ code: c, email: e }));

    await pushToBinAll();
    btns.forEach(b => b.innerText = 'Simpan');
    document.getElementById('admEmail').value = ''; document.getElementById('admEditIndex').value = -1;
    closeAction('add'); renderAdminTable(); alert(`Berhasil: ${emails.length} data.`);
}

function editData(i) {
    document.getElementById('admEditIndex').value = i;
    document.getElementById('admEmail').value = localUsers[i].email;
    updateSelectOptions();
    document.getElementById('admKode').value = localUsers[i].code;
    openAction('add');
}

async function deleteData(i) { if(confirm("Hapus?")) { localUsers.splice(i, 1); renderAdminTable(); await pushToBinAll(); } }

function toggleAll(src) { document.querySelectorAll('.row-check').forEach(c => c.checked = src.checked); checkMassDeleteState(); }
function checkMassDeleteState() {
    const n = document.querySelectorAll('.row-check:checked').length, btn = document.getElementById('dockDelete');
    if(n > 0) btn.classList.add('active'); else btn.classList.remove('active');
}
async function massDelete() {
    const chk = document.querySelectorAll('.row-check:checked');
    if(!chk.length || !confirm("Hapus terpilih?")) return;
    const idxs = Array.from(chk).map(c => parseInt(c.value)).sort((a,b)=>b-a);
    idxs.forEach(i => localUsers.splice(i, 1));
    renderAdminTable(); document.getElementById('checkAll').checked = false; await pushToBinAll();
}

async function massDeleteByCode() {
    const codeToDelete = document.getElementById('filterKode').value.trim();
    if(!codeToDelete) return alert("Masukkan Kode Referral yang mau dihapus!");
    
    const count = localUsers.filter(u => u.code.toLowerCase() === codeToDelete.toLowerCase()).length;
    if(count === 0) return alert("Tidak ada data dengan kode ini.");

    if(!confirm(`⚠️ PERINGATAN: Anda akan menghapus ${count} data dengan kode '${codeToDelete}'.\n\nTindakan ini tidak bisa dibatalkan. Yakin?`)) return;

    localUsers = localUsers.filter(u => u.code.toLowerCase() !== codeToDelete.toLowerCase());
    
    renderAdminTable();
    closeAction('filter');
    await pushToBinAll();
    alert(`Berhasil menghapus ${count} data.`);
}

/* --- SETTINGS TOGGLE LOGIC --- */
async function toggleWdStatus() {
    const isChecked = document.getElementById('wdToggle').checked;
    globalSettings.wdEnabled = isChecked;
    // Push update to BIN
    await pushToBinAll();
    alert(`Fitur Withdraw: ${isChecked ? 'AKTIF' : 'NON-AKTIF'}`);
}

async function pushToBinAll() {
    await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY }, body: JSON.stringify({ users: localUsers, codes: localCodes, settings: globalSettings }) });
}

function copyFilteredEmails() {
    const filter = document.getElementById('filterKode').value.toLowerCase();
    const emails = localUsers.filter(u => u.code.toLowerCase() === filter).map(u => u.email).join(', ');
    if(emails) navigator.clipboard.writeText(emails).then(() => { alert("Disalin!"); closeAction('filter'); });
    else alert("Tidak ada data");
}

function updateCard() {
    const val = document.getElementById('reqCode').value;
    document.getElementById('displayCardCode').innerText = val ? val : 'ZEN-MEMBER';
}

function laporWa() {
    const k = document.getElementById('lapKode').value, e = document.getElementById('lapEmail').value.trim();
    if(localUsers.some(u => u.email.toLowerCase() === e.toLowerCase())) return alert('Email sudah tercatat silahkan cek di menu database');
    const text = `Berhasil Undang\n\nKode : ${k}\nEmail : ${e}`;
    window.open(`https://wa.me/6289513304878?text=${encodeURIComponent(text)}`);
}
function joinWa() {
    const k = document.getElementById('reqCode').value;
    const t = document.getElementById('reqTarget').value;
    if(!k) return alert("Isi kode unik dulu!");
    const text = `🚀 *NEW AGENT REGISTRATION*\n\nHalo Admin Zen, saya siap bergabung jadi partner!\n\n🆔 Request Kode: *${k}*\n🎯 Target: *${t || '10'}* User / Minggu\n\nMohon aksesnya segera diaktifkan. Terima kasih!`;
    window.open(`https://wa.me/6289513304878?text=${encodeURIComponent(text)}`);
}
function calc() {
    let t = parseInt(document.getElementById('reqTarget').value)||0;
    let pct = (t / 20) * 100;
    if(pct > 100) pct = 100;
    document.getElementById('calcProgress').style.width = pct + "%";
    
    // --- NEW CALC LOGIC ---
    let pairs = Math.floor(t / 2);
    let remainder = t % 2;
    let total = (pairs * 112000) + (remainder * 48000); // 112rb = 48 + 64

    const badge = document.getElementById('calcRateBadge');
    const breakdown = document.getElementById('calcBreakdownText');
    const bonus = document.getElementById('calcBonus');
    const bar = document.getElementById('calcProgress');

    // Set badge active style permanen karena looping
    badge.innerText = "Zigzag 48rb/64rb";
    badge.classList.add("active-gold"); 
    bar.classList.add("full");
    bonus.style.display = 'none'; // Disable bonus fixed karena sistemnya looping

    breakdown.innerText = `${pairs} Pasang (112rb) + ${remainder} x 48rb`;
    
    document.getElementById('calcTotal').innerText = new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(total);
}

fetchPublicData();

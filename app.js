/* TM2500 GM View — progres fisik dari S-Curve proyek, informasi kegiatan & isu dari tracker. */
(() => {
  'use strict';
  const BL = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const MON = { jan:0, feb:1, mar:2, apr:3, may:4, mei:4, jun:5, jul:6, aug:7, agu:7, sep:8, oct:9, okt:9, nov:10, dec:11, des:11 };
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const DAY = 86400000;

  // ---------- tanggal (nomor hari UTC) ----------
  const fromSerial = (n) => Math.round(n) - 25569;
  const toDay = (v) => {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return v > 20000 ? fromSerial(v) : Math.round(v);
    let m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY);
    m = String(v).match(/(\d{1,2})[-\s]([A-Za-z]{3})[a-z]*[-\s](\d{2,4})/);
    if (m && MON[m[2].toLowerCase()] != null) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return Math.floor(Date.UTC(y, MON[m[2].toLowerCase()], +m[1]) / DAY); }
    return null;
  };
  const dDate = (d) => new Date(d * DAY);
  const iso = (d) => d == null ? null : dDate(d).toISOString().slice(0, 10);
  const fmt = (d, yr = true) => { if (d == null) return '—'; const x = dDate(d); return x.getUTCDate() + ' ' + BL[x.getUTCMonth()] + (yr ? ' ' + x.getUTCFullYear() : ''); };
  const ddmm = (d) => { if (d == null) return '—'; const x = dDate(d); return String(x.getUTCDate()).padStart(2, '0') + '/' + String(x.getUTCMonth() + 1).padStart(2, '0') + '/' + x.getUTCFullYear(); };
  const pct = (x, dp = 1) => (x * 100).toFixed(dp).replace('.', ',') + '%';
  const sgn = (x) => (x >= 0 ? '+' : '−') + pct(Math.abs(x));
  const nice = (s) => { s = String(s || '').trim(); return s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s; };

  let DATA = null, RAW = { items: [], scurve: null }, tab = 'act';

  // ---------- model ----------
  function model(raw) {
    const rd = toDay(raw.reportDate);
    const sc = raw.scurve;
    const weeks = sc.weeks.map((w) => ({ w: toDay(w.w), plan: w.plan, act: w.act }));
    const withAct = weeks.filter((w) => w.act != null);
    const last = withAct[withAct.length - 1];
    const prog = { week: last.w, act: last.act, plan: last.plan, dev: last.act - last.plan };
    const ms = sc.milestones.map((m) => ({ ...m, d: toDay(m.date) })).sort((a, b) => a.d - b.d);
    const areas = sc.areas;
    const items = raw.items.map((r) => {
      const due = toDay(r.dueRevisi) ?? toDay(r.dueAwal);
      const status = (r.status || 'Open').trim();
      let flag = 'On Track';
      if (status === 'Done') flag = 'Selesai';
      else if (due != null && due < rd) flag = 'Late';
      else if ((r.risk || '').trim()) flag = 'At Risk';
      const nx = String(r.next || '').trim();
      // catatan administratif (bukan kondisi lapangan) tidak ditampilkan
      const up = String(r.update || '').trim().replace(/^(Done|Closed|N\/A) sejak [\d/]+\.?\s*/i, '').replace(/Item baru dari S-?Curve[^.]*\.?/i, '').trim();
      // Ask for Help: kolom "Next Step / Ask for Help" terisi pada item yang belum Done, atau update menyebut "ask for help"
      const afh = status !== 'Done' && (nx !== '' || /ask for help/i.test(up));
      const pic = String(r.pic || '').trim();
      return { ...r, pic: !pic || /^(tbc|na|-)$/i.test(pic) ? 'Belum ditentukan' : pic, due, status, flag, sisa: due == null || status === 'Done' ? null : due - rd, next: nx, update: up, afh };
    });
    const issues = items.filter((i) => i.flag === 'Late' || i.flag === 'At Risk')
      .sort((a, b) => (a.flag === b.flag ? 0 : a.flag === 'Late' ? -1 : 1) || ((a.sisa ?? 9e9) - (b.sisa ?? 9e9)));
    const late = issues.filter((i) => i.flag === 'Late').length;
    const status = prog.dev < -0.05 ? 'danger' : (prog.dev < 0 || late > 0) ? 'warning' : 'success';
    // highlight kritikal: teks dari data.json, status & PIC diambil langsung dari tracker
    const byNo = new Map(items.map((i) => [String(i.no), i]));
    const highlights = (raw.highlights || []).map((h) => ({ ...h, ref: (h.refs || []).map((n) => byNo.get(String(n))).filter(Boolean) }))
      .filter((h) => !h.ref.length || h.ref.some((r) => r.status !== 'Done'));
    return { raw, rd, weeks, prog, ms, areas, items, issues, late, status, highlights };
  }

  // ---------- render ----------
  const icons = () => { if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 1.75 } }); };

  function render() {
    const M = DATA, rd = M.rd, p = M.prog;
    $('subtitle').textContent = `Laporan per ${fmt(rd)} · progres fisik s.d. minggu ${fmt(p.week)}`;
    const st = $('projStatus');
    st.className = 'status-badge ' + M.status;
    st.textContent = { danger: 'Perlu perhatian', warning: 'Waspada', success: 'On Track' }[M.status];
    const next = M.ms.find((m) => m.d >= rd);
    $('heroNote').textContent = next ? `Milestone berikut: ${next.name} · ${fmt(next.d)}` : '';
    document.title = `TM2500 GM View — ${fmt(rd)}`;

    const find = (re) => M.ms.find((m) => re.test(m.name));
    const ct = find(/contract/i), mob = find(/mobili/i), su = find(/start/i);
    const stat = (lbl, icon, val, sub, cls = '', vcls = '') =>
      `<div class="card stat ${cls}"><div class="lbl"><i data-lucide="${icon}"></i>${lbl}</div><div class="val ${vcls}">${val}</div><div class="sub">${sub}</div></div>`;
    const msCard = (m, lbl, icon) => m ? stat(lbl, icon, fmt(m.d), m.d >= rd ? `${m.d - rd} hari lagi` : 'Tercapai', '', 'sm') : '';
    $('kpis').innerHTML =
      stat('Progres fisik', 'gauge', pct(p.act), `Rencana ${pct(p.plan)}`, 'brand') +
      stat('Deviasi', p.dev >= 0 ? 'trending-up' : 'trending-down', `<span class="${p.dev >= 0 ? 'c-success' : 'c-danger'}">${sgn(p.dev)}</span>`,
        p.dev >= 0 ? 'Ahead of schedule' : 'Behind schedule') +
      msCard(ct, 'Contract signing', 'file-signature') +
      msCard(mob, 'Mobilisasi unit ke Duri', 'truck') +
      msCard(su, 'Start-up', 'zap') +
      stat('Isu terbuka', 'alert-triangle', `<span class="${M.late ? 'c-danger' : 'c-warning'}">${M.issues.length}</span>`,
        `${M.late} Late · ${M.issues.length - M.late} At Risk`);

    renderHighlights();
    renderCurve();

    $('areaNote').textContent = `s.d. minggu ${fmt(p.week, false)}`;
    $('areas').innerHTML = M.areas.map((a) => `
      <div class="area">
        <div class="area-hd"><span class="an">${esc(a.name)}</span><span class="av">${pct(a.act, 0)}</span></div>
        <div class="track"><div class="fill" style="width:${(a.act * 100).toFixed(1)}%"></div><div class="tick" style="left:${(a.plan * 100).toFixed(1)}%" title="Rencana ${pct(a.plan, 0)}"></div></div>
        <div class="area-ft">Rencana ${pct(a.plan, 0)} · bobot ${pct(a.weight, 0)}</div>
      </div>`).join('');

    $('milestones').innerHTML = M.ms.map((m) => {
      const done = m.d < rd, nxt = next && m.id === next.id;
      return `<li class="${done ? 'done' : ''}${nxt ? ' next' : ''}"><span class="mk"></span><div class="mt"><span class="mn">${esc(m.name)}</span><span class="md">${fmt(m.d)}</span></div><span class="mc">${done ? 'Tercapai' : (m.d - rd) + ' hari'}</span></li>`;
    }).join('');

    renderTable();

    const afh = M.items.filter((i) => i.afh);
    $('afhCount').textContent = afh.length ? `${afh.length} item` : '';
    $('afh').innerHTML = afh.length ? afh.map((i) => {
        // PIC khusus Ask for Help boleh ditulis di akhir Next Step: "… – PIC: Nama"
        const m = i.next.match(/\s*[–—-]\s*PIC\s*:\s*(.+)$/i);
        const txt = (m ? i.next.slice(0, m.index) : i.next).replace(/^AFH\s*:\s*/i, '').trim() || i.item;
        return `<li><span class="n"><i data-lucide="hand-helping"></i></span><span class="t">${esc(txt)}</span><span class="m">${esc(i.item)} · PIC ${esc(m ? m[1].trim() : i.pic)}</span></li>`;
      }).join('')
      : '<li><span class="empty">Tidak ada Ask for Help saat ini.</span></li>';

    $('footer').textContent = `Pertamina Hulu Rokan · Relokasi TM2500 2×25 MW · data per ${fmt(rd)}`;
    icons();
  }

  function renderHighlights() {
    const H = DATA.highlights, box = $('hl');
    box.hidden = !H.length;
    if (!H.length) return;
    $('hlCount').textContent = `${H.length} item`;
    $('hlList').innerHTML = H.map((h) => {
      const crit = /kritikal/i.test(h.level || '');
      // status terburuk di antara item terkait (Late > At Risk > lainnya)
      const rank = (x) => x.flag === 'Late' ? 0 : x.flag === 'At Risk' ? 1 : 2;
      const r = [...h.ref].sort((x, y) => rank(x) - rank(y))[0];
      const pill = r && (r.flag === 'Late' || r.flag === 'At Risk') ? `<span class="pill ${r.flag === 'Late' ? 'late' : 'risk'}">${r.flag}</span>` : '';
      return `<li class="${crit ? 'crit' : 'warn'}">
        <span class="hl-ic"><i data-lucide="${esc(h.icon || 'alert-octagon')}"></i></span>
        <span class="hl-tx"><span class="hl-t">${esc(h.title)}</span><span class="hl-s">${esc(h.target || '')}</span></span>
        ${pill}
      </li>`;
    }).join('');
  }

  // tabel kegiatan: seluruhnya dari tracker (termasuk yang sudah Done)
  const ORD = { 'In Progress': 0, 'Open': 1, 'Done': 2 };
  const stCls = (s) => s === 'Done' ? 'ok' : s === 'In Progress' ? 'run' : 'plan';
  function itemRow(i) {
    const fin = toDay(i.tglSelesai);
    const tgt = i.status === 'Done' ? (fin != null ? `Selesai ${ddmm(fin)}` : 'Selesai')
      : i.sisa == null ? '—' : i.sisa < 0 ? `<span class="neg">Lewat ${-i.sisa} hari</span>` : ddmm(i.due);
    const fl = i.flag === 'Late' || i.flag === 'At Risk' ? `<span class="pill ${i.flag === 'Late' ? 'late' : 'risk'}">${i.flag}</span>` : '';
    return `<tr class="${i.status === 'Done' ? 'is-done' : ''}"><td class="it">${esc(i.item)}</td><td class="ar">${esc(i.grup || '')}</td><td class="pic">${esc(i.pic)}</td>
      <td class="r tg">${tgt}</td><td class="st"><span class="pill ${stCls(i.status)}">${esc(i.status)}</span>${fl}</td><td class="ns">${esc(i.update || '—')}</td></tr>`;
  }
  const HEAD = '<thead><tr><th>Kegiatan</th><th>Area</th><th>PIC</th><th class="r">Target</th><th>Status</th><th>Update lapangan</th></tr></thead><tbody>';
  const sortItems = (arr) => [...arr].sort((a, b) => (ORD[a.status] ?? 1) - (ORD[b.status] ?? 1)
    || (a.status === 'Done' ? (toDay(b.tglSelesai) ?? 0) - (toDay(a.tglSelesai) ?? 0) : (a.due ?? 9e9) - (b.due ?? 9e9)));
  let flt = 'Semua';

  function renderTable() {
    const M = DATA, fbox = $('tblFilter');
    if (tab === 'act') {
      const cnt = (s) => M.items.filter((i) => i.status === s).length;
      const opts = [['Semua', M.items.length], ['In Progress', cnt('In Progress')], ['Open', cnt('Open')], ['Done', cnt('Done')]];
      fbox.hidden = false;
      fbox.innerHTML = opts.map(([k, n]) => `<button class="chip${flt === k ? ' on' : ''}" data-f="${k}">${k}<b>${n}</b></button>`).join('');
      fbox.querySelectorAll('.chip').forEach((c) => c.onclick = () => { flt = c.dataset.f; renderTable(); });
      const rows = sortItems(flt === 'Semua' ? M.items : M.items.filter((i) => i.status === flt));
      $('tabNote').textContent = `${M.items.length} kegiatan · ${cnt('Done')} Done`;
      $('tbl').innerHTML = HEAD + (rows.length ? rows.map(itemRow).join('') : '<tr><td colspan="6" class="ns">Tidak ada kegiatan.</td></tr>') + '</tbody>';
    } else {
      fbox.hidden = true;
      const done = sortItems(M.items.filter((i) => i.status === 'Done'));
      $('tabNote').textContent = `${M.issues.length} isu terbuka · ${M.late} Late · ${done.length} Done`;
      $('tbl').innerHTML = HEAD + (M.issues.length ? M.issues.map(itemRow).join('') : '<tr><td colspan="6" class="ns">Tidak ada isu terbuka.</td></tr>')
        + (done.length ? `<tr class="sep"><td colspan="6">Sudah selesai (${done.length})</td></tr>` + done.map(itemRow).join('') : '') + '</tbody>';
    }
  }

  function renderCurve() {
    const M = DATA, wk = M.weeks;
    const W = 620, H = 290, L = 42, R = 14, T = 44, B = 30;
    const G = { plan: '#005da8', act: '#7e8a1f', axis: '#75757a', grid: '#ededee', ms: '#c4c4c6', ink: '#575759' };
    const x0 = wk[0].w, x1 = Math.max(wk[wk.length - 1].w, ...M.ms.map((m) => m.d));
    const X = (d) => L + (d - x0) / (x1 - x0) * (W - L - R), Y = (v) => T + (1 - v) * (H - T - B);
    const line = (key) => wk.filter((w) => w[key] != null).map((w) => `${X(w.w).toFixed(1)},${Y(w[key]).toFixed(1)}`).join(' ');
    let g = '';
    [0, .25, .5, .75, 1].forEach((v) => g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="${G.grid}"/><text x="${L - 6}" y="${Y(v) + 3.5}" text-anchor="end" class="ax">${v * 100}%</text>`);
    const a = dDate(x0);
    for (let y = a.getUTCFullYear(), m = a.getUTCMonth() + 1; ; m++) {
      if (m > 11) { m = 0; y++; }
      const d = Math.floor(Date.UTC(y, m, 1) / DAY); if (d > x1) break;
      g += `<text x="${X(d).toFixed(1)}" y="${H - 9}" text-anchor="middle" class="ax">${BL[m]} ${String(y).slice(2)}</text>`;
    }
    M.ms.forEach((m, i) => {
      const x = X(m.d).toFixed(1);
      g += `<line x1="${x}" x2="${x}" y1="${T - 4}" y2="${H - B}" stroke="${G.ms}" stroke-dasharray="2,3"/>
        <g transform="translate(${x},${T - 8})"><rect x="-4" y="-4" width="8" height="8" transform="rotate(45)" fill="${G.ink}"/></g>
        <text x="${x}" y="${i % 2 ? T - 17 : T - 29}" text-anchor="${i === M.ms.length - 1 ? 'end' : 'middle'}" class="axs">${esc(m.short || '')}</text>`;
    });
    const p = M.prog, sx = X(p.week);
    const pt = (v, col, dx, dy, anchor = 'start') => `<circle cx="${sx}" cy="${Y(v)}" r="4" fill="${col}" stroke="#fff" stroke-width="1.5"/><text x="${sx + dx}" y="${Y(v) + dy}" text-anchor="${anchor}" class="lblv" fill="${col}">${pct(v)}</text>`;
    $('curve').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="S-Curve progres fisik rencana dan aktual">${g}
      <polyline points="${line('plan')}" fill="none" stroke="${G.plan}" stroke-width="2.4"/>
      <polyline points="${line('act')}" fill="none" stroke="${G.act}" stroke-width="3"/>
      ${pt(p.act, G.act, -8, -9, 'end')}${pt(p.plan, G.plan, 8, 14)}</svg>`;
  }

  // ---------- pembaca file (mode admin) ----------
  const rowsOf = (ws) => XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

  function parseTracker(buf) {
    const wb = XLSX.read(buf, { type: 'array', cellDates: false });
    const ws = wb.Sheets['Tracker TM2500'] || wb.Sheets[wb.SheetNames[0]];
    const rows = rowsOf(ws);
    const hi = rows.findIndex((r) => r && String(r[0] ?? '').trim() === 'No');
    if (hi < 0) throw new Error('Header tracker tidak ditemukan.');
    const H = rows[hi].map((h) => String(h ?? '').trim());
    const idx = (n, lastOne) => lastOne ? H.lastIndexOf(n) : H.indexOf(n);
    ['Uraian (Grup / Sub-grup / Item)', 'PIC', 'Status', 'Due Awal', 'Lvl'].forEach((n) => { if (idx(n) < 0) throw new Error(`Kolom "${n}" tidak ditemukan.`); });
    const sdRow = rows.find((r) => r && String(r[1] ?? '').trim() === 'Tanggal Status');
    const g = (r, n, l) => { const i = idx(n, l); return i < 0 ? null : r[i]; };
    const ds = (v) => iso(toDay(v));
    const items = []; let g1 = null;
    rows.slice(hi + 1).forEach((r) => {
      if (!r || r[0] == null) return;
      const lv = parseInt(g(r, 'Lvl'), 10); if (!lv) return;
      const no = String(r[0]).trim(), nm = g(r, 'Uraian (Grup / Sub-grup / Item)');
      if (lv === 1) { g1 = [no, nm]; return; }
      if (lv !== 3) return;
      items.push({ no, item: nm, grup: g1 ? g1[1] : '', pic: g(r, 'PIC'), status: g(r, 'Status') || 'Open', risk: g(r, 'Risiko Manual'),
        dueAwal: ds(g(r, 'Due Awal')), dueRevisi: ds(g(r, 'Due Revisi')), tglSelesai: ds(g(r, 'Tgl Selesai')),
        update: g(r, 'Update Terakhir'), next: g(r, 'Next Step / Ask for Help') });
    });
    if (!items.length) throw new Error('Tidak ada item di tracker.');
    return { reportDate: sdRow ? ds(sdRow[2]) : null, items };
  }

  function parseSCurve(buf) {
    const wb = XLSX.read(buf, { type: 'array', cellDates: false });
    // sheet S-Curve: yang memuat baris "Cum Plan" & "Cum Actual" (ambil yang terakhir di urutan workbook)
    const hasCum = (n) => rowsOf(wb.Sheets[n]).some((r) => r && r[1] === 'Cum Actual');
    const rev = [...wb.SheetNames].reverse();
    const scName = rev.find((n) => /curve/i.test(n) && hasCum(n)) || rev.find(hasCum);
    if (!scName) throw new Error('Sheet S-Curve (baris Cum Plan/Cum Actual) tidak ditemukan.');
    const R = rowsOf(wb.Sheets[scName]);
    const rowBy = (lbl) => R.find((r) => r && r[1] === lbl);
    const cPlan = rowBy('Cum Plan'), cAct = rowBy('Cum Actual');
    const hdrIdx = R.findIndex((r) => r && r[0] === 'Role');
    const hdr = R[hdrIdx];
    const actMark = R.findIndex((r) => r && r[0] === 'Actual');
    const hdr2 = R.findIndex((r, i) => i > actMark && r && r[0] === 'Role');
    const wcols = [];
    hdr.forEach((v, c) => { if (typeof v === 'number' && v > 40000 && typeof cPlan[c] === 'number') wcols.push(c); });
    const weeks = wcols.map((c) => ({ w: iso(fromSerial(hdr[c])), plan: cPlan[c], act: typeof cAct[c] === 'number' ? cAct[c] : null }));
    const lastAct = weeks.filter((w) => w.act != null).pop();
    const lastCol = wcols[weeks.indexOf(lastAct)];
    // aktivitas & area kerja
    const ind = (s) => String(s).length - String(s).trimStart().length;
    const heads = [];
    for (let i = hdrIdx + 1; i < actMark; i++) { const r = R[i]; if (r && r[0] && String(r[0]).trim() && !r[1]) heads.push({ i, ind: ind(r[0]), name: String(r[0]).trim() }); }
    const tops = heads.filter((h) => h.ind === Math.min(...heads.map((x) => x.ind)) && !/^RELOKASI/i.test(h.name));
    const topLv = tops.length ? tops[0].ind : 2;
    const areaOf = (i) => {
      const top = [...heads].reverse().find((h) => h.i < i && h.ind === topLv);
      if (!top) return 'Lainnya';
      const subs = heads.filter((h) => h.ind === topLv + 2 && h.i > top.i && (heads.find((x) => x.i > top.i && x.ind === topLv)?.i ?? 1e9) > h.i);
      if (subs.length >= 2) { const s = [...subs].reverse().find((h) => h.i < i); if (s) return s.name; }
      return top.name;
    };
    const off = hdr2 - hdrIdx;
    const activities = [];
    for (let i = hdrIdx + 1; i < actMark; i++) {
      const r = R[i]; if (!r || !r[1]) continue;
      const wgt = typeof r[4] === 'number' ? r[4] : 0;
      let planFrac = 0; wcols.forEach((c) => { if (c <= lastCol && typeof r[c] === 'number') planFrac += r[c]; });
      let ra = R[i + off]; if (!ra || ra[1] !== r[1]) ra = R.find((x, j) => j > actMark && x && x[1] === r[1]);
      const done = ra && typeof ra[5] === 'number' ? ra[5] : 0;
      activities.push({ name: String(r[1]).trim(), area: areaOf(i), start: iso(toDay(r[2])), finish: iso(toDay(r[3])), weight: wgt, plan: Math.min(planFrac, 1), pct: done });
    }
    const amap = new Map();
    activities.forEach((a) => { if (!amap.has(a.area)) amap.set(a.area, { w: 0, p: 0, a: 0 }); const x = amap.get(a.area); x.w += a.weight; x.p += a.weight * a.plan; x.a += a.weight * a.pct; });
    const label = (n) => /phr scope/i.test(n) ? 'Konstruksi scope PHR' : /testing/i.test(n) ? 'Testing & commissioning' : nice(n);
    const areas = [...amap.entries()].filter(([, x]) => x.w > 0).map(([n, x]) => ({ name: label(n), weight: x.w, plan: x.p / x.w, act: x.a / x.w }));
    activities.forEach((a) => { a.area = label(a.area); });
    // milestone: sheet terakhir yang memuat baris milestone A1xxx
    let ms = [];
    [...wb.SheetNames].reverse().some((n) => {
      const rr = rowsOf(wb.Sheets[n]).filter((r) => r && /^A\d{4}$/.test(String(r[0] ?? '').trim()) && r[1] && Number(r[2]) === 0 && toDay(r[4]) != null);
      if (rr.length >= 3) { ms = rr.map((r) => ({ id: String(r[0]).trim(), name: String(r[1]).trim(), date: iso(toDay(r[4])) })); return true; }
      return false;
    });
    const SHORT = { A1000: 'Kontrak', A1430: 'Mobilisasi', A1435: 'Konstruksi', A1440: 'Start-up', A1460: 'RR' };
    const NAME = { A1000: 'Contract signing', A1430: 'Mobilisasi unit ke Duri', A1435: 'Konstruksi PHR selesai', A1440: 'Start-up unit', A1460: 'Reliability run selesai' };
    ms = ms.map((m) => ({ ...m, name: NAME[m.id] || m.name, short: SHORT[m.id] || '' }));
    return { weeks, areas, activities, milestones: ms };
  }

  const toast = (m) => { const t = $('toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3400); };
  const stamp = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  async function load(input, fn) {
    const f = input.files[0]; if (!f) return;
    try {
      if (typeof XLSX === 'undefined') throw new Error('Pembaca Excel belum siap.');
      const res = fn(new Uint8Array(await f.arrayBuffer()));
      const raw = RAW;
      if (res.items) { raw.items = res.items; if (res.reportDate) raw.reportDate = res.reportDate; }
      else raw.scurve = res;
      raw.generatedAt = stamp();
      if (raw.scurve && raw.items && raw.items.length) { DATA = model(raw); render(); }
      toast(res.items ? `Tracker dimuat: ${res.items.length} kegiatan.` : `S-Curve dimuat: ${res.weeks.length} minggu, ${res.milestones.length} milestone.`);
    } catch (e) { console.error(e); toast('Gagal memuat file: ' + e.message); }
    input.value = '';
  }

  // mode admin: buka dengan #admin di akhir URL
  if (location.hash === '#admin') $('admin').hidden = false;
  $('fileTr').addEventListener('change', (e) => load(e.target, parseTracker));
  $('fileSc').addEventListener('change', (e) => load(e.target, parseSCurve));
  $('dl').addEventListener('click', () => {
    if (!DATA) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(DATA.raw, null, 1)], { type: 'application/json' }));
    a.download = 'data.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  document.querySelectorAll('.tab').forEach((b) => b.onclick = () => {
    tab = b.dataset.tab; document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('on', x === b)); renderTable();
  });

  fetch('data.json', { cache: 'no-store' })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((raw) => { RAW = raw; if (!raw.scurve) throw new Error('no scurve'); DATA = model(raw); render(); })
    .catch(() => { $('subtitle').textContent = 'Data belum tersedia.'; });
})();

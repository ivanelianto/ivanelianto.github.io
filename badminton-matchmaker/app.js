import { PLAYERS_SEED } from './playersSeed.js';
import { COURT_FEE, SHUTTLE_FEE_PER, buildCollectPaymentMessage } from './config.js';

const STORAGE_FILES = {
  players: 'players.json',
  schedules: 'schedules.json',
  matches: 'matches.json',
  payments: 'payments.json',
};

const CLASS_ORDER = ['S', 'A', 'B', 'C'];
const CLASS_RANK = Object.fromEntries(CLASS_ORDER.map((c, i) => [c, i]));

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function uuid() {
  // RFC4122-ish (sufficient for local JSON app)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] % 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function nowTimestamp() {
  return Date.now();
}

function formatDateNice(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatDateLongID(iso) {
  if (!iso) return '';
  // iso: yyyy-mm-dd
  const [y, m, d] = iso.split('-').map((x) => Number(x));
  if (!y || !m || !d) return iso;

  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)); // noon to avoid TZ off-by-one
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dt);
}

function parseQueryJSON(str, fallback) {
  try {
    const v = JSON.parse(str);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

// ---- File-backed JSON (local) ----
// This app uses browser localStorage as a safe fallback. To truly use local JSON files,
// a companion host / extension is needed; however the UI and data layer is modular.
const storage = {
  async loadAll() {
    // For a pure static demo, use localStorage keys.
    // Each record is stored under key:
    //   bbmm:<filename>
    const out = {};
    for (const [k, filename] of Object.entries(STORAGE_FILES)) {
      const raw = localStorage.getItem(`bbmm:${filename}`);
      const arr = raw ? parseQueryJSON(raw, []) : [];
      out[k] = Array.isArray(arr) ? arr : [];
    }
    return out;
  },
  async saveAll({ players, schedules, matches, payments }) {
    localStorage.setItem(`bbmm:${STORAGE_FILES.players}`, JSON.stringify(players ?? [], null, 2));
    localStorage.setItem(`bbmm:${STORAGE_FILES.schedules}`, JSON.stringify(schedules ?? [], null, 2));
    localStorage.setItem(`bbmm:${STORAGE_FILES.matches}`, JSON.stringify(matches ?? [], null, 2));
    localStorage.setItem(`bbmm:${STORAGE_FILES.payments}`, JSON.stringify(payments ?? [], null, 2));
  },
  async resetAll() {
    for (const filename of Object.values(STORAGE_FILES)) {
      localStorage.removeItem(`bbmm:${filename}`);
    }
  }
};

// ---- Business logic ----
function normalizeName(n) {
  return String(n ?? '').trim();
}

function getPlayerComfortRank(p) {
  return CLASS_RANK[p.class] ?? 10;
}

function balanceScoreForTeams({ teamA, teamB }) {
  // Lower is better. Score based on skill rank spread and team differences.
  const ranksA = teamA.map(getPlayerComfortRank);
  const ranksB = teamB.map(getPlayerComfortRank);

  // spread inside each team
  const spreadA = Math.max(...ranksA) - Math.min(...ranksA);
  const spreadB = Math.max(...ranksB) - Math.min(...ranksB);

  // difference between teams
  const avgA = ranksA.reduce((a, b) => a + b, 0) / ranksA.length;
  const avgB = ranksB.reduce((a, b) => a + b, 0) / ranksB.length;
  const diffTeams = Math.abs(avgA - avgB);

  // total
  return spreadA * 2 + spreadB * 2 + diffTeams;
}

function computeRemainingCandidates({ schedulePlayers, allPlayers, playedCountsByName }) {
  // Prioritize players with fewer matches in current schedule.
  // schedulePlayers: array of player IDs participating in this schedule.
  const schedulePlayerSet = new Set(schedulePlayers);
  const candidates = allPlayers.filter((p) => schedulePlayerSet.has(p.id));

  // Sort by played count asc, then comfort rank.
  candidates.sort((p1, p2) => {
    const c1 = playedCountsByName[p1.name] ?? 0;
    const c2 = playedCountsByName[p2.name] ?? 0;
    if (c1 !== c2) return c1 - c2;
    return getPlayerComfortRank(p1) - getPlayerComfortRank(p2);
  });

  return candidates;
}

function suggestMatchesForSchedule({ schedule, allPlayers, matches, playerNameBlacklist = new Set() }) {
  // 1) candidates = players on active schedule
  // 2) sort by total match played asc, then arrival time asc
  const scheduleMatches = matches.filter((m) => m.scheduleId === schedule.id);
  const playedCountsByName = {};
  for (const m of scheduleMatches) {
    for (const pn of m.playerNames) {
      playedCountsByName[pn] = (playedCountsByName[pn] ?? 0) + 1;
    }
  }

  const joinByPlayerId = new Map((schedule.joins ?? []).map((j) => [j.playerId, Number(j.joinTime)]));
  const schedulePlayerSet = new Set(schedule.playerIds ?? []);

  const candidates = allPlayers
    .filter((p) => schedulePlayerSet.has(p.id) && !playerNameBlacklist.has(p.name))
    .map((p) => ({
      ...p,
      played: playedCountsByName[p.name] ?? 0,
      arriveTime: joinByPlayerId.get(p.id) ?? Number.POSITIVE_INFINITY,
    }))
    .sort((a, b) => (a.played - b.played) || (a.arriveTime - b.arriveTime));

  const classPoints = { S: 4, A: 3, B: 2, C: 1 };
  const classPointOf = (cls) => classPoints[cls] ?? 0;

  // Generate suggestions: choose 4 players, then score the best 2v2 assignment
  const suggestions = [];
  const usedCombos = new Set();

  const scoreTeamsByClass = ({ teamAPlayers, teamBPlayers }) => {
    const a = teamAPlayers.reduce((acc, p) => acc + classPointOf(p.class), 0);
    const b = teamBPlayers.reduce((acc, p) => acc + classPointOf(p.class), 0);
    // smaller diff is better; ideal diff==0
    return Math.abs(a - b);
  };

  const tryAddCombo = (p1, p2, p3, p4) => {
    const ids = [p1.id, p2.id, p3.id, p4.id].slice().sort().join('|');
    if (usedCombos.has(ids)) return;
    usedCombos.add(ids);

    const fours = [p1, p2, p3, p4];

    // Evaluate all partitions into 2+2 (teamA is unordered pair)
    // Keep best split (min class diff), then use played-sum as tie breaker.
    const partitions = [
      [0, 1, 2, 3],
      [0, 2, 1, 3],
      [0, 3, 1, 2],
    ];

    let best = null;
    for (const [ai1, ai2, bi1, bi2] of partitions) {
      const teamA = [fours[ai1], fours[ai2]];
      const teamB = [fours[bi1], fours[bi2]];

      const classDiff = scoreTeamsByClass({ teamAPlayers: teamA, teamBPlayers: teamB });
      const playedSum = teamA.concat(teamB).reduce((acc, p) => acc + (p.played ?? 0), 0);

      // Primary: class fairness (diff), Secondary: lower total played
      const overall = classDiff * 1000 + playedSum;

      if (!best || overall < best.overallBalanceScore) {
        best = {
          teamA: teamA.map((p) => p.name),
          teamB: teamB.map((p) => p.name),
          overallBalanceScore: overall,
          classDiff,
          playedSum,
        };
      }
    }

    const shuttlecockUsage = { shuttles: 0 };
    suggestions.push({
      teamA: best.teamA,
      teamB: best.teamB,
      overallBalanceScore: best.overallBalanceScore,
      _meta: { pids: ids, classDiff: best.classDiff },
      shuttlecockUsage,
    });
  };

  // Deterministic sampling: top N combos from sorted candidates
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      for (let k = j + 1; k < candidates.length; k++) {
        for (let l = k + 1; l < candidates.length; l++) {
          if (suggestions.length >= 80) break;
          tryAddCombo(candidates[i], candidates[j], candidates[k], candidates[l]);
        }
      }
    }
  }

  suggestions.sort((a, b) => a.overallBalanceScore - b.overallBalanceScore);
  const top = suggestions.slice(0, 3).map((s, idx) => ({
    suggestionNo: idx + 1,
    teamA: s.teamA,
    teamB: s.teamB,
    overallBalanceScore: s.overallBalanceScore,
    shuttlecockUsage: s.shuttlecockUsage,
  }));

  return top;
}

function inferGreetingByTime(d = new Date()) {
  const h = d.getHours();
  if (h >= 4 && h < 10) return 'Pagi';
  if (h >= 10 && h < 15) return 'Siang';
  if (h >= 15 && h < 19) return 'Sore';
  return 'Malam';
}

function computeTotalPayment({ shuttlecockUsage, playerName }) {
  const shuttles = Number(shuttlecockUsage?.shuttles ?? shuttlecockUsage ?? 0);
  const courtFee = COURT_FEE;

  const free = /^(mei|asrofi)$/i.test(playerName.trim());
  const specialShuttleOnly = /^(kelvinsen|miftah|ivan)$/i.test(playerName.trim());

  if (free) return 0;

  const shuttleFee = shuttles * SHUTTLE_FEE_PER;
  const total = shuttleFee + (specialShuttleOnly ? 0 : courtFee);
  return total;
}

function ensureSeededDemoData() {
  // Only for first run: if no players exist, create a couple.
  const has = localStorage.getItem(`bbmm:${STORAGE_FILES.players}`);
  if (has) return;
  const seedPlayers = PLAYERS_SEED.map((p) => ({
    id: uuid(),
    name: p.name,
    class: p.class,
    note: p.note ?? '',
  }));
  localStorage.setItem(`bbmm:${STORAGE_FILES.players}`, JSON.stringify(seedPlayers, null, 2));
  localStorage.setItem(`bbmm:${STORAGE_FILES.schedules}`, JSON.stringify([], null, 2));
  localStorage.setItem(`bbmm:${STORAGE_FILES.matches}`, JSON.stringify([], null, 2));
  localStorage.setItem(`bbmm:${STORAGE_FILES.payments}`, JSON.stringify([], null, 2));
}

// ---- UI helpers ----
function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2600);
}

function openModal(html) {
  const modal = $('#modal');
  modal.innerHTML = `<form method="dialog"><div class="modal-inner">${html}</div></form>`;
  modal.showModal();

  // Close when clicking outside the modal box (backdrop)
  modal.addEventListener(
    'click',
    (e) => {
      const modalInner = e.target?.closest?.('.modal-inner');
      if (!modalInner) closeModal();
    },
    { once: true },
  );
}

function closeModal() {
  const modal = $('#modal');
  modal.close();
}

function renderOptionsFromClasses(selectEl, value) {
  selectEl.innerHTML = CLASS_ORDER.map((c) => `
    <option value="${c}" ${c === value ? 'selected' : ''}>${c}</option>
  `).join('');
}

function capitalizeEachWord(s) {
  const str = String(s ?? '').trim();
  if (!str) return '';
  return str
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      return part
        .split('-')
        .map((chunk) => (chunk ? chunk[0].toUpperCase() + chunk.slice(1).toLowerCase() : chunk))
        .join('-');
    })
    .join('');
}

function formatClassBadge(cls) {
  return `<span class="badge">${cls}</span>`;
}

function renderPlayerNameWithClass(p) {
  if (!p) return '';
  return `${formatClassBadge(p.class)} ${capitalizeEachWord(p.name)}`;
}


// ---- App state ----
let appState = {
  data: { players: [], schedules: [], matches: [], payments: [] },
  activeScheduleId: null,
};

let scheduleDelegatedBound = false;
let manageMatchDelegatedBound = false;


function getActiveSchedule() {
  if (!appState.activeScheduleId) return null;
  return appState.data.schedules.find((s) => s.id === appState.activeScheduleId) ?? null;
}

function formatPlayersInline(idsOrNames) {
  return (idsOrNames || []).join(', ');
}

function renderDashboard() {
  const view = $('#view-dashboard');
  const { players, schedules, matches, payments } = appState.data;

  const activeSchedule = getActiveSchedule();
  const activeISO = activeSchedule?.dateISO ?? todayISO();

  const scheduleMatches = matches.filter((m) => m.scheduleId === activeSchedule?.id);


  const schedulePlayersSet = new Set(activeSchedule?.playerIds ?? []);

  const activePlayersToday = players.filter((p) => schedulePlayersSet.has(p.id)).length;
  const totalMatchesToday = scheduleMatches.length;

  const totalShuttles = scheduleMatches.reduce((acc, m) => acc + Number(m.shuttlecockUsage?.shuttles ?? 0), 0);

  const outstandingPayments = payments.filter((p) => !p.paymentMethod);

  view.innerHTML = `
    <div class="grid grid-3">
      <div class="card"><h2>Total Players</h2><div class="pill">${players.length}</div></div>
      <div class="card"><h2>Active Players Today</h2><div class="pill">${activePlayersToday}</div></div>
      <div class="card"><h2>Total Matches Today</h2><div class="pill">${totalMatchesToday}</div></div>
      <div class="card"><h2>Total Shuttlecock Usage</h2><div class="pill">${totalShuttles}</div></div>
      <div class="card"><h2>Total Outstanding Payments</h2><div class="pill">${outstandingPayments.length}</div></div>
      <div class="card"><h2>Active Schedule</h2><div class="pill">${activeISO ? formatDateNice(activeISO) : '-'}</div></div>
    </div>
    <hr class="sep" />
    <div class="row">
      <button class="btn primary" data-go="schedule">Start / Select Schedule</button>
      <button class="btn" data-go="players">Manage   Players</button>
      <button class="btn" data-go="payments">Manage Payments</button>
    </div>
  `;

  $$('button[data-go]', view).forEach((b) => {
    b.addEventListener('click', () => switchView(b.getAttribute('data-go')));
  });
}

function renderPlayers() {
  const view = $('#view-players');
  const { players } = appState.data;

  const rows = players
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (p) => `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td><span class="badge">${p.class}</span></td>
        <td style="color:var(--muted)">${p.note ?? ''}</td>
        <td>
          <div class="row" style="justify-content:flex-end;">
            <button class="btn" data-edit="${p.id}">Edit</button>
            <button class="btn danger" data-del="${p.id}">Delete</button>
          </div>
        </td>
      </tr>
    `
    )
    .join('');

  view.innerHTML = `
    <div class="grid" style="grid-template-columns:1fr;">
      <div class="card">
        <h2>Add / Update Player</h2>
        <div class="grid" style="gap:10px;">
          <input id="p-name" placeholder="Name" />
          <div>
            <label>Class</label>
            <select id="p-class"></select>
          </div>
          <input id="p-note" placeholder="Note" />
          <div class="row">
            <button class="btn primary" id="p-save">Save</button>
            <button class="btn" id="p-reset">Reset</button>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>Players</h2>
        <div style="overflow:auto;">
          <table class="table">
            <thead>
              <tr><th style="width:30%">Name</th><th style="width:12%">Class</th><th>Note</th><th style="width:22%">Actions</th></tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="4" style="color:var(--muted)">No players yet.</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  renderOptionsFromClasses($('#p-class'));

  let editingId = null;

  const nameEl = $('#p-name');
  const classEl = $('#p-class');
  const noteEl = $('#p-note');

  const setForm = (p) => {
    nameEl.value = p?.name ?? '';
    classEl.value = p?.class ?? 'A';
    noteEl.value = p?.note ?? '';
    editingId = p?.id ?? null;
  };

  setForm(null);

  $('#p-reset').addEventListener('click', () => setForm(null));

  $('#p-save').addEventListener('click', async () => {
    const name = normalizeName(nameEl.value);
    const cls = classEl.value;
    const note = noteEl.value;
    if (!name) return toast('Player name required');
    if (!CLASS_ORDER.includes(cls)) return toast('Invalid class');

    const nowData = appState.data;
    if (editingId) {
      const idx = nowData.players.findIndex((x) => x.id === editingId);
      if (idx >= 0) {
        nowData.players[idx] = { ...nowData.players[idx], name, class: cls, note };
      }
    } else {
      const exists = nowData.players.find((p) => p.name.toLowerCase() === name.toLowerCase());
      if (exists) {
        // Update existing name collision instead of creating duplicate
        exists.class = cls;
        exists.note = note;
      } else {
        nowData.players.push({ id: uuid(), name, class: cls, note });
      }
    }

    await storage.saveAll(nowData);
    await reloadData();
    renderPlayers();
    toast('Saved');
  });

  view.addEventListener('click', async (e) => {
    const editId = e.target?.getAttribute?.('data-edit');
    const delId = e.target?.getAttribute?.('data-del');
    if (editId) {
      const p = appState.data.players.find((x) => x.id === editId);
      setForm(p);
    }
    if (delId) {
      if (!confirm('Delete this player?')) return;
      appState.data.players = appState.data.players.filter((x) => x.id !== delId);
      await storage.saveAll(appState.data);
      // Also remove from any schedules
      appState.data.schedules.forEach((s) => {
        s.playerIds = (s.playerIds ?? []).filter((pid) => pid !== delId);
      });
      // Remove matches with that player names
      const removedName = appState.data.players.find((x) => x.id === delId)?.name;
      // matches store names so we need removedName prior. Let's recompute from data before saving.
      // Keep simple: regenerate by matching player ids is not possible now.
      await storage.saveAll(appState.data);
      await reloadData();
      renderPlayers();
      toast('Deleted');
    }
  });
}

function renderStartSchedule() {
  const view = $('#view-schedule');
  const { players, schedules } = appState.data;

  const lastSchedule = schedules.slice().sort((a, b) => b.createdAt - a.createdAt)[0];

  const scheduleSelect = `
    <div class="row" style="justify-content:space-between; gap:10px;">
      <div style="flex:1;">
        <label>Active Schedule</label>
        <select id="active-schedule"></select>
      </div>
      <div style="align-self:flex-end;">
        <button class="btn danger" id="sched-close" title="Remove schedule from active">Close</button>
      </div>
    </div>
  `;

  const scheduleOptions = schedules
    .slice()
    .sort((a, b) => (a.dateISO ?? '').localeCompare(b.dateISO ?? ''))
    .map((s) => `<option value="${s.id}">${formatDateNice(s.dateISO)} · ${s.title ?? 'Schedule'}</option>`)
    .join('');

  view.innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <h2>Start / Select Schedule</h2>
        <div class="grid" style="gap:10px;">
          ${scheduleSelect}

          <div>
            <label>Schedule Date</label>
            <div class="row" style="gap:10px;">
              <div style="flex:1;">
                <input type="date" id="sched-date" value="${todayISO()}" style="width:100%;" />
              </div>
              <div style="align-self:flex-end;">
                <button class="btn primary" id="sched-create">Create</button>
              </div>
            </div>
          </div>

          <div style="color:var(--muted); font-size:13px;">
            Players added will be reused from <span style="font-weight:800;">players.json</span> if name matches.
          </div>
        </div>
      </div>

      <div class="card">
        <h2>Add Players to Schedule</h2>
        <div class="grid" style="gap:10px;">
          <input id="sp-name" placeholder="Player name" />
          <div>
            <label>Class (used if new player)</label>
            <select id="sp-class"></select>
          </div>
          <input id="sp-note" placeholder="Note (optional)" />
          <div class="row">
            <button class="btn good" id="sp-add">Add / Reuse Player</button>
          </div>
        </div>
      </div>
    </div>

    <hr class="sep" />

    <div class="card">
      <h2>Players in Active Schedule</h2>
      <div id="sched-player-list" style="display:grid; gap:10px;"></div>
    </div>
  `;

  renderOptionsFromClasses($('#sp-class'), 'C');

  const activeSel = $('#active-schedule');
  activeSel.innerHTML = schedules.map((s) => `<option value="${s.id}">${formatDateNice(s.dateISO)} · ${s.title ?? ''}</option>`).join('');

  if (lastSchedule) {
    appState.activeScheduleId = appState.activeScheduleId ?? lastSchedule.id;
    activeSel.value = appState.activeScheduleId;
  }

  $('#sched-date').value = todayISO();

  const renderSchedulePlayers = () => {
    const sch = getActiveSchedule();
    const list = $('#sched-player-list');

    if (!sch) {
      list.innerHTML = `<div style="color:var(--muted); font-size:13px;">No active schedule. Create one.</div>`;
      return;
    }

    const playerById = new Map(appState.data.players.map((p) => [p.id, p]));
    const joinMap = new Map((sch.joins ?? []).map((j) => [j.playerId, j.joinTime]));

    const rows = (sch.playerIds ?? []).map((pid) => {
      const p = playerById.get(pid);
      const joinTime = joinMap.get(pid);
      const arriveTime = joinTime ? new Date(joinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';

      return `
        <div class="card" style="background:rgba(255,255,255,.03); margin:0; border-radius:14px;">
          <div class="row" style="justify-content:space-between; align-items: center;">
            <div style="flex:1;">
              <div>${p?.class ? formatClassBadge(p.class) : ''} ${capitalizeEachWord(p?.name ?? '')} - arrive ${arriveTime}</div>
            </div>
            <div>
              <button class="btn danger" data-remove="${pid}">X</button>
            </div>
          </div>
        </div>
      `;
    });

    list.innerHTML =
      rows.join('') || `<div style="color:var(--muted); font-size:13px;">No players added yet.</div>`;
  };

  activeSel.addEventListener('change', async () => {
    appState.activeScheduleId = activeSel.value || null;
    renderSchedulePlayers();
  });

  $('#sched-close').addEventListener('click', async () => {
    const current = getActiveSchedule();
    if (!current?.id) {
      toast('No active schedule');
      return;
    }
    if (!confirm('Close this schedule? This will remove it and its matches/payments.')) return;

    // Remove schedule
    appState.data.schedules = appState.data.schedules.filter((s) => s.id !== current.id);

    // Remove matches & payments for that schedule
    appState.data.matches = appState.data.matches.filter((m) => m.scheduleId !== current.id);
    appState.data.payments = appState.data.payments.filter((p) => p.scheduleId !== current.id);

    appState.activeScheduleId = null;

    await storage.saveAll(appState.data);
    await reloadData();
    renderStartSchedule();
    toast('Schedule closed');
  });

  $('#sched-create').addEventListener('click', async () => {
    const dateISO = $('#sched-date').value || todayISO();
    const sch = {
      id: uuid(),
      dateISO,
      title: 'Badminton Session',
      createdAt: nowTimestamp(),
      playerIds: [],
      joins: [],
    };
    appState.data.schedules.push(sch);
    appState.activeScheduleId = sch.id;
    await storage.saveAll(appState.data);
    await reloadData();
    renderStartSchedule();
    toast('Schedule created');
  });

  $('#sp-add').addEventListener('click', async () => {
    const name = normalizeName($('#sp-name').value);
    const cls = $('#sp-class').value;
    const note = $('#sp-note').value;
    if (!name) return toast('Player name required');

    const sch = getActiveSchedule();
    if (!sch) return toast('Create/select schedule first');

    let existing = appState.data.players.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (!existing) {
      existing = { id: uuid(), name, class: cls, note };
      appState.data.players.push(existing);
    } else {
      // If player exists, use it. (Keep stored class/note.)
    }

    if (!(sch.playerIds ?? []).includes(existing.id)) {
      sch.playerIds = sch.playerIds ?? [];
      sch.joins = sch.joins ?? [];
      sch.playerIds.push(existing.id);
      sch.joins.push({ playerId: existing.id, joinTime: nowTimestamp() });
    }

    await storage.saveAll(appState.data);
    await reloadData();
    renderStartSchedule();
    toast('Player added');
  });

  // Bind remove handler only once to avoid duplicated confirmation dialogs
  if (!scheduleDelegatedBound) {
    scheduleDelegatedBound = true;
    view.addEventListener('click', async (e) => {
      const pid = e.target?.getAttribute?.('data-remove');
      if (!pid) return;
      const sch = getActiveSchedule();
      if (!sch) return;

      if (!confirm('Remove player from schedule?')) return;

      sch.playerIds = (sch.playerIds ?? []).filter((x) => x !== pid);
      sch.joins = (sch.joins ?? []).filter((j) => j.playerId !== pid);

      // Also cancel any matches containing this player's name
      const removed = appState.data.players.find((p) => p.id === pid);
      const removedName = removed?.name;

      appState.data.matches = appState.data.matches.filter((m) => {
        if (!removedName) return true;
        return !m.playerNames.includes(removedName);
      });

      await storage.saveAll(appState.data);
      await reloadData();
      renderStartSchedule();
      toast('Removed');
    });
  }

  renderSchedulePlayers();
}

function updatePaymentsTotalsForSchedule(scheduleId) {
  // Recalculate totalPayment for each payment record based on current matches.
  // Keep paymentMethod intact (do not remove payments).
  const schedule = appState.data.schedules.find((s) => s.id === scheduleId);
  if (!schedule) return;

  const schMatches = appState.data.matches.filter((m) => m.scheduleId === scheduleId);

  const shuttleByPlayer = {};
  for (const m of schMatches) {
    const sh = Number(m.shuttlecockUsage?.shuttles ?? 0);
    for (const pn of m.playerNames) {
      shuttleByPlayer[pn] = (shuttleByPlayer[pn] ?? 0) + sh;
    }
  }

  for (const p of appState.data.payments) {
    if (p.scheduleId !== scheduleId) continue;
    const shuttlecockUsage = { shuttles: shuttleByPlayer[p.playerName] ?? 0 };
    p.shuttlecockUsage = shuttlecockUsage;
    p.totalPayment = computeTotalPayment({ shuttlecockUsage, playerName: p.playerName });
    p.scheduleDateISO = schedule.dateISO;
  }
}

function renderManageMatch() {
  const view = $('#view-manage-match');
  if (!view) return;

  const sch = getActiveSchedule();

  const scheduleOptions = appState.data.schedules
    .slice()
    .sort((a, b) => (a.dateISO ?? '').localeCompare(b.dateISO ?? ''))
    .map(
      (s) =>
        `<option value="${s.id}" ${sch && sch.id === s.id ? 'selected' : ''}>${formatDateNice(s.dateISO)} · ${s.title ?? 'Schedule'}</option>`,
    )
    .join('');

  const historyTitle = 'Match History';

  view.innerHTML = `
    <div class="grid" style="grid-template-columns:1fr; gap:12px;">
      <div class="card" style="background:rgba(15,25,48,.65);">
        <h2>Schedule Selection</h2>
        <div class="grid" style="gap:10px;">
          <label>Active Schedule</label>
          <select id="mm-schedule">${scheduleOptions}</select>
        </div>
        <hr class="sep" />
        <div class="row" style="justify-content:flex-start;">
          <button class="btn primary" id="mm-add">+ Add Match</button>
          <button class="btn good" id="mm-suggest">⭐ See Suggestions</button>
        </div>
      </div>

      <div class="card" style="background:rgba(15,25,48,.65);">
        <h2>${historyTitle}</h2>
        <div id="mm-history"></div>
      </div>
    </div>
  `;

  const renderHistory = () => {
    const current = getActiveSchedule();
    const history = $('#mm-history');
    if (!current) {
      history.innerHTML = `<div style="color:var(--muted); font-size:13px;">No active schedule selected.</div>`;
      return;
    }

    const scheduleMatches = appState.data.matches
      .filter((m) => m.scheduleId === current.id)
      .slice()
      .sort((a, b) => a.matchNumber - b.matchNumber);

    history.innerHTML =
      scheduleMatches.length === 0
        ? `<div style="color:var(--muted); font-size:13px;">No matches yet.</div>`
        : scheduleMatches
            .map((m) => {
              const playersText = `${m.playerNames.slice(0, 2).join(' & ')} ⚔ ${m.playerNames.slice(2, 4).join(' & ')}`;
              return `
                <div class="card" style="background:rgba(255,255,255,.03); margin-bottom:10px;">
                  <div class="row" style="justify-content:space-between;">
                    <div>
                      <strong>Match #${m.matchNumber}</strong>
                      <div style="color:var(--muted); font-size:13px; margin-top:4px;">${playersText}</div>
                      <div style="color:var(--muted); font-size:13px; margin-top:4px;">
                        Shuttlecock: <span data-shuttleval="${m.id}">${m.shuttlecockUsage?.shuttles ?? 0}</span>
                      </div>
                    </div>
                    <div class="row" style="justify-content:flex-end;">
                      <button class="btn" data-shuttle-minus="${m.id}" title="Decrement shuttles">-1 ⚾</button>
                      <button class="btn good" data-shuttle-plus="${m.id}" title="Increment shuttles">+1 ⚾</button>
                      <button class="btn danger" data-cancel="${m.id}" title="Cancel match">❌ Cancel</button>
                    </div>
                  </div>
                </div>
              `;
            })
            .join('');
    };

  const refreshAll = async () => {
    await reloadData();
    renderHistory();
  };

  $('#mm-schedule').addEventListener('change', async () => {
    appState.activeScheduleId = $('#mm-schedule').value || null;
    await storage.saveAll(appState.data);
    await reloadData();
    renderManageMatch();
  });

  $('#mm-add').addEventListener('click', () => {
    const current = getActiveSchedule();
    if (!current) {
      toast('Select a schedule first');
      return;
    }

    const schedule = current;
    const schedMatches = appState.data.matches.filter((m) => m.scheduleId === schedule.id);

    const playedCountByPlayerName = {};
    for (const m of schedMatches) {
      for (const pn of m.playerNames) {
        playedCountByPlayerName[pn] = (playedCountByPlayerName[pn] ?? 0) + 1;
      }
    }

    const playerById = new Map(appState.data.players.map((p) => [p.id, p]));
    const joinByPid = new Map((schedule.joins ?? []).map((j) => [j.playerId, j.joinTime]));

    // Build candidates: players in active schedule only
    const candidates = (schedule.playerIds ?? [])
      .map((pid) => {
        const p = playerById.get(pid);
        const joinTime = joinByPid.get(pid);
        if (!p) return null;
        return {
          id: pid,
          name: p.name,
          class: p.class,
          joinTime: joinTime ? Number(joinTime) : null,
          played: playedCountByPlayerName[p.name] ?? 0,
        };
      })
      .filter(Boolean);

    // Sort: total matches played asc, then arrival time asc (hour/min not needed, full time sort ok)
    candidates.sort((a, b) => {
      if (a.played !== b.played) return a.played - b.played;
      const at = a.joinTime ?? Number.POSITIVE_INFINITY;
      const bt = b.joinTime ?? Number.POSITIVE_INFINITY;
      return at - bt;
    });

    const picks = []; // array of player names in pick order
    const pickedSet = new Set();

    const formatArrive = (ts) => {
      if (!ts) return '-';
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderPickList = () => {
      const wrap = $('#mm-pick-list');
      if (!wrap) return;

      wrap.innerHTML = candidates
        .map((c) => {
          const picked = pickedSet.has(c.name);
          const canPick = !picked && picks.length < 4;
          const buttonDisabled = !picked && !canPick;

          const btnClass = picked ? 'btn danger' : 'btn good';
          const btnText = picked ? 'Unpick' : 'Pick';

          return `
            <div class="card" style="background:rgba(255,255,255,.03); margin:0; border-radius:14px;">
              <div class="row" style="justify-content:space-between; align-items:center;">
                <div style="min-width:0;">
                  <div style="font-weight:900; margin-bottom:4px;">
                    <span class="badge" style="margin-right: 0.5em">${c.class}</span> ${capitalizeEachWord(c.name)}
                  </div>
                  <div style="color:var(--muted); font-size:13px; margin-top:4px;">
                    ${c.played} played.
                  </div>
                  <div style="color:var(--muted); font-size:13px; margin-top:2px;">
                    Arrive: ${formatArrive(c.joinTime)}
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    class="${btnClass}"
                    data-pickname="${c.name}"
                    data-picknow="${picked ? '0' : '1'}"
                    ${picked ? '' : buttonDisabled ? 'disabled' : ''}
                  >
                    ${btnText}
                  </button>
                </div>
              </div>
            </div>
          `;
        })
        .join('')

        .replace(/<\/button>\s+<\/div>/g, '</button></div>'); // harmless formatting cleanup
    };

    openModal(`
      <h3>Add Match (Manual)</h3>
      <div style="color:var(--muted); font-size:13px; margin-bottom:10px;">
        Pick 4 players from the current active schedule (sorted by total matches played, then arrival).
      </div>

      <div id="mm-pick-list" class="grid" style="gap:10px; grid-template-columns:1fr; max-height:52vh; overflow:auto; padding-right:6px;"></div>

      <div style="margin-top:12px; border-top:1px solid rgba(255,255,255,.10);"></div>

      <div class="modal-actions" style="margin-top:12px;">
        <button value="cancel" class="btn" id="mm-manual-cancel">Cancel</button>
        <button type="button" class="btn primary" id="mm-manual-save" disabled>+ Add Match</button>
      </div>
    `);

    const modal = $('#modal');

    // Safety: ensure Cancel + outside click always close this dialog
    const manualCancel = $('#mm-manual-cancel');
    manualCancel?.addEventListener('click', () => closeModal(), { once: true });
    modal.addEventListener(
      'click',
      (e) => {
        const modalInner = e.target?.closest?.('.modal-inner');
        if (!modalInner) closeModal();
      },
      { once: true },
    );

    const updateButtons = () => {
      const save = $('#mm-manual-save');
      if (!save) return;
      save.disabled = picks.length !== 4;
    };

    const onModalClick = (e) => {
      const btn = e.target?.closest?.('button[data-pickname]');
      if (!btn) return;

      // Prevent the dialog's form (method="dialog") from interpreting the click as a submit.
      e.preventDefault();
      e.stopPropagation();

      const name = btn.getAttribute('data-pickname');
      if (!name) return;

      const isPicked = pickedSet.has(name);
      if (!isPicked && picks.length >= 4) return; // guard

      if (isPicked) {
        pickedSet.delete(name);
        const idx = picks.indexOf(name);
        if (idx >= 0) picks.splice(idx, 1);
      } else {
        pickedSet.add(name);
        picks.push(name);
      }

      renderPickList();
      updateButtons();
    };

    // bind for this open
    modal.addEventListener('click', onModalClick);

    // initial render
    renderPickList();
    updateButtons();

    // Save handler for this open
    $('#mm-manual-save').addEventListener('click', async () => {
      if (picks.length !== 4) return;

      const sch2 = getActiveSchedule();
      if (!sch2) return toast('Select a schedule first');

      const nextNumber =
        (appState.data.matches.filter((m) => m.scheduleId === sch2.id).reduce((a, b) => Math.max(a, b.matchNumber), 0) || 0) + 1;

      appState.data.matches.push({
        id: uuid(),
        scheduleId: sch2.id,
        matchNumber: nextNumber,
        playerNames: [...picks],
        shuttlecockUsage: { shuttles: 0 },
        createdAt: nowTimestamp(),
      });

      await autoEnsurePaymentsForSchedule(sch2.id);
      await storage.saveAll(appState.data);
      await reloadData();

      closeModal();
      renderManageMatch();
      toast('Match added');
    });

    // Reset modal state on close + unbind click handler
    const onModalClose = () => {
      modal.removeEventListener('click', onModalClick);
      picks.length = 0;
      pickedSet.clear();
    };
    modal.addEventListener('close', onModalClose, { once: true });
  });

  $('#mm-suggest').addEventListener('click', async () => {
    const current = getActiveSchedule();
    if (!current) {
      toast('Select a schedule first');
      return;
    }

    const suggestions = suggestMatchesForSchedule({
      schedule: current,
      allPlayers: appState.data.players,
      matches: appState.data.matches,
    });

    const modalState = { blacklist: new Set() };

    openModal(`
      <h3 style="margin-bottom:8px;">Match Suggestions</h3>
      <div style="display:grid; gap:12px; grid-template-columns:1fr;" id="mm-suggest-body">
        ${(() => {
          const byName = new Map((appState.data.players ?? []).map((p) => [p.name, p]));
          const teamBtns = (names) =>
            (names ?? [])
              .map((name) => {
                const p = byName.get(name);
                const clsBadge = p?.class ? formatClassBadge(p.class) : '';
                const displayName = p?.name ? capitalizeEachWord(p.name) : capitalizeEachWord(name);
                return `<button class="btn" data-skip="${name}" type="button">${clsBadge} ${displayName} ❌</button>`;
              })
              .join('');
          return suggestions
            .map((s) => {
              const teamAButtons = teamBtns(s.teamA);
              const teamBButtons = teamBtns(s.teamB);

              return `
              <div class="card" style="background:rgba(255,255,255,.03); margin-bottom:0;">
                <div class="row" style="justify-content:space-between;">
                  <h2 style="margin:0; font-size:14px;">Suggestion #${s.suggestionNo}</h2>
                </div>

                <div style="margin-top:10px; color:var(--muted); font-weight:800; font-size:12px;">Team A</div>
                <div class="row" style="margin-top:6px; gap:8px; flex-wrap:wrap;">${teamAButtons}</div>

                <div style="margin-top:10px; color:var(--muted); font-weight:800; font-size:12px;">Team B</div>
                <div class="row" style="margin-top:6px; gap:8px; flex-wrap:wrap;">${teamBButtons}</div>

                <div class="row" style="justify-content:flex-end; margin-top:12px;">
                  <button class="btn good" data-pick="${s.suggestionNo}" type="button">Select This Match</button>
                </div>
              </div>
            `;
            })
            .join('');
        })()}
      </div>

      <div class="modal-actions" style="margin-top:12px;">
        <button value="close" class="btn" formmethod="dialog">Close</button>
      </div>
    `);

    const modal = $('#modal');

    const renderModalSuggestions = (nextSuggestions) => {
      const body = $('#mm-suggest-body');
      if (!body) return;
      body.innerHTML = nextSuggestions
        .map((s) => {
          const byName = new Map((appState.data.players ?? []).map((p) => [p.name, p]));

          const teamAButtons = (s.teamA ?? [])
            .map((name) => {
              const p = byName.get(name);
              const clsBadge = p?.class ? formatClassBadge(p.class) : '';
              const displayName = p?.name ? capitalizeEachWord(p.name) : capitalizeEachWord(name);
              return `<button class="btn" data-skip="${name}" type="button">${clsBadge} ${displayName} ❌</button>`;
            })
            .join('');

          const teamBButtons = (s.teamB ?? [])
            .map((name) => {
              const p = byName.get(name);
              const clsBadge = p?.class ? formatClassBadge(p.class) : '';
              const displayName = p?.name ? capitalizeEachWord(p.name) : capitalizeEachWord(name);
              return `<button class="btn" data-skip="${name}" type="button">${clsBadge} ${displayName} ❌</button>`;
            })
            .join('');

          return `
            <div class="card" style="background:rgba(255,255,255,.03); margin-bottom:0;">
              <div class="row" style="justify-content:space-between;">
                <h2 style="margin:0; font-size:14px;">Suggestion #${s.suggestionNo}</h2>
              </div>

              <div style="margin-top:10px; color:var(--muted); font-weight:800; font-size:12px;">Team A</div>
              <div class="row" style="margin-top:6px;">${s.teamA.join(' + ')}</div>
              <div class="row" style="margin-top:6px; gap:8px; flex-wrap:wrap;">${teamAButtons}</div>

              <div style="margin-top:10px; color:var(--muted); font-weight:800; font-size:12px;">Team B</div>
              <div class="row" style="margin-top:6px;">${s.teamB.join(' + ')}</div>
              <div class="row" style="margin-top:6px; gap:8px; flex-wrap:wrap;">${teamBButtons}</div>

              <div class="row" style="justify-content:flex-end; margin-top:12px;">
                <button class="btn good" data-pick="${s.suggestionNo}" type="button">Select This Match</button>
              </div>
            </div>
          `;
        })
        .join('');
    };

    modal.addEventListener('click', async (e) => {
      const skipName = e.target?.getAttribute?.('data-skip');
      if (skipName) {
        e.preventDefault();
        e.stopPropagation();

        modalState.blacklist.add(skipName);

        const sch2 = getActiveSchedule();
        if (!sch2) return;

        const nextSuggestions = suggestMatchesForSchedule({
          schedule: sch2,
          allPlayers: appState.data.players,
          matches: appState.data.matches,
          playerNameBlacklist: modalState.blacklist,
        });

        renderModalSuggestions(nextSuggestions);
        return;
      }

      const pickNo = e.target?.getAttribute?.('data-pick');
      if (!pickNo) return;

      const sch2 = getActiveSchedule();
      if (!sch2) return;

      const latest = suggestMatchesForSchedule({
        schedule: sch2,
        allPlayers: appState.data.players,
        matches: appState.data.matches,
        playerNameBlacklist: modalState.blacklist,
      });

      const pick = latest.find((x) => x.suggestionNo === Number(pickNo));
      if (!pick) return;

      const nextNumber =
        (appState.data.matches.filter((m) => m.scheduleId === sch2.id).reduce((a, b) => Math.max(a, b.matchNumber), 0) || 0) + 1;

      const playerNames = [...pick.teamA, ...pick.teamB];

      appState.data.matches.push({
        id: uuid(),
        scheduleId: sch2.id,
        matchNumber: nextNumber,
        playerNames,
        shuttlecockUsage: pick.shuttlecockUsage,
        createdAt: nowTimestamp(),
      });

      await autoEnsurePaymentsForSchedule(sch2.id);
      await storage.saveAll(appState.data);
      await reloadData();

      closeModal();
      renderManageMatch();
      toast('Match added');
    });
  });

  // Bind cancel handler only once to prevent duplicate confirmation dialogs
  if (!manageMatchDelegatedBound) {
    manageMatchDelegatedBound = true;
    view.addEventListener('click', async (e) => {
      const cancelId = e.target?.getAttribute?.('data-cancel');
      const plusId = e.target?.getAttribute?.('data-shuttle-plus');
      const minusId = e.target?.getAttribute?.('data-shuttle-minus');

      if (!(cancelId || plusId || minusId)) return;

      const current = getActiveSchedule();
      if (!current?.id) {
        toast('Select a schedule first');
        return;
      }

      // Cancel match (existing behavior)
      if (cancelId) {
        if (!confirm('Cancel this match?')) return;

        appState.data.matches = appState.data.matches.filter((m) => m.id !== cancelId);

        appState.data.payments = appState.data.payments.filter((p) => p.scheduleId !== current.id);
        await autoEnsurePaymentsForSchedule(current.id);

        await storage.saveAll(appState.data);
        await refreshAll();
        toast('Cancelled');
        return;
      }

      // +/- shuttlecock usage (min 0), recompute payment totals for this schedule
      const matchId = plusId || minusId;
      const match = appState.data.matches.find((m) => m.id === matchId);
      if (!match) return;

      const cur = Number(match.shuttlecockUsage?.shuttles ?? 0);
      const delta = plusId ? 1 : -1;
      const next = Math.max(0, cur + delta);

      match.shuttlecockUsage = { shuttles: next };

      updatePaymentsTotalsForSchedule(current.id);

      await storage.saveAll(appState.data);
      await refreshAll();
      toast('Shuttlecock updated');
    });
  }

  renderHistory();
}

function renderScheduleMatches() {

  const view = $('#view-schedule');
  const sch = getActiveSchedule();
  const matchesWrapId = 'schedule-matches-wrap';
  if (!sch) return;

  // Add match management section if not present
  if (!$("#" + matchesWrapId)) {
    const hr = document.createElement('hr');
    hr.className = 'sep';
    view.appendChild(hr);

    const section = document.createElement('section');
    section.id = matchesWrapId;
    section.className = 'card';
    section.style.marginTop = '0px';
    view.appendChild(section);
  }

  const wrap = $('#' + matchesWrapId);
  const scheduleMatches = appState.data.matches
    .filter((m) => m.scheduleId === sch.id)
    .slice()
    .sort((a, b) => a.matchNumber - b.matchNumber);

  wrap.innerHTML = `
    <h2>Match Management</h2>
    <div class="grid grid-2">
      <div>
        <div class="card" style="background:rgba(15,25,48,.65); margin-bottom:12px;">
          <h2>Match Suggestions</h2>
          <div id="suggestions"></div>
          <div style="color:var(--muted); font-size:13px; margin-top:8px;">
            Open this page to refresh suggestions.
          </div>
        </div>
        <div class="card" style="background:rgba(15,25,48,.65);">
          <h2>Selected Matches</h2>
          <div id="selected-matches"></div>
        </div>
      </div>

      <div>
        <div class="card" style="background:rgba(15,25,48,.65);">
          <h2>Match History (played)</h2>
          <div id="history"></div>
        </div>
      </div>
    </div>
  `;

  const suggestions = suggestMatchesForSchedule({ schedule: sch, allPlayers: appState.data.players, matches: appState.data.matches });

  $('#suggestions').innerHTML = suggestions
    .map((s) => {
      const teamAPlayers = s.teamA.map((name) => `<button class="btn" data-skip="${name}" data-suggestion="${s.suggestionNo}">Skip ${name}</button>`).join('');
      const teamBPlayers = s.teamB.map((name) => `<button class="btn" data-skip="${name}" data-suggestion="${s.suggestionNo}">Skip ${name}</button>`).join('');

      return `
        <div class="card" style="margin-bottom:10px; background:rgba(255,255,255,.03);">
          <div class="row" style="justify-content:space-between;">
            <h2 style="margin:0;">Suggestion #${s.suggestionNo}</h2>
            <div class="pill">Balance: ${s.overallBalanceScore}</div>
          </div>
          <div class="grid" style="margin-top:10px; gap:8px;">
            <div><div style="color:var(--muted); font-weight:800; font-size:12px;">Team A</div><div class="row">${s.teamA.join(' + ')}</div></div>
            <div class="row">${teamAPlayers}</div>
            <div><div style="color:var(--muted); font-weight:800; font-size:12px; margin-top:6px;">Team B</div><div class="row">${s.teamB.join(' + ')}</div></div>
            <div class="row">${teamBPlayers}</div>
          </div>
          <div class="row" style="justify-content:flex-end; margin-top:10px;">
            <button class="btn good" data-pick="${s.suggestionNo}">Select This Match</button>
          </div>
        </div>
      `;
    })
    .join('');

  // Selected matches: in this implementation, "Select" immediately plays and stores match.
  $('#selected-matches').innerHTML = `
    <div style="color:var(--muted); font-size:13px;">Selecting a suggestion will add it to history immediately.</div>
  `;

  const historyHtml = scheduleMatches
    .map((m) => {
      const playersText = `${m.playerNames.slice(0, 2).join(' + ')} vs ${m.playerNames.slice(2, 4).join(' + ')}`;
      return `
        <div class="card" style="background:rgba(255,255,255,.03); margin-bottom:10px;">
          <div class="row" style="justify-content:space-between;">
            <div>
              <strong>Match #${m.matchNumber}</strong>
              <div style="color:var(--muted); font-size:13px; margin-top:4px;">${playersText}</div>
                      <div style="color:var(--muted); font-size:13px; margin-top:4px;">Shuttlecock: ${m.shuttlecockUsage?.shuttles ?? 0}</div>
                    </div>
                    <div class="row" style="justify-content:flex-end;">
                      <button class="btn" data-shuttle-minus="${m.id}" title="Decrement shuttles">[-1 Shuttlecock Logo]</button>
                      <button class="btn good" data-shuttle-plus="${m.id}" title="Increment shuttles">[+1 Shuttlecock Logo]</button>
                      <button class="btn danger" data-cancel="${m.id}" title="Cancel match">[X Cancel]</button>
                    </div>
                  </div>
                </div>
      `;
    })
    .join('');

  $('#history').innerHTML = historyHtml || `<div style="color:var(--muted); font-size:13px;">No matches selected yet.</div>`;

  appState._latestSuggestions = suggestions;

  // event handlers (only bound once)
  if (!scheduleDelegatedBound) {
    scheduleDelegatedBound = true;
    view.addEventListener('click', async (e) => {
      const pickNo = e.target?.getAttribute?.('data-pick');
      if (pickNo) {
        const sch2 = getActiveSchedule();
        if (!sch2) return;
        const latest = appState._latestSuggestions ?? [];
        const pick = latest.find((x) => x.suggestionNo === Number(pickNo));
        if (!pick) return;

        const nextNumber =
          (appState.data.matches.filter((m) => m.scheduleId === sch2.id).reduce((a, b) => Math.max(a, b.matchNumber), 0) || 0) + 1;
        const playerNames = [...pick.teamA, ...pick.teamB];

        appState.data.matches.push({
          id: uuid(),
          scheduleId: sch2.id,
          matchNumber: nextNumber,
          playerNames,
          shuttlecockUsage: pick.shuttlecockUsage,
          createdAt: nowTimestamp(),
        });

        await autoEnsurePaymentsForSchedule(sch2.id);
        await storage.saveAll(appState.data);
        await reloadData();
        renderStartSchedule();
        renderScheduleMatches();
        renderPlayersForSuggestion();
        toast('Match added');
        return;
      }

      const cancelId = e.target?.getAttribute?.('data-cancel');
      if (cancelId) {
        if (!confirm('Cancel this match?')) return;
        const sch2 = getActiveSchedule();
        appState.data.matches = appState.data.matches.filter((m) => m.id !== cancelId);

        if (sch2?.id) {
          appState.data.payments = appState.data.payments.filter((p) => p.scheduleId !== sch2.id);
          await autoEnsurePaymentsForSchedule(sch2.id);
        }

        await storage.saveAll(appState.data);
        await reloadData();
        renderStartSchedule();
        renderScheduleMatches();
        renderPlayersForSuggestion();
        toast('Cancelled');
        return;
      }

      const skipName = e.target?.getAttribute?.('data-skip');
      const skipSug = e.target?.getAttribute?.('data-suggestion');
      if (skipName && skipSug) {
        const currentSch = getActiveSchedule();
        if (!currentSch) return;

        appState._skipBlacklist = (appState._skipBlacklist ?? new Set());
        appState._skipBlacklist.add(skipName);

        const updated = suggestMatchesForScheduleWithBlacklist(
          currentSch,
          appState.data.players,
          appState.data.matches,
          appState._skipBlacklist,
        );

        $('#suggestions').innerHTML = updated
          .map((s) => {
            const teamAButtons = s.teamA
              .map((name) => `<button class="btn" data-skip="${name}" data-suggestion="${s.suggestionNo}">Skip ${name}</button>`)
              .join('');
            const teamBButtons = s.teamB
              .map((name) => `<button class="btn" data-skip="${name}" data-suggestion="${s.suggestionNo}">Skip ${name}</button>`)
              .join('');
            return `
              <div class="card" style="margin-bottom:10px; background:rgba(255,255,255,.03);">
                <div class="row" style="justify-content:space-between;">
                  <h2 style="margin:0;">Suggestion #${s.suggestionNo}</h2>
                  <div class="pill">Balance: ${s.overallBalanceScore}</div>
                </div>
                <div class="grid" style="margin-top:10px; gap:8px;">
                  <div><div style="color:var(--muted); font-weight:800; font-size:12px;">Team A</div><div class="row">${s.teamA.join(' + ')}</div></div>
                  <div class="row">${teamAButtons}</div>
                  <div><div style="color:var(--muted); font-weight:800; font-size:12px; margin-top:6px;">Team B</div><div class="row">${s.teamB.join(' + ')}</div></div>
                  <div class="row">${teamBButtons}</div>
                </div>
                <div class="row" style="justify-content:flex-end; margin-top:10px;">
                  <button class="btn good" data-pick="${s.suggestionNo}">Select This Match</button>
                </div>
              </div>
            `;
          })
          .join('');

        appState._latestSuggestions = updated;
        toast('Player skipped');
      }
    });
  }
}

function suggestMatchesForScheduleWithBlacklist(schedule, allPlayers, matches, blacklist) {
  const schedulePlayers = schedule.playerIds;
  const scheduleMatches = matches.filter((m) => m.scheduleId === schedule.id);

  const playedCountsByName = {};
  for (const m of scheduleMatches) {
    for (const pn of m.playerNames) {
      playedCountsByName[pn] = (playedCountsByName[pn] ?? 0) + 1;
    }
  }

  const schedulePlayerSet = new Set(schedulePlayers);
  const candidates = allPlayers
    .filter((p) => schedulePlayerSet.has(p.id) && !blacklist.has(p.name));

  candidates.sort((p1, p2) => {
    const c1 = playedCountsByName[p1.name] ?? 0;
    const c2 = playedCountsByName[p2.name] ?? 0;
    if (c1 !== c2) return c1 - c2;
    return getPlayerComfortRank(p1) - getPlayerComfortRank(p2);
  });

  const suggestions = [];
  const usedCombos = new Set();

  const tryAdd = (p1, p2, p3, p4) => {
    const ids = [p1.id, p2.id, p3.id, p4.id].slice().sort().join('|');
    if (usedCombos.has(ids)) return;
    const teamA = [p1, p2];
    const teamB = [p3, p4];

    const balance = balanceScoreForTeams({ teamA, teamB });
    const fairness = teamA.concat(teamB).reduce((acc, p) => acc + (playedCountsByName[p.name] ?? 0), 0);
    const overall = balance * 100 + fairness;


    suggestions.push({ teamA: [p1.name, p2.name], teamB: [p3.name, p4.name], overallBalanceScore: overall, shuttlecockUsage: { shuttles: 2 }, _meta: { ids } });
    usedCombos.add(ids);
  };

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      for (let k = j + 1; k < candidates.length; k++) {
        for (let l = k + 1; l < candidates.length; l++) {
          if (suggestions.length >= 30) break;
          tryAdd(candidates[i], candidates[j], candidates[k], candidates[l]);
        }
      }
    }
  }

  suggestions.sort((a, b) => a.overallBalanceScore - b.overallBalanceScore);
  return suggestions.slice(0, 3).map((s, idx) => ({
    suggestionNo: idx + 1,
    teamA: s.teamA,
    teamB: s.teamB,
    overallBalanceScore: s.overallBalanceScore,
    shuttlecockUsage: s.shuttlecockUsage,
  }));
}

function renderPlayersForSuggestion() {
  // Placeholder for future: keep current for smooth UI.
}

async function autoEnsurePaymentsForSchedule(scheduleId) {
  // Create payment records for each distinct player who played in this schedule.
  const schMatches = appState.data.matches.filter((m) => m.scheduleId === scheduleId);
  const schedule = appState.data.schedules.find((s) => s.id === scheduleId);
  if (!schedule) return;

  const schedulePlayerNames = new Set();
  for (const m of schMatches) {
    for (const pn of m.playerNames) schedulePlayerNames.add(pn);
  }

  // Generate payments per player for this schedule.
  // Use total shuttlecock usage = total shuttles across matches the player participated in.
  const shuttleByPlayer = {};
  for (const m of schMatches) {
    const sh = Number(m.shuttlecockUsage?.shuttles ?? 0);
    for (const pn of m.playerNames) {
      shuttleByPlayer[pn] = (shuttleByPlayer[pn] ?? 0) + sh;
    }
  }

  for (const name of schedulePlayerNames) {
    const existing = appState.data.payments.find((p) => p.scheduleId === scheduleId && p.playerName === name);
    if (existing) continue;

    const shuttlecockUsage = { shuttles: shuttleByPlayer[name] ?? 0 };
    const total = computeTotalPayment({ shuttlecockUsage, playerName: name });

    appState.data.payments.push({
      id: uuid(),
      playerName: name,
      scheduleId,
      scheduleDateISO: schedule.dateISO,
      shuttlecockUsage,
      totalPayment: total,
      paymentMethod: '',
      createdAt: nowTimestamp(),
    });
  }
}

function renderPayments() {
  const view = $('#view-payments');
  const { payments, schedules } = appState.data;

  const scheduleById = new Map(schedules.map((s) => [s.id, s]));

  const unpaid = payments
    .filter((p) => !p.paymentMethod)
    .slice()
    .sort((a, b) => (a.scheduleDateISO ?? '').localeCompare(b.scheduleDateISO ?? ''));

  view.innerHTML = `
    <div class="card">
      <h2>Unpaid Payment List</h2>
      <div style="overflow:auto;">
        <table class="table">
          <thead>
            <tr>
              <th>Schedule</th>
              <th>Player</th>
              <th>Shuttlecock Usage</th>
              <th>Total Payment</th>
              <th style="width:32%">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${unpaid
              .map(
                (p) => `
              <tr>
                <td>${formatDateNice(p.scheduleDateISO)}</td>
                <td><strong>${p.playerName}</strong></td>
                <td style="color:var(--muted)">${p.shuttlecockUsage?.shuttles ?? 0}</td>
                <td><span class="pill">Rp${p.totalPayment.toLocaleString('id-ID')}</span></td>
                <td>
                  <div class="row" style="justify-content:flex-end;">
                    <button class="btn good" data-pay="${p.id}">Pay</button>
                    <button class="btn" data-collect="${p.id}">Collect Payment</button>
                  </div>
                </td>
              </tr>
            `
              )
              .join('') || `<tr><td colspan="5" style="color:var(--muted)">No unpaid payments 🎉</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;

  view.addEventListener('click', (e) => {
    const payId = e.target?.getAttribute?.('data-pay');
    const collectId = e.target?.getAttribute?.('data-collect');
    if (payId) {
      const p = appState.data.payments.find((x) => x.id === payId);
      if (!p) return;
      openModal(`
        <h3>Set Payment Method</h3>
        <div class="grid" style="gap:10px;">
          <div>
            <label>Choose method</label>
            <div class="row">
              <button type="button" class="btn primary" id="pm-cash">Cash</button>
              <button type="button" class="btn primary" id="pm-tf">Transfer (TF)</button>
            </div>
          </div>
          <div style="color:var(--muted); font-size:13px;">Player: <strong>${p.playerName}</strong></div>
        </div>
        <div class="modal-actions">
          <button value="cancel" class="btn" formmethod="dialog">Close</button>
        </div>
      `);
      const modal = $('#modal');
      $('#pm-cash').addEventListener('click', () => confirmPay(p.id, 'Cash'));
      $('#pm-tf').addEventListener('click', () => confirmPay(p.id, 'TF'));
      modal.addEventListener('close', () => renderPayments());
      return;
    }

    if (collectId) {
      const p = appState.data.payments.find((x) => x.id === collectId);
      if (!p) return;
      const greeting = inferGreetingByTime();
      const message = buildCollectPaymentMessage({
        greeting,
        playerName: p.playerName,
        scheduleDateISO: formatDateLongID(p.scheduleDateISO),
        totalPayment: p.totalPayment,
        formatDateNice,
      });

      openModal(`
        <h3>Collect Payment Message</h3>
        <div>
          <label>Message</label>
          <textarea id="collect-text" readonly>${message}</textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" id="copy">Copy To Clipboard</button>
          <button value="close" class="btn" formmethod="dialog">Close</button>
        </div>
      `);
      $('#copy').addEventListener('click', async () => {
        await navigator.clipboard.writeText(message);
        toast('Copied');
      });
      return;
    }
  });

  const modal = $('#modal');
  modal.addEventListener('close', () => {
    // noop
  });

  async function confirmPay(paymentId, method) {
    const p = appState.data.payments.find((x) => x.id === paymentId);
    if (!p) return;
    p.paymentMethod = method;
    await storage.saveAll(appState.data);
    await reloadData();
    toast('Payment saved');
    closeModal();
    renderPayments();
  }
}

function renderImportExport() {
  const view = $('#view-io');
  view.innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <h2>Export JSON</h2>
        <div style="color:var(--muted); font-size:13px; margin-bottom:10px;">Copy each JSON file content below and save as the corresponding local files.</div>
        <div class="grid" style="gap:10px;">
          <div><label>players.json</label><textarea id="ex-players"></textarea></div>
          <div><label>schedules.json</label><textarea id="ex-schedules"></textarea></div>
          <div><label>matches.json</label><textarea id="ex-matches"></textarea></div>
          <div><label>payments.json</label><textarea id="ex-payments"></textarea></div>
        </div>
      </div>
      <div class="card">
        <h2>Import JSON</h2>
        <div style="color:var(--muted); font-size:13px; margin-bottom:10px;">Paste JSON arrays for each file then Import.</div>
        <div class="grid" style="gap:10px;">
          <div><label>players.json</label><textarea id="im-players"></textarea></div>
          <div><label>schedules.json</label><textarea id="im-schedules"></textarea></div>
          <div><label>matches.json</label><textarea id="im-matches"></textarea></div>
          <div><label>payments.json</label><textarea id="im-payments"></textarea></div>
        </div>
        <div class="modal-actions" style="margin-top:12px;">
          <button class="btn danger" id="im-reset">Reset All</button>
          <button class="btn primary" id="im-do">Import</button>
        </div>
      </div>
    </div>
  `;

  const { players, schedules, matches, payments } = appState.data;
  $('#ex-players').value = JSON.stringify(players, null, 2);
  $('#ex-schedules').value = JSON.stringify(schedules, null, 2);
  $('#ex-matches').value = JSON.stringify(matches, null, 2);
  $('#ex-payments').value = JSON.stringify(payments, null, 2);

  $('#im-reset').addEventListener('click', async () => {
    if (!confirm('Reset all local data in this browser?')) return;
    await storage.resetAll();
    ensureSeededDemoData();
    await reloadData();
    renderImportExport();
    toast('Reset');
  });

  $('#im-do').addEventListener('click', async () => {
    const parse = (id) => parseQueryJSON($(id).value || '[]', []);
    const next = {
      players: parse('#im-players'),
      schedules: parse('#im-schedules'),
      matches: parse('#im-matches'),
      payments: parse('#im-payments'),
    };
    if (![next.players, next.schedules, next.matches, next.payments].every(Array.isArray)) {
      return toast('Invalid JSON arrays');
    }
    appState.data = next;
    await storage.saveAll(next);
    await reloadData();
    renderImportExport();
    toast('Imported');
  });
}

function ensureToast() {
  if ($('#toast')) return;
  const el = document.createElement('div');
  el.id = 'toast';
  el.className = 'toast';
  document.body.appendChild(el);
}

async function reloadData() {
  appState.data = await storage.loadAll();
}

function switchView(key) {
  const map = {
    dashboard: 'view-dashboard',
    players: 'view-players',
    schedule: 'view-schedule',
    'manage-match': 'view-manage-match',
    payments: 'view-payments',
    io: 'view-io',
  };


  const viewId = map[key];
  if (!viewId) return;

  for (const el of $$('.view')) el.classList.remove('active');
  $('#' + viewId).classList.add('active');

  // aria current
  for (const btn of $$('.tab')) btn.setAttribute('aria-current', btn.dataset.view === key ? 'page' : 'false');

  if (key === 'dashboard') renderDashboard();
  if (key === 'players') renderPlayers();
  if (key === 'schedule') {
    renderStartSchedule();
  }
  if (key === 'manage-match') {
    // Manage Match page (implementation pending)
    if (typeof renderManageMatch === 'function') renderManageMatch();
    else toast('Manage Match not implemented yet');
  }


  if (key === 'payments') renderPayments();
  if (key === 'io') renderImportExport();
}

async function main() {
  ensureSeededDemoData();
  await reloadData();

  // Setup nav
  $$('.tab').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Default active schedule
  const scheds = appState.data.schedules;
  if (!appState.activeScheduleId && scheds.length) {
    appState.activeScheduleId = scheds.slice().sort((a, b) => b.createdAt - a.createdAt)[0].id;
  }

  ensureToast();
  switchView('dashboard');

  window.addEventListener('focus', () => {
    // keep dashboard up to date lightly
  });
}

main();



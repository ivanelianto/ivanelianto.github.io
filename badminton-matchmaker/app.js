import { PLAYERS_SEED } from './playersSeed.js';
import { COURT_FEE, SHUTTLE_FEE_PER, buildCollectPaymentMessage } from './config.js';
import { createAutocompleteInput } from './autocomplete.js';
import { $, $$ } from './dom.js';
import { confirmDialog } from './confirmDialog.js';
import { setupNavigationDrawer } from './navigationDrawer.js';
import { seedStorageIfEmpty, storage } from './storage.js';
import {
  capitalizeEachWord,
  formatDateLongID,
  formatDateNice,
  formatScheduleLabel,
  normalizeName,
  nowTimestamp,
  parseQueryJSON,
  todayISO,
  uuid,
} from './utils.js';

const CLASS_ORDER = ['C', 'B', 'A', 'S'];
const CLASS_RANK = Object.fromEntries(CLASS_ORDER.map((c, i) => [c, i]));

// ---- Business logic ----
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

  const joinByPlayerId = new Map((schedule.joins ?? []).map((j) => [j.playerId, { joinTime: Number(j.joinTime), team: j.team ?? null }]));
  const schedulePlayerSet = new Set(schedule.playerIds ?? []);

  const candidates = allPlayers
    .filter((p) => schedulePlayerSet.has(p.id) && !playerNameBlacklist.has(p.name))
    .map((p) => ({
      ...p,
      played: playedCountsByName[p.name] ?? 0,
      arriveTime: (joinByPlayerId.get(p.id)?.joinTime) ?? Number.POSITIVE_INFINITY,
      team: joinByPlayerId.get(p.id)?.team ?? null,
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
  if (schedule.isSparringMode) {
    // Split candidates by team based on join.team values
    const teamAName = schedule.teamA || 'Team A';
    const teamBName = schedule.teamB || 'Team B';
    const teamAList = candidates.filter((c) => c.team === teamAName);
    const teamBList = candidates.filter((c) => c.team === teamBName);

    for (let i = 0; i < teamAList.length; i++) {
      for (let j = i + 1; j < teamAList.length; j++) {
        for (let k = 0; k < teamBList.length; k++) {
          for (let l = k + 1; l < teamBList.length; l++) {
            if (suggestions.length >= 80) break;
            const pa1 = teamAList[i];
            const pa2 = teamAList[j];
            const pb1 = teamBList[k];
            const pb2 = teamBList[l];

            const ids = [pa1.id, pa2.id, pb1.id, pb2.id].slice().sort().join('|');
            if (usedCombos.has(ids)) continue;
            usedCombos.add(ids);

            const teamAPlayers = [pa1, pa2];
            const teamBPlayers = [pb1, pb2];
            const playedSum = teamAPlayers.concat(teamBPlayers).reduce((acc, p) => acc + (p.played ?? 0), 0);
            const classDiff = balanceScoreForTeams({ teamA: teamAPlayers, teamB: teamBPlayers });
            const overall = classDiff * 1000 + playedSum;

            suggestions.push({
              teamA: teamAPlayers.map((p) => p.name),
              teamB: teamBPlayers.map((p) => p.name),
              overallBalanceScore: overall,
              _meta: { pids: ids, classDiff },
              shuttlecockUsage: { shuttles: 0 },
            });
          }
        }
      }
    }
  } else {
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
  const seedPlayers = PLAYERS_SEED.map((p) => ({
    id: uuid(),
    name: p.name,
    class: p.class,
    note: p.note ?? '',
  }));
  seedStorageIfEmpty(seedPlayers);
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

function renderClassRadios(groupName, value) {
  return `
    <div class="class-radio-group" data-class-group="${groupName}">
      ${CLASS_ORDER.map((c) => `
        <label class="class-radio">
          <input type="radio" name="${groupName}" value="${c}" ${c === value ? 'checked' : ''} />
          <span>${c}</span>
        </label>
      `).join('')}
    </div>
  `;
}

function getSelectedClass(groupName) {
  return $(`input[name="${groupName}"]:checked`)?.value ?? 'C';
}

function setSelectedClass(groupName, value = 'C') {
  const radios = $$(`input[name="${groupName}"]`);
  if (!radios.length) return;
  const next = CLASS_ORDER.includes(value) ? value : 'C';
  radios.forEach((radio) => {
    radio.checked = radio.value === next;
  });
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

let scheduleAutocompleteTeardown = null;

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

  const cards = players
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => `
      <div class="card card--muted u-mb-10">
        <div class="row u-justify-between u-align-center">
          <div class="u-min-width-0">
            <div><span class="badge mr-05em">${p.class}</span> <strong>${p.name}</strong></div>
            <div class="u-text-muted u-font-13 u-mt-4">${p.note ?? ''}</div>
          </div>
          <div class="row u-gap-8">
            <button class="btn warn" data-edit="${p.id}">✍️</button>
            <button class="btn danger" data-del="${p.id}">❌</button>
          </div>
        </div>
      </div>
    `)
    .join('');

  view.innerHTML = `
    <div class="grid grid-cols-1">
      <div class="card">
        <h2>Add / Update Player</h2>
        <div class="grid u-gap-10">
          <input id="p-name" placeholder="Name" />
          <div>
            <label>Class</label>
            ${renderClassRadios('p-class', 'C')}
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
        <div class="u-overflow-auto">
          <div id="players-list">
            ${cards || '<div class="u-text-muted">No players yet.</div>'}
          </div>
        </div>
      </div>
    </div>
  `;

  let editingId = null;

  const nameEl = $('#p-name');
  const noteEl = $('#p-note');

  const setForm = (p) => {
    nameEl.value = p?.name ?? '';
    setSelectedClass('p-class', p?.class ?? 'C');
    noteEl.value = p?.note ?? '';
    editingId = p?.id ?? null;
  };

  setForm(null);

  $('#p-reset').addEventListener('click', () => setForm(null));

  $('#p-save').addEventListener('click', async () => {
    const name = normalizeName(nameEl.value);
    const cls = getSelectedClass('p-class');
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

  view.onclick = async (e) => {
    const action = e.target?.closest?.('button[data-edit], button[data-del]');
    if (!action) return;

    const editId = action.getAttribute('data-edit');
    const delId = action.getAttribute('data-del');
    if (editId) {
      const p = appState.data.players.find((x) => x.id === editId);
      setForm(p);
    }
    if (delId) {
    if (!(await confirmDialog('Delete this player?', { title: 'Delete Player', okText: 'OK', danger: true }))) return;
      // Also remove from any schedules
      appState.data.players = appState.data.players.filter((x) => x.id !== delId);
      appState.data.schedules.forEach((s) => {
        s.playerIds = (s.playerIds ?? []).filter((pid) => pid !== delId);
      });
      await storage.saveAll(appState.data);
      await reloadData();
      renderPlayers();
      toast('Deleted');
    }
  };
}

function renderStartSchedule() {
  if (typeof scheduleAutocompleteTeardown === 'function') {
    scheduleAutocompleteTeardown();
    scheduleAutocompleteTeardown = null;
  }

  const view = $('#view-schedule');
  const { players, schedules } = appState.data;

  const lastSchedule = schedules.slice().sort((a, b) => b.createdAt - a.createdAt)[0];

  const scheduleSelect = `
    <div>
      <label>Active Schedule</label>
      <div>
        <select id="active-schedule"></select>
      </div>
      <div class="row u-justify-between u-mt-8">
        <button class="btn" id="sched-close">Close</button>
        <button class="btn primary" id="sched-new">New Schedule</button>
      </div>
    </div>
  `;

  const scheduleOptions = schedules
    .slice()
    .sort((a, b) => (a.dateISO ?? '').localeCompare(b.dateISO ?? ''))
    .map((s) => `<option value="${s.id}">${formatScheduleLabel(s)}</option>`)
    .join('');

  view.innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <h2>Start / Select Schedule</h2>
        <div class="grid u-gap-10">
          ${scheduleSelect}

          <div class="u-text-muted u-font-13">
            Players added will be reused from <span class="fw-800">players.json</span> if name matches.
          </div>
        </div>
      </div>

      <div class="card">
        <h2>Add Players to Schedule</h2>
        <div class="grid u-gap-10">
          <input id="sp-name" placeholder="Player name" />
          <div id="sp-team-wrap"></div>
          <div>
            <label>Class (used if new player)</label>
            ${renderClassRadios('sp-class', 'C')}
          </div>
          <input id="sp-note" placeholder="Note (optional)" />
          <div class="row">
            <button class="btn good" id="sp-add">🟢 Add Player</button>
          </div>
        </div>
      </div>
    </div>

    <hr class="sep" />
    
    <div class="card">
      <h2>Players in Active Schedule</h2>
      <div id="sched-player-list" class="grid u-gap-10"></div>
    </div>
  `;

  const activeSel = $('#active-schedule');
  activeSel.innerHTML = schedules.map((s) => `<option value="${s.id}">${formatScheduleLabel(s)}</option>`).join('');

  if (lastSchedule) {
    appState.activeScheduleId = appState.activeScheduleId ?? lastSchedule.id;
    activeSel.value = appState.activeScheduleId;
  }

  const renderSchedulePlayers = () => {
    const sch = getActiveSchedule();
    const list = $('#sched-player-list');

    if (!sch) {
      list.innerHTML = `<div class="u-text-muted u-font-13">No active schedule. Create one.</div>`;
      return;
    }

    const playerById = new Map(appState.data.players.map((p) => [p.id, p]));
    const joinMap = new Map((sch.joins ?? []).map((j) => [j.playerId, j]));

    const rows = (sch.playerIds ?? []).map((pid) => {
      const p = playerById.get(pid);
      const joinObj = joinMap.get(pid) || {};
      const joinTime = joinObj.joinTime;
      const arriveTime = joinTime ? new Date(joinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
      const teamBadge = sch.isSparringMode && joinObj.team ? `<span class="badge--team mr-05em">${joinObj.team}</span>` : '';

      return `
        <div class="card card--muted no-margin radius-14">
          <div class="row u-justify-between u-align-center">
            <div class="u-flex-1">
              <div>${teamBadge}${p?.class ? formatClassBadge(p.class) : ''} ${capitalizeEachWord(p?.name ?? '')} - arrive ${arriveTime}</div>
            </div>
            <div>
              <button class="btn danger" data-remove="${pid}">X</button>
            </div>
          </div>
        </div>
      `;
    });

    list.innerHTML = rows.join('') || `<div class="u-text-muted u-font-13">No players added yet.</div>`;
  };

  activeSel.addEventListener('change', async () => {
    appState.activeScheduleId = activeSel.value || null;
    renderSchedulePlayers();
  });

  // Close just clears active schedule (does not delete schedule)
  $('#sched-close').addEventListener('click', async () => {
    appState.activeScheduleId = null;
    await storage.saveAll(appState.data);
    renderStartSchedule();
    toast('Active schedule cleared');
  });

  // New Schedule opens modal
  $('#sched-new').addEventListener('click', () => {
    openModal(`
      <h3>Create New Schedule</h3>
      <div class="grid u-gap-10">
        <div>
          <label>Schedule Date</label>
          <input type="date" id="ns-date" value="${todayISO()}" />
        </div>

        <div>
          <label>Session Name (Optional)</label>
          <input id="ns-session" placeholder="e.g. Friday Night Session" />
        </div>

        <div>
          <label>Options</label>
          <div class="row u-gap-8">
            <label class="switch">
              <div class="switch-wrapper">
                <input type="checkbox" id="ns-sparring" />
                <span class="switch-slider"></span>
              </div>
              <span class="u-ml-8">Sparring Mode</span>
            </label>
          </div>
        </div>

        <div id="ns-teams" style="display:none;">
          <div>
            <label>Team A</label>
            <input id="ns-team-a" placeholder="Team A name" />
          </div>
          <div class="u-mt-8">
            <label>Team B</label>
            <input id="ns-team-b" placeholder="Team B name" />
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button value="cancel" class="btn" formmethod="dialog">Cancel</button>
        <button type="button" class="btn primary" id="ns-create">Create New Schedule</button>
      </div>
    `);

    const modal = $('#modal');
    const spar = $('#ns-sparring');
    const teamsWrap = $('#ns-teams');
    spar.addEventListener('change', () => {
      teamsWrap.style.display = spar.checked ? 'block' : 'none';
    });

    $('#ns-create').addEventListener('click', async () => {
      const dateISO = $('#ns-date').value || todayISO();
      const sessionName = ($('#ns-session').value || '').trim();
      const isSparringMode = !!$('#ns-sparring').checked;
      const teamA = isSparringMode ? ($('#ns-team-a').value || '').trim() : '';
      const teamB = isSparringMode ? ($('#ns-team-b').value || '').trim() : '';

      if (isSparringMode && (!teamA || !teamB)) return toast('Both team names required for Sparring Mode');

      const createdAt = nowTimestamp();
      const sch = {
        id: uuid(),
        dateISO,
        sessionName: sessionName || '',
        isSparringMode: !!isSparringMode,
        teamA: teamA || '',
        teamB: teamB || '',
        createdAt,
        playerIds: [],
        joins: [],
      };

      appState.data.schedules.push(sch);
      appState.activeScheduleId = sch.id;
      await storage.saveAll(appState.data);
      await reloadData();
      closeModal();
      renderStartSchedule();
      toast('Schedule created');
    }, { once: true });

    modal.addEventListener('close', () => {
      // noop
    }, { once: true });
  });

  // legacy inline-create removed; creation now handled via New Schedule modal

  $('#sp-add').addEventListener('click', async () => {
    await addPlayerToActiveSchedule();
  });

  // If the active schedule is sparring mode, show team radio options
  const refreshTeamControls = () => {
    const sch = getActiveSchedule();
    const wrap = $('#sp-team-wrap');
    if (!wrap) return;
    if (sch && sch.isSparringMode) {
      const teamA = sch.teamA || 'Team A';
      const teamB = sch.teamB || 'Team B';
      wrap.innerHTML = `
        <label>Team</label>
        <div class="row">
          <label class="class-radio"><input type="radio" name="sp-team" value="${teamA}" /> <span>${teamA}</span></label>
          <label class="class-radio"><input type="radio" name="sp-team" value="${teamB}" /> <span>${teamB}</span></label>
        </div>
      `;
    } else {
      wrap.innerHTML = '';
    }
  };

  // Refresh team controls whenever schedule changes
  activeSel.addEventListener('change', refreshTeamControls);

  // Initialize team controls for current selection
  refreshTeamControls();

  scheduleAutocompleteTeardown = createAutocompleteInput($('#sp-name'), {
    source: (query) => {
      const q = query.toLowerCase();
      return appState.data.players
        .filter((p) => p.name.toLowerCase().includes(q))
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    minChars: 2,
    getLabel: (player) => `${capitalizeEachWord(player.name)} · ${player.class}`,
    onSelect: () => {
      void addPlayerToActiveSchedule();
    },
  });

  $('#sp-name').addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter' || e.defaultPrevented) return;
    e.preventDefault();
    await addPlayerToActiveSchedule();
  });

  view.onclick = async (e) => {
    const pid = e.target?.getAttribute?.('data-remove');
    if (!pid) return;
    const sch = getActiveSchedule();
    if (!sch) return;

    if (!(await confirmDialog('Remove player from schedule?', { title: 'Remove Player', okText: 'OK', danger: true }))) return;

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
  };

  renderSchedulePlayers();

  async function addPlayerToActiveSchedule() {
    const name = capitalizeEachWord($('#sp-name').value);
    const cls = getSelectedClass('sp-class');
    const note = $('#sp-note').value;
    if (!name) return toast('Player name required');

    const sch = getActiveSchedule();
    if (!sch) return toast('Create/select schedule first');

    // If sparring mode, ensure team selected
    let selectedTeam = null;
    if (sch.isSparringMode) {
      selectedTeam = $(`input[name="sp-team"]:checked`)?.value ?? null;
      if (!selectedTeam) return toast('Select a team');
    }

    let existing = appState.data.players.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (!existing) {
      existing = { id: uuid(), name, class: cls, note };
      appState.data.players.push(existing);
    }

    if (!(sch.playerIds ?? []).includes(existing.id)) {
      sch.playerIds = sch.playerIds ?? [];
      sch.joins = sch.joins ?? [];
      sch.playerIds.push(existing.id);
      const join = { playerId: existing.id, joinTime: nowTimestamp() };
      if (sch.isSparringMode && selectedTeam) join.team = selectedTeam;
      sch.joins.push(join);
    }

    await storage.saveAll(appState.data);
    await reloadData();
    renderStartSchedule();
    toast('Player added');
  }
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
        `<option value="${s.id}" ${sch && sch.id === s.id ? 'selected' : ''}>${formatScheduleLabel(s)}</option>`,
    )
    .join('');

  const historyTitle = 'Match History';

  view.innerHTML = `
    <div class="grid grid-cols-1 u-gap-12">
      <div class="card card--overlay">
        <h2>Schedule Selection</h2>
        <div class="grid u-gap-10">
          <label>Active Schedule</label>
          <select id="mm-schedule">${scheduleOptions}</select>
        </div>
        <hr class="sep" />
        <div class="row u-justify-start">
          <button class="btn primary" id="mm-add">+ Add Match</button>
          <button class="btn good" id="mm-suggest">⭐ See Suggestions</button>
        </div>
      </div>

      <div class="card card--overlay">
        <h2>${historyTitle}</h2>
        <div id="mm-history"></div>
      </div>
    </div>
  `;

  const renderHistory = () => {
    const current = getActiveSchedule();
    const history = $('#mm-history');
    if (!current) {
      history.innerHTML = `<div class="u-text-muted u-font-13">No active schedule selected.</div>`;
      return;
    }

    const scheduleMatches = appState.data.matches
      .filter((m) => m.scheduleId === current.id)
      .slice()
      .sort((a, b) => a.matchNumber - b.matchNumber);

    history.innerHTML =
      scheduleMatches.length === 0
        ? `<div class="u-text-muted u-font-13">No matches yet.</div>`
        : scheduleMatches
            .map((m) => {
              const playersText = `${m.playerNames.slice(0, 2).join(' & ')} ⚔ ${m.playerNames.slice(2, 4).join(' & ')}`;
              return `
                <div class="card card--muted u-mb-10">
                  <div class="row u-justify-between">
                    <div>
                      <strong class="u-text-muted">Match #${m.matchNumber}</strong>
                      <div class="u-mt-4">${playersText}</div>
                      <div class="u-mt-4 u-text-muted">
                        ⚾: <span data-shuttleval="${m.id}">${m.shuttlecockUsage?.shuttles ?? 0}</span>
                      </div>
                    </div>
                    <div class="row u-justify-end">
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
    const joinByPid = new Map((schedule.joins ?? []).map((j) => [j.playerId, { joinTime: j.joinTime, team: j.team ?? null }]));

    // Build candidates: players in active schedule only
    const candidates = (schedule.playerIds ?? [])
      .map((pid) => {
        const p = playerById.get(pid);
        const joinObj = joinByPid.get(pid);
        const joinTime = joinObj ? Number(joinObj.joinTime) : null;
        const team = joinObj?.team ?? null;
        if (!p) return null;
        return {
          id: pid,
          name: p.name,
          class: p.class,
          joinTime,
          played: playedCountByPlayerName[p.name] ?? 0,
          team,
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

    let currentTeamFilter = schedule.isSparringMode ? (schedule.teamA || null) : null;

    const candidatesByName = new Map(candidates.map((c) => [c.name, c]));

    const renderPickList = () => {
      const wrap = $('#mm-pick-list');
      if (!wrap) return;

      const filteredCandidates = !schedule.isSparringMode || !currentTeamFilter ? candidates : candidates.filter((c) => c.team === currentTeamFilter);

      // compute current counts per team from picks
      const counts = {};
      for (const name of picks) {
        const team = candidatesByName.get(name)?.team ?? null;
        counts[team] = (counts[team] ?? 0) + 1;
      }

      wrap.innerHTML = filteredCandidates
        .map((c) => {
          const picked = pickedSet.has(c.name);
          const maxReachedForTeam = schedule.isSparringMode && c.team != null && (counts[c.team] ?? 0) >= 2;
          const canPick = !picked && picks.length < 4 && !(schedule.isSparringMode && maxReachedForTeam);
          const buttonDisabled = !picked && !canPick;

          const btnClass = picked ? 'btn danger' : 'btn good';
          const btnText = picked ? 'Unpick' : 'Pick';

          return `
            <div class="card card--muted no-margin radius-14">
              <div class="row u-justify-between u-align-center">
                <div class="u-min-width-0">
                  <div class="fw-900 mb-4">
                    <span class="badge mr-05em">${c.class}</span> ${capitalizeEachWord(c.name)}
                  </div>
                  <div class="u-text-muted u-font-13 u-mt-4">
                    ${c.played} played.
                  </div>
                  <div class="u-text-muted u-font-13 u-mt-2">
                    Arrive: ${formatArrive(c.joinTime)}
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    class="${btnClass}"
                    data-pickname="${c.name}"
                    data-picknow="${picked ? '0' : '1'}"
                    data-team="${c.team ?? ''}"
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
      <div class="u-text-muted u-font-13 u-mb-10">
        Pick 4 players from the current active schedule (sorted by total matches played, then arrival).
      </div>

      <div id="mm-team-filter-wrap"></div>
      <div id="mm-pick-list" class="grid grid-cols-1 u-gap-10 maxh-52vh u-overflow-auto padding-right-6"></div>

      <div class="u-mt-12 u-border-top-subtle"></div>

      <div class="modal-actions u-mt-12">
        <button value="cancel" class="btn" id="mm-manual-cancel">Cancel</button>
        <button type="button" class="btn primary" id="mm-manual-save" disabled>+ Add Match</button>
      </div>
    `);

    const modal = $('#modal');

    // If sparring mode, wire up the team filter buttons (rendered above pick list)
    if (schedule.isSparringMode) {
      const teamAName = schedule.teamA || 'Team A';
      const teamBName = schedule.teamB || 'Team B';
      const wrap = $('#mm-team-filter-wrap');
      if (wrap) {
        wrap.innerHTML = `
          <div class="row u-gap-8 u-mb-8" id="mm-team-filter">
            <button type="button" class="btn primary" data-team="${teamAName}">${teamAName}</button>
            <button type="button" class="btn" data-team="${teamBName}">${teamBName}</button>
            <button type="button" class="btn" data-team="all">All</button>
          </div>
        `;

        const teamFilter = $('#mm-team-filter');
        teamFilter.addEventListener('click', (ev) => {
          const btn = ev.target?.closest?.('button[data-team]');
          if (!btn) return;
          const team = btn.getAttribute('data-team');
          if (team === 'all') currentTeamFilter = null;
          else currentTeamFilter = team;

          // update active styling
          $$('#mm-team-filter button').forEach((b) => b.classList.remove('primary'));
          if (team === 'all') teamFilter.querySelector('button[data-team="all"]').classList.add('primary');
          else btn.classList.add('primary');

          renderPickList();
        });
      }
    }

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

      if (!schedule.isSparringMode) {
        save.disabled = picks.length !== 4;
        return;
      }

      // For sparring mode, enable only when exactly 4 picks and distribution is 2/2
      const mapByName = new Map(candidates.map((c) => [c.name, c]));
      const teamAName = schedule.teamA || 'Team A';
      const teamBName = schedule.teamB || 'Team B';
      const counts = { [teamAName]: 0, [teamBName]: 0 };
      for (const name of picks) {
        const c = mapByName.get(name);
        if (!c || !c.team) {
          save.disabled = true;
          return;
        }
        if (c.team === teamAName) counts[teamAName]++;
        else if (c.team === teamBName) counts[teamBName]++;
      }

      save.disabled = !(picks.length === 4 && counts[teamAName] === 2 && counts[teamBName] === 2);
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

      if (sch2.isSparringMode) {
        const teamAName = sch2.teamA || 'Team A';
        const teamBName = sch2.teamB || 'Team B';
        const mapByName = new Map(candidates.map((c) => [c.name, c]));
        const counts = { [teamAName]: 0, [teamBName]: 0 };
        for (const name of picks) {
          const c = mapByName.get(name);
          if (!c || !c.team) return toast('All selected players must have a team');
          if (c.team === teamAName) counts[teamAName]++;
          else if (c.team === teamBName) counts[teamBName]++;
        }
        if (counts[teamAName] !== 2 || counts[teamBName] !== 2) return toast(`Select 2 players from ${teamAName} and 2 players from ${teamBName}`);
      }

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

    const teamALabel = current.isSparringMode ? (current.teamA || 'Team A') : 'Team A';
    const teamBLabel = current.isSparringMode ? (current.teamB || 'Team B') : 'Team B';

    const modalState = { blacklist: new Set() };

    openModal(`
      <h3 class="mb-8">Match Suggestions</h3>
      <div class="grid grid-cols-1 u-gap-12" id="mm-suggest-body">
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
              <div class="card card--muted u-mb-0">
                <div class="row u-justify-between">
                  <h2 class="u-h2-14">Suggestion #${s.suggestionNo}</h2>
                </div>

                <div class="u-mt-10 u-text-muted fw-800 u-font-12">${teamALabel}</div>
                <div class="row u-mt-6 u-gap-8">${teamAButtons}</div>

                <div class="u-mt-10 u-text-muted fw-800 u-font-12">${teamBLabel}</div>
                <div class="row u-mt-6 u-gap-8">${teamBButtons}</div>

                <div class="row u-justify-end u-mt-12">
                  <button class="btn good" data-pick="${s.suggestionNo}" type="button">Select This Match</button>
                </div>
              </div>
            `;
            })
            .join('');
        })()}
      </div>

      <div class="modal-actions u-mt-12">
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
            <div class="card card--muted u-mb-0">
              <div class="row u-justify-between">
                <h2 class="u-h2-14">Suggestion #${s.suggestionNo}</h2>
              </div>

              <div class="u-mt-10 u-text-muted fw-800 u-font-12">${teamALabel}</div>
              <div class="row u-mt-6">${s.teamA.join(' + ')}</div>
              <div class="row u-mt-6 u-gap-8">${teamAButtons}</div>

              <div class="u-mt-10 u-text-muted fw-800 u-font-12">${teamBLabel}</div>
              <div class="row u-mt-6">${s.teamB.join(' + ')}</div>
              <div class="row u-mt-6 u-gap-8">${teamBButtons}</div>

              <div class="row u-justify-end u-mt-12">
                <button class="btn good" data-pick="${s.suggestionNo}" type="button">Select This Match</button>
              </div>
            </div>
          `;
        })
        .join('');
    };

    const onSuggestModalClick = async (e) => {
      const skipBtn = e.target?.closest?.('button[data-skip]');
      const skipName = skipBtn?.getAttribute('data-skip');
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

      const pickBtn = e.target?.closest?.('button[data-pick]');
      const pickNo = pickBtn?.getAttribute('data-pick');
      if (!pickNo) return;

      e.preventDefault();
      e.stopPropagation();
      if (pickBtn.disabled) return;
      pickBtn.disabled = true;

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
    };

    modal.addEventListener('click', onSuggestModalClick);
    modal.addEventListener('close', () => modal.removeEventListener('click', onSuggestModalClick), { once: true });
  });

  view.onclick = async (e) => {
    const action = e.target?.closest?.('button[data-cancel], button[data-shuttle-plus], button[data-shuttle-minus]');
    if (!action) return;

    const cancelId = action.getAttribute('data-cancel');
    const plusId = action.getAttribute('data-shuttle-plus');
    const minusId = action.getAttribute('data-shuttle-minus');

    const current = getActiveSchedule();
    if (!current?.id) {
      toast('Select a schedule first');
      return;
    }

    if (cancelId) {
      if (!(await confirmDialog('Cancel this match?', { title: 'Cancel Match', okText: 'OK', danger: true }))) return;

      appState.data.matches = appState.data.matches.filter((m) => m.id !== cancelId);

      appState.data.payments = appState.data.payments.filter((p) => p.scheduleId !== current.id);
      await autoEnsurePaymentsForSchedule(current.id);

      await storage.saveAll(appState.data);
      await refreshAll();
      toast('Cancelled');
      return;
    }

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
  };

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
        <div class="card card--overlay u-mb-10">
          <h2>Match Suggestions</h2>
          <div id="suggestions"></div>
          <div class="u-text-muted u-font-13 u-mt-8">
            Open this page to refresh suggestions.
          </div>
        </div>
        <div class="card card--overlay">
          <h2>Selected Matches</h2>
          <div id="selected-matches"></div>
        </div>
      </div>

      <div>
        <div class="card card--overlay">
          <h2>Match History (played)</h2>
          <div id="history"></div>
        </div>
      </div>
    </div>
  `;

  const suggestions = suggestMatchesForSchedule({ schedule: sch, allPlayers: appState.data.players, matches: appState.data.matches });

  const teamALabel = sch.isSparringMode ? (sch.teamA || 'Team A') : 'Team A';
  const teamBLabel = sch.isSparringMode ? (sch.teamB || 'Team B') : 'Team B';

  $('#suggestions').innerHTML = suggestions
    .map((s) => {
      const teamAPlayers = s.teamA.map((name) => `<button class="btn" data-skip="${name}" data-suggestion="${s.suggestionNo}">Skip ${name}</button>`).join('');
      const teamBPlayers = s.teamB.map((name) => `<button class="btn" data-skip="${name}" data-suggestion="${s.suggestionNo}">Skip ${name}</button>`).join('');

      return `
        <div class="card card--muted u-mb-10">
          <div class="row u-justify-between">
            <h2 class="u-h2-14">Suggestion #${s.suggestionNo}</h2>
            <div class="pill">Balance: ${s.overallBalanceScore}</div>
          </div>
          <div class="grid u-mt-10 u-gap-8">
            <div><div class="u-text-muted fw-800 u-font-12">${teamALabel}</div><div class="row">${s.teamA.join(' + ')}</div></div>
            <div class="row">${teamAPlayers}</div>
            <div><div class="u-text-muted fw-800 u-font-12 u-mt-6">${teamBLabel}</div><div class="row">${s.teamB.join(' + ')}</div></div>
            <div class="row">${teamBPlayers}</div>
          </div>
          <div class="row u-justify-end u-mt-10">
            <button class="btn good" data-pick="${s.suggestionNo}">Select This Match</button>
          </div>
        </div>
      `;
    })
    .join('');

  // Selected matches: in this implementation, "Select" immediately plays and stores match.
  $('#selected-matches').innerHTML = `
    <div class="u-text-muted u-font-13">Selecting a suggestion will add it to history immediately.</div>
  `;

  const historyHtml = scheduleMatches
    .map((m) => {
      const playersText = `${m.playerNames.slice(0, 2).join(' + ')} vs ${m.playerNames.slice(2, 4).join(' + ')}`;
      return `
        <div class="card card--muted u-mb-10">
          <div class="row u-justify-between">
            <div>
              <strong>Match #${m.matchNumber}</strong>
              <div class="u-text-muted u-font-13 u-mt-4">${playersText}</div>
              <div class="u-text-muted u-font-13 u-mt-4">Shuttlecock: ${m.shuttlecockUsage?.shuttles ?? 0}</div>
            </div>
            <div class="row u-justify-end">
              <button class="btn" data-shuttle-minus="${m.id}" title="Decrement shuttles">[-1 Shuttlecock Logo]</button>
              <button class="btn good" data-shuttle-plus="${m.id}" title="Increment shuttles">[+1 Shuttlecock Logo]</button>
              <button class="btn danger" data-cancel="${m.id}" title="Cancel match">[X Cancel]</button>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  $('#history').innerHTML = historyHtml || `<div class="u-text-muted u-font-13">No matches selected yet.</div>`;

  appState._latestSuggestions = suggestions;

  wrap.onclick = async (e) => {
    const action = e.target?.closest?.('button[data-pick], button[data-cancel], button[data-skip]');
    if (!action) return;

    const pickNo = action.getAttribute('data-pick');
    if (pickNo) {
      const sch2 = getActiveSchedule();
      if (!sch2) return;
      const latest = appState._latestSuggestions ?? [];
      const pick = latest.find((x) => x.suggestionNo === Number(pickNo));
      if (!pick) return;

      action.disabled = true;

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

    const cancelId = action.getAttribute('data-cancel');
    if (cancelId) {
      if (!(await confirmDialog('Cancel this match?', { title: 'Cancel Match', okText: 'OK', danger: true }))) return;
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

    const skipName = action.getAttribute('data-skip');
    const skipSug = action.getAttribute('data-suggestion');
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

      const teamALabel = currentSch.isSparringMode ? (currentSch.teamA || 'Team A') : 'Team A';
      const teamBLabel = currentSch.isSparringMode ? (currentSch.teamB || 'Team B') : 'Team B';

      $('#suggestions').innerHTML = updated
        .map((s) => {
          const teamAButtons = s.teamA
            .map((name) => `<button class="btn" data-skip="${name}" data-suggestion="${s.suggestionNo}">Skip ${name}</button>`)
            .join('');
          const teamBButtons = s.teamB
            .map((name) => `<button class="btn" data-skip="${name}" data-suggestion="${s.suggestionNo}">Skip ${name}</button>`)
            .join('');
          return `
            <div class="card card--muted u-mb-10">
              <div class="row u-justify-between">
                <h2 class="u-h2-14">Suggestion #${s.suggestionNo}</h2>
                <div class="pill">Balance: ${s.overallBalanceScore}</div>
              </div>
              <div class="grid u-mt-10 u-gap-8">
                <div><div class="u-text-muted fw-800 u-font-12">${teamALabel}</div><div class="row">${s.teamA.join(' + ')}</div></div>
                <div class="row">${teamAButtons}</div>
                <div><div class="u-text-muted fw-800 u-font-12 u-mt-6">${teamBLabel}</div><div class="row">${s.teamB.join(' + ')}</div></div>
                <div class="row">${teamBButtons}</div>
              </div>
              <div class="row u-justify-end u-mt-10">
                <button class="btn good" data-pick="${s.suggestionNo}">Select This Match</button>
              </div>
            </div>
          `;
        })
        .join('');

      appState._latestSuggestions = updated;
      toast('Player skipped');
    }
  };
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

  // Map join info to get team per player (if available)
  const joinMap = new Map((schedule.joins ?? []).map((j) => [j.playerId, { joinTime: Number(j.joinTime), team: j.team ?? null }]));

  const candidates = allPlayers
    .filter((p) => schedulePlayerSet.has(p.id) && !blacklist.has(p.name))
    .map((p) => ({
      ...p,
      played: playedCountsByName[p.name] ?? 0,
      team: joinMap.get(p.id)?.team ?? null,
    }));

  candidates.sort((p1, p2) => {
    const c1 = playedCountsByName[p1.name] ?? 0;
    const c2 = playedCountsByName[p2.name] ?? 0;
    if (c1 !== c2) return c1 - c2;
    return getPlayerComfortRank(p1) - getPlayerComfortRank(p2);
  });

  const suggestions = [];
  const usedCombos = new Set();

  if (schedule.isSparringMode) {
    const teamAName = schedule.teamA || 'Team A';
    const teamBName = schedule.teamB || 'Team B';
    const teamAList = candidates.filter((c) => c.team === teamAName);
    const teamBList = candidates.filter((c) => c.team === teamBName);

    for (let i = 0; i < teamAList.length; i++) {
      for (let j = i + 1; j < teamAList.length; j++) {
        for (let k = 0; k < teamBList.length; k++) {
          for (let l = k + 1; l < teamBList.length; l++) {
            if (suggestions.length >= 30) break;
            const pa1 = teamAList[i];
            const pa2 = teamAList[j];
            const pb1 = teamBList[k];
            const pb2 = teamBList[l];
            const ids = [pa1.id, pa2.id, pb1.id, pb2.id].slice().sort().join('|');
            if (usedCombos.has(ids)) continue;
            usedCombos.add(ids);

            const teamAPlayers = [pa1, pa2];
            const teamBPlayers = [pb1, pb2];
            const fairness = teamAPlayers.concat(teamBPlayers).reduce((acc, p) => acc + (playedCountsByName[p.name] ?? 0), 0);
            const balance = balanceScoreForTeams({ teamA: teamAPlayers, teamB: teamBPlayers });
            const overall = balance * 100 + fairness;

            suggestions.push({ teamA: [pa1.name, pa2.name], teamB: [pb1.name, pb2.name], overallBalanceScore: overall, shuttlecockUsage: { shuttles: 2 }, _meta: { ids } });
          }
        }
      }
    }
  } else {
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
      <div class="grid u-gap-10">
        ${unpaid.length
          ? unpaid
              .map(
                (p) => `
                  <div class="card payment-card card--muted no-margin">
                    <div class="row u-justify-between u-align-start u-gap-12">
                      <div class="u-min-width-0">
                        <div class="fw-900 u-font-15 lh-13">
                          ${p.playerName} - ${formatScheduleLabel(scheduleById.get(p.scheduleId))}
                        </div>
                        <div class="u-mt-6 u-text-muted u-font-13">
                          Shuttlecock: ${p.shuttlecockUsage?.shuttles ?? 0} (${`Rp${p.totalPayment.toLocaleString('id-ID')}`})
                        </div>
                      </div>
                    </div>
                    <div class="row u-justify-start u-mt-12">
                      <button class="btn good" data-pay="${p.id}">Pay</button>
                      <button class="btn" data-collect="${p.id}">Collect Payment</button>
                    </div>
                  </div>
                `,
              )
              .join('')
          : `<div class="u-text-muted u-font-13">No unpaid payments 🎉</div>`}
      </div>
    </div>
  `;

  view.onclick = (e) => {
    const payId = e.target?.getAttribute?.('data-pay');
    const collectId = e.target?.getAttribute?.('data-collect');
    if (payId) {
      const p = appState.data.payments.find((x) => x.id === payId);
      if (!p) return;
      openModal(`
        <h3>Set Payment Method</h3>
        <div class="grid u-gap-10">
          <div>
            <label>Choose method</label>
            <div class="row">
              <button type="button" class="btn primary" id="pm-cash">Cash</button>
              <button type="button" class="btn primary" id="pm-tf">Transfer (TF)</button>
            </div>
          </div>
          <div class="u-text-muted u-font-13">Player: <strong>${p.playerName}</strong></div>
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
  };

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
        <div class="u-text-muted u-font-13 u-mb-10">Copy each JSON file content below and save as the corresponding local files.</div>
        <div class="grid u-gap-10">
          <div><label>players.json</label><textarea id="ex-players"></textarea></div>
          <div><label>schedules.json</label><textarea id="ex-schedules"></textarea></div>
          <div><label>matches.json</label><textarea id="ex-matches"></textarea></div>
          <div><label>payments.json</label><textarea id="ex-payments"></textarea></div>
        </div>
      </div>
      <div class="card">
        <h2>Import JSON</h2>
        <div class="u-text-muted u-font-13 u-mb-10">Paste JSON arrays for each file then Import.</div>
        <div class="grid u-gap-10">
          <div><label>players.json</label><textarea id="im-players"></textarea></div>
          <div><label>schedules.json</label><textarea id="im-schedules"></textarea></div>
          <div><label>matches.json</label><textarea id="im-matches"></textarea></div>
          <div><label>payments.json</label><textarea id="im-payments"></textarea></div>
        </div>
        <div class="modal-actions u-mt-12">
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
    if (!(await confirmDialog('Reset all local data in this browser?', { title: 'Reset All Data', okText: 'OK', danger: true }))) return;
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

  const closeNavigationDrawer = setupNavigationDrawer();

  // Setup nav
  $$('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
      closeNavigationDrawer();
    });
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



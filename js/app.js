import { loadAllData } from './data.js';
import { debounce, downloadText, safeJsonParse, cleanText } from './util.js';
import { loadPdfFieldMap, buildFilledFields, renderOverlay, openPrintWindow } from './pdf.js';

const APP_VERSION = '0.0.2';
const LS_KEY = 'm616_char_site_state_v1';

// Debounced persistence (set after state is initialized)
let persist = ()=>{};

const DEFAULT_STATE = {
  codename: '',
  rank: 1,

  realName: '',
  height: '',
  weight: '',
  gender: '',
  eyes: '',
  hair: '',
  size: '',
  distinguishingFeatures: '',

  karma: '',
  health: '',
  healthDR: '0',
  focus: '',
  focusDR: '0',
  init: '',

  moveRun: '',
  moveClimb: '',
  moveSwim: '',
  moveOther: '',

  occupationId: '',
  occupationName: '',
  originId: '',
  originName: '',

  teams: '',
  base: '',
  history: '',
  personality: '',

  abilities: {
    mle: { value: 0, defense: '', noncom: 0, damageMultiplier: '' },
    agl: { value: 0, defense: '', noncom: 0, damageMultiplier: '' },
    res: { value: 0, defense: '', noncom: 0, damageMultiplier: '' },
    vig: { value: 0, defense: '', noncom: 0, damageMultiplier: '' },
    ego: { value: 0, defense: '', noncom: 0, damageMultiplier: '' },
    log: { value: 0, defense: '', noncom: 0, damageMultiplier: '' },
  },

  traits: [],
  tags: [],
  powers: [],
};

function loadState(){
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return structuredClone(DEFAULT_STATE);
  try{
    const parsed = JSON.parse(raw);
    return { ...structuredClone(DEFAULT_STATE), ...parsed };
  }catch{
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState(s){
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

function abilityDefense(v){
  return String(10 + (Number(v)||0));
}

function normalizeAbility(abl){
  const v = Number(abl.value ?? 0);
  return {
    ...abl,
    value: Number.isFinite(v) ? v : 0,
    defense: (abl.defense === '' || abl.defense == null) ? abilityDefense(v) : String(abl.defense),
    noncom: Number(abl.noncom ?? 0) || 0,
  };
}

function computeSelections(state, data){
  const byId = (arr) => Object.fromEntries(arr.map(i=>[i.id, i]));
  const traitsById = byId(data.traits);
  const tagsById = byId(data.tags);
  const powersById = byId(data.powers);
  state.traitsSelected = state.traits.map(id => traitsById[id]).filter(Boolean);
  state.tagsSelected = state.tags.map(id => tagsById[id]).filter(Boolean);
  state.powersSelected = state.powers.map(id => powersById[id]).filter(Boolean);
}

function el(html){
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function setStepActive(stepIndex){
  const items = document.querySelectorAll('.stepItem');
  items.forEach((it, idx)=>{
    it.classList.toggle('stepItem--active', idx === stepIndex);
  });
}

function pills(selected, onRemove){
  const wrap = el('<div class="pills"></div>');
  for (const s of selected){
    const p = el(`<div class="pill">${s.name}<button title="remover">✕</button></div>`);
    p.querySelector('button').addEventListener('click', ()=>onRemove(s));
    wrap.appendChild(p);
  }
  return wrap;
}

function listWidget({ title, hint, items, selectedIds, onAdd, filters }){
  const root = el(`
    <div class="list">
      <div class="listHeader">
        <div>
          <div style="font-weight:750">${title}</div>
          <div class="muted">${hint}</div>
        </div>
        <div class="muted">Selecionados: <b>${selectedIds.length}</b></div>
      </div>
      <div class="listBody"></div>
    </div>
  `);
  const body = root.querySelector('.listBody');

  for (const it of items){
    const desc = cleanText(it.description || '');
    const tag = it.powerSet ? `<span class="itemRow__tag">${it.powerSet}</span>` : '';
    const row = el(`
      <div class="itemRow">
        <button class="btn" style="padding:6px 10px">Adicionar</button>
        <div class="itemRow__meta">
          <div class="itemRow__name">${it.name}</div>
          <div class="itemRow__desc">${desc}</div>
        </div>
        ${tag}
      </div>
    `);

    const btn = row.querySelector('button');
    const already = selectedIds.includes(it.id);
    if (already){
      btn.textContent = '✓';
      btn.disabled = true;
      btn.style.opacity = '0.6';
    }
    btn.addEventListener('click', ()=>onAdd(it));
    body.appendChild(row);
  }

  return root;
}

function stepBasics(state, data, rerender){
  const root = el(`<div class="card">
    <div class="grid2">
      <div class="field"><label>Codename</label><input id="codename" placeholder="Ex.: Override" /></div>
      <div class="field"><label>Rank</label>
        <select id="rank">
          <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option>
        </select>
      </div>
    </div>

    <div class="hr"></div>

    <div class="grid2">
      <div class="field"><label>Real name</label><input id="realName" /></div>
      <div class="field"><label>Gender</label><input id="gender" /></div>
      <div class="field"><label>Height</label><input id="height" placeholder="Ex.: 1,80m" /></div>
      <div class="field"><label>Weight</label><input id="weight" placeholder="Ex.: 82kg" /></div>
      <div class="field"><label>Eyes</label><input id="eyes" /></div>
      <div class="field"><label>Hair</label><input id="hair" /></div>
      <div class="field"><label>Size</label><input id="size" placeholder="Ex.: Medium" /></div>
      <div class="field"><label>Distinguishing Features</label><input id="dist" /></div>
    </div>
  </div>`);

  const bind = (id, key) => {
    const input = root.querySelector(id);
    input.value = state[key] ?? '';
    input.addEventListener('input', ()=>{ state[key] = input.value; persist(); });
  };

  bind('#codename', 'codename');
  const rank = root.querySelector('#rank');
  rank.value = String(state.rank ?? 1);
  rank.addEventListener('change', ()=>{ state.rank = Number(rank.value)||1; persist(); });

  bind('#realName','realName');
  bind('#gender','gender');
  bind('#height','height');
  bind('#weight','weight');
  bind('#eyes','eyes');
  bind('#hair','hair');
  bind('#size','size');
  bind('#dist','distinguishingFeatures');

  return root;
}

function stepNumbers(state, data, rerender){
  const root = el(`<div class="card">
    <div class="grid3">
      <div class="field"><label>Karma</label><input id="karma" placeholder="Ex.: 10" /></div>
      <div class="field"><label>Health</label><input id="health" placeholder="Ex.: 30" /></div>
      <div class="field"><label>Focus</label><input id="focus" placeholder="Ex.: 20" /></div>
      <div class="field"><label>Health DR</label><input id="hdr" placeholder="Ex.: -2" /></div>
      <div class="field"><label>Focus DR</label><input id="fdr" placeholder="Ex.: -1" /></div>
      <div class="field"><label>Initiative</label><input id="init" placeholder="Ex.: 1E" /></div>
    </div>

    <div class="hr"></div>

    <div class="grid2">
      <div class="field"><label>Run</label><input id="run" placeholder="Ex.: 30" /></div>
      <div class="field"><label>Climb</label><input id="climb" placeholder="Ex.: 10" /></div>
      <div class="field"><label>Swim</label><input id="swim" placeholder="Ex.: 10" /></div>
      <div class="field"><label>Other (Jump/Flight/Glide)</label><input id="other" placeholder="Ex.: 60" /></div>
    </div>

    <div class="hr"></div>

    <div class="notice muted">
      Dica: se você não souber os valores de Health/Focus/Karma, pode preencher depois. O PDF será gerado do jeito que estiver.
    </div>
  </div>`);

  const bind = (id, key) => {
    const input = root.querySelector(id);
    input.value = state[key] ?? '';
    input.addEventListener('input', ()=>{ state[key] = input.value; persist(); });
  };

  bind('#karma','karma');
  bind('#health','health');
  bind('#focus','focus');
  bind('#hdr','healthDR');
  bind('#fdr','focusDR');
  bind('#init','init');

  bind('#run','moveRun');
  bind('#climb','moveClimb');
  bind('#swim','moveSwim');
  bind('#other','moveOther');

  return root;
}

function stepAbilities(state, data, rerender){
  const root = el(`<div class="card">
    <div class="muted">Valores: Melee, Agility, Resilience, Vigilance, Ego, Logic. Defesa é normalmente <b>10 + valor</b>.</div>
    <div class="hr"></div>

    <div class="grid2" id="grid"></div>

    <div class="hr"></div>
    <div class="muted">Damage Multiplier: preencha se você usa esse campo na sua mesa (opcional).</div>
  </div>`);

  const grid = root.querySelector('#grid');
  const order = [
    ['mle','Melee'], ['agl','Agility'], ['res','Resilience'], ['vig','Vigilance'], ['ego','Ego'], ['log','Logic']
  ];

  function cardFor(key, label){
    const a = normalizeAbility(state.abilities[key] || {});
    state.abilities[key] = a;

    const c = el(`<div class="card" style="box-shadow:none; background: rgba(11,13,18,.35)">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <div style="font-weight:800">${label}</div>
        <div class="muted" data-def>Def: ${a.defense}</div>
      </div>
      <div class="grid3" style="margin-top:10px">
        <div class="field"><label>Value</label><input data-k="value" type="number" /></div>
        <div class="field"><label>Defense</label><input data-k="defense" /></div>
        <div class="field"><label>Non-combat</label><input data-k="noncom" type="number" /></div>
      </div>
      <div class="field" style="margin-top:10px"><label>Damage Multiplier (opcional)</label><input data-k="damageMultiplier" /></div>
    </div>`);

    for (const input of c.querySelectorAll('input')){
      const k = input.dataset.k;
      input.value = a[k] ?? '';
      input.addEventListener('input', ()=>{
        a[k] = input.type === 'number' ? (Number(input.value)||0) : input.value;
        if (k === 'value' && (a.defense === '' || a.defense == null)) a.defense = abilityDefense(a.value);
        // if defense blank, auto compute
        if (k === 'value') a.defense = abilityDefense(a.value);
        state.abilities[key] = normalizeAbility(a);
        // Update the small header display without re-rendering the whole step.
        const defEl = c.querySelector('[data-def]');
        if (defEl) defEl.textContent = `Def: ${state.abilities[key].defense}`;
        persist();
      });
    }

    return c;
  }

  for (const [k, label] of order){
    grid.appendChild(cardFor(k,label));
  }

  return root;
}

function stepOccupationOrigin(state, data, rerender){
  const root = el(`<div class="card">
    <div class="grid2">
      <div class="field"><label>Occupation</label><select id="occ"></select></div>
      <div class="field"><label>Origin</label><select id="ori"></select></div>
    </div>
    <div class="hr"></div>
    <div class="grid2">
      <div class="card" style="box-shadow:none; background: rgba(11,13,18,.35)">
        <div style="font-weight:800">Descrição (Occupation)</div>
        <div id="occDesc" class="muted" style="margin-top:6px; white-space:pre-wrap"></div>
      </div>
      <div class="card" style="box-shadow:none; background: rgba(11,13,18,.35)">
        <div style="font-weight:800">Descrição (Origin)</div>
        <div id="oriDesc" class="muted" style="margin-top:6px; white-space:pre-wrap"></div>
      </div>
    </div>

    <div class="hr"></div>
    <div class="grid2">
      <div class="field"><label>Teams</label><input id="teams" placeholder="Ex.: The Genesis-X" /></div>
      <div class="field"><label>Base</label><input id="base" placeholder="Ex.: Xavier Mansion" /></div>
      <div class="field"><label>History</label><textarea id="history"></textarea></div>
      <div class="field"><label>Personality</label><textarea id="personality"></textarea></div>
    </div>
  </div>`);

  const occSel = root.querySelector('#occ');
  const oriSel = root.querySelector('#ori');
  const occDesc = root.querySelector('#occDesc');
  const oriDesc = root.querySelector('#oriDesc');

  function fillOptions(sel, items, currentId){
    sel.innerHTML = '';
    sel.appendChild(el(`<option value="">— selecione —</option>`));
    for (const it of items){
      sel.appendChild(el(`<option value="${it.id}">${it.name}</option>`));
    }
    sel.value = currentId || '';
  }

  fillOptions(occSel, data.occupations, state.occupationId);
  fillOptions(oriSel, data.origins, state.originId);

  function refreshDescs(){
    const occ = data.occupations.find(o=>o.id===state.occupationId);
    const ori = data.origins.find(o=>o.id===state.originId);
    occDesc.textContent = occ ? (occ.description || '') : '';
    oriDesc.textContent = ori ? (ori.description || '') : '';
  }

  occSel.addEventListener('change', ()=>{
    state.occupationId = occSel.value;
    const occ = data.occupations.find(o=>o.id===state.occupationId);
    state.occupationName = occ?.name || '';
    refreshDescs();
    persist();
  });
  oriSel.addEventListener('change', ()=>{
    state.originId = oriSel.value;
    const ori = data.origins.find(o=>o.id===state.originId);
    state.originName = ori?.name || '';
    refreshDescs();
    persist();
  });

  // prefill names
  if (!state.occupationName){
    const occ = data.occupations.find(o=>o.id===state.occupationId);
    state.occupationName = occ?.name || '';
  }
  if (!state.originName){
    const ori = data.origins.find(o=>o.id===state.originId);
    state.originName = ori?.name || '';
  }

  refreshDescs();

  const bind = (id, key) => {
    const input = root.querySelector(id);
    input.value = state[key] ?? '';
    input.addEventListener('input', ()=>{ state[key] = input.value; persist(); });
  };

  bind('#teams','teams');
  bind('#base','base');
  bind('#history','history');
  bind('#personality','personality');

  return root;
}

function makePickStep({ kind, title, hint, sourceList, stateKey, extraFilters }){
  return function stepPick(state, data, rerender){
    const root = el(`<div class="card">
      <div class="searchRow">
        <div class="field"><label>Buscar</label><input id="q" placeholder="Digite para filtrar…" /></div>
        ${extraFilters ? `<div class="field"><label>${extraFilters.label}</label><select id="f"></select></div>` : ''}
      </div>
      <div class="hr"></div>
      <div id="selected"></div>
      <div class="hr"></div>
      <div id="list"></div>
    </div>`);

    const q = root.querySelector('#q');
    const selectedEl = root.querySelector('#selected');
    const listEl = root.querySelector('#list');

    const getList = ()=>{
      if (kind === 'powers') return data.powers;
      if (kind === 'traits') return data.traits;
      if (kind === 'tags') return data.tags;
      return [];
    };

    function renderSelected(){
      const selectedIds = state[stateKey] || [];
      const selectedItems = getList().filter(i=>selectedIds.includes(i.id));
      selectedEl.innerHTML = '';
      selectedEl.appendChild(pills(selectedItems, (it)=>{
        state[stateKey] = (state[stateKey]||[]).filter(id=>id!==it.id);
        rerender(true);
      }));
    }

    function renderList(){
      const selectedIds = state[stateKey] || [];
      const needle = cleanText(q.value).toLowerCase();
      let items = getList();

      if (extraFilters){
        const sel = root.querySelector('#f');
        const val = sel.value;
        if (val) items = items.filter(i => (i.powerSet||'') === val);
      }

      if (needle){
        items = items.filter(i => (i.name||'').toLowerCase().includes(needle) || (i.description||'').toLowerCase().includes(needle));
      }

      // limit for perf
      items = items.slice(0, 250);

      listEl.innerHTML = '';
      listEl.appendChild(listWidget({
        title,
        hint,
        items,
        selectedIds,
        onAdd: (it)=>{
          if (selectedIds.includes(it.id)) return;
          state[stateKey] = [...selectedIds, it.id];
          rerender(true);
        }
      }));
    }

    if (extraFilters){
      const sel = root.querySelector('#f');
      sel.innerHTML = '';
      sel.appendChild(el(`<option value="">— todos —</option>`));
      for (const ps of data.powerSets){
        sel.appendChild(el(`<option value="${ps}">${ps}</option>`));
      }
      sel.addEventListener('change', ()=>renderList());
    }

    q.addEventListener('input', debounce(()=>renderList(), 120));

    renderSelected();
    renderList();

    return root;
  };
}

function stepPreview(state, data, rerender, fieldMap){
  const root = el(`<div class="card previewWrap">
    <div class="muted">Prévia rápida (o posicionamento depende do navegador e pode variar levemente). Use <b>Gerar PDF (Imprimir)</b> para o arquivo final.</div>
    <div class="previewCanvas">
      <div class="previewSheet" id="sheet">
        <img src="assets/template.png" alt="Template" />
      </div>
    </div>
  </div>`);

  const sheet = root.querySelector('#sheet');
  computeSelections(state, data);
  const filled = buildFilledFields(state);
  renderOverlay(sheet, fieldMap, filled);

  return root;
}

// ---------------- App bootstrap ----------------
const STEPS = [
  { key:'basics', title:'Identidade', hint:'Codename, Rank e dados básicos.' },
  { key:'numbers', title:'Valores & Movimento', hint:'Karma / Health / Focus / Initiative e deslocamentos.' },
  { key:'abilities', title:'Abilities', hint:'Valores, defesas e bônus fora de combate.' },
  { key:'occori', title:'Occupation & Origin', hint:'Selecione Occupation e Origin, e escreva histórico/personality.' },
  { key:'traits', title:'Traits', hint:'Selecione os traits do personagem.' },
  { key:'tags', title:'Tags', hint:'Selecione as tags do personagem.' },
  { key:'powers', title:'Powers', hint:'Selecione poderes (pode filtrar por Power Set).' },
  { key:'preview', title:'Prévia & PDF', hint:'Confira e gere o PDF via impressão.' },
];

let state = loadState();

// Optional: open the site with ?reset=1 (or ?clear=1) to start from scratch.
try{
  const params = new URLSearchParams(location.search);
  if (params.has('reset') || params.has('clear')){
    localStorage.removeItem(LS_KEY);
    state = structuredClone(DEFAULT_STATE);
    // remove query string so refresh won't keep resetting
    history.replaceState({}, document.title, location.pathname);
  }
}catch{}

persist = debounce(()=>saveState(state), 250);
let data = null;
let fieldMap = null;
let stepIndex = 0;

const els = {
  steps: document.getElementById('steps'),
  loading: document.getElementById('loading'),
  app: document.getElementById('app'),
  stepTitle: document.getElementById('stepTitle'),
  stepHint: document.getElementById('stepHint'),
  stepBody: document.getElementById('stepBody'),
  btnPrev: document.getElementById('btnPrev'),
  btnNext: document.getElementById('btnNext'),
  btnPrint: document.getElementById('btnPrint'),
  btnExport: document.getElementById('btnExport'),
  btnImport: document.getElementById('btnImport'),
  btnReset: document.getElementById('btnReset'),
  fileImport: document.getElementById('fileImport'),
};

function renderSteps(){
  els.steps.innerHTML = '';
  STEPS.forEach((s, idx)=>{
    const li = document.createElement('li');
    li.className = 'stepItem' + (idx===stepIndex ? ' stepItem--active' : '');
    li.innerHTML = `<div class="stepItem__k">${idx+1}</div><div class="stepItem__t">${s.title}</div>`;
    li.addEventListener('click', ()=>{ stepIndex = idx; render(); });
    els.steps.appendChild(li);
  });
}

function render(save=true){
  if (save) saveState(state);
  renderSteps();
  setStepActive(stepIndex);

  const s = STEPS[stepIndex];
  els.stepTitle.textContent = s.title;
  els.stepHint.textContent = s.hint;

  els.btnPrev.disabled = stepIndex === 0;
  els.btnNext.disabled = stepIndex === STEPS.length - 1;

  els.stepBody.innerHTML = '';

  // ensure abilities normalized
  for (const k of Object.keys(state.abilities||{})){
    state.abilities[k] = normalizeAbility(state.abilities[k]);
  }

  const rerender = (saveNow=true)=>render(saveNow);

  const stepKey = s.key;
  let node = null;

  if (stepKey === 'basics') node = stepBasics(state, data, rerender);
  else if (stepKey === 'numbers') node = stepNumbers(state, data, rerender);
  else if (stepKey === 'abilities') node = stepAbilities(state, data, rerender);
  else if (stepKey === 'occori') node = stepOccupationOrigin(state, data, rerender);
  else if (stepKey === 'traits') node = makePickStep({ kind:'traits', title:'Traits', hint:'Use a busca para filtrar (máx. 250 por vez).', stateKey:'traits' })(state, data, rerender);
  else if (stepKey === 'tags') node = makePickStep({ kind:'tags', title:'Tags', hint:'Use a busca para filtrar (máx. 250 por vez).', stateKey:'tags' })(state, data, rerender);
  else if (stepKey === 'powers') node = makePickStep({ kind:'powers', title:'Powers', hint:'Use a busca e/ou filtre por Power Set.', stateKey:'powers', extraFilters:{ label:'Power Set' } })(state, data, rerender);
  else if (stepKey === 'preview') node = stepPreview(state, data, rerender, fieldMap);

  if (node) els.stepBody.appendChild(node);
}

function doPrint(){
  computeSelections(state, data);
  const filled = buildFilledFields(state);
  openPrintWindow(fieldMap, filled);
}

function exportJson(){
  const out = structuredClone(state);
  // remove computed
  delete out.traitsSelected;
  delete out.tagsSelected;
  delete out.powersSelected;
  downloadText('m616-character.json', JSON.stringify(out, null, 2));
}

function importJsonFile(file){
  const reader = new FileReader();
  reader.onload = ()=>{
    const parsed = safeJsonParse(reader.result);
    if (!parsed){
      alert('JSON inválido.');
      return;
    }
    state = { ...structuredClone(DEFAULT_STATE), ...parsed };
    render(true);
  };
  reader.readAsText(file, 'utf-8');
}

els.btnPrev.addEventListener('click', ()=>{ if (stepIndex>0){ stepIndex--; render(); } });
els.btnNext.addEventListener('click', ()=>{ if (stepIndex<STEPS.length-1){ stepIndex++; render(); } });
els.btnPrint.addEventListener('click', doPrint);
els.btnExport.addEventListener('click', exportJson);
els.btnImport.addEventListener('click', ()=>els.fileImport.click());
els.btnReset?.addEventListener('click', ()=>{
  const ok = confirm('Apagar os dados salvos neste navegador e recomeçar do zero?');
  if (!ok) return;
  localStorage.removeItem(LS_KEY);
  state = structuredClone(DEFAULT_STATE);
  stepIndex = 0;
  render(true);
});
els.fileImport.addEventListener('change', ()=>{
  const f = els.fileImport.files?.[0];
  if (f) importJsonFile(f);
  els.fileImport.value = '';
});

(async function boot(){
  try{
    [data, fieldMap] = await Promise.all([loadAllData(), loadPdfFieldMap()]);

    // show
    els.loading.classList.add('hidden');
    els.app.classList.remove('hidden');

    // reconcile stored occupation/origin names
    if (state.occupationId && !state.occupationName){
      const occ = data.occupations.find(o=>o.id===state.occupationId);
      state.occupationName = occ?.name || '';
    }
    if (state.originId && !state.originName){
      const ori = data.origins.find(o=>o.id===state.originId);
      state.originName = ori?.name || '';
    }

    render(true);
  }catch(e){
    console.error(e);
    els.loading.innerHTML = `<div class="card">Erro ao carregar dados: ${String(e?.message||e)}</div>`;
  }
})();

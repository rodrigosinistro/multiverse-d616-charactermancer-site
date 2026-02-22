/* Multiverse D616 — Charactermancer Site
 * Web port based on the Foundry module: marvel-multiverse-charactermancer v0.1.3
 * Site version: v0.0.10
 */

(function(){
  'use strict';

  const SITE_VERSION = '0.0.11';
  const ROOT_ID = 'mmc-root';

  // ---------- Tiny "Foundry-like" stubs (to keep the original code structure) ----------
  const deepClone = (obj)=> {
    try{ return structuredClone(obj); }catch(_){ return JSON.parse(JSON.stringify(obj)); }
  };

  const mergeObject = (original, other, opts={})=>{
    // Shallow-ish recursive merge (good enough for the bits we keep).
    const recursive = opts.recursive !== false;
    const out = deepClone(original ?? {});
    const src = other ?? {};
    const walk = (t,s)=>{
      for (const [k,v] of Object.entries(s)){
        if (recursive && v && typeof v==='object' && !Array.isArray(v)){
          t[k] = t[k] && typeof t[k]==='object' && !Array.isArray(t[k]) ? t[k] : {};
          walk(t[k], v);
        } else {
          t[k] = v;
        }
      }
    };
    walk(out, src);
    return out;
  };

  window.foundry = window.foundry || { utils: {} };
  window.foundry.utils.deepClone = deepClone;
  window.foundry.utils.mergeObject = mergeObject;

  const I18N = {
    'MMC.Back': 'Voltar',
    'MMC.Next': 'Seguinte',
    'MMC.Apply': 'Baixar PDF (M616)',
    'MMC.Select': 'Selecionar',
    'MMC.Open': 'Charactermancer'
  };

  window.game = window.game || {};
  window.game.i18n = window.game.i18n || {
    lang: 'pt-BR',
    localize: (k)=> I18N[k] ?? k
  };

  function toast(type, message){
    const wrap = document.getElementById('toast-wrap');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = 'toast';
    const label = (type==='error') ? 'Erro' : (type==='warn' ? 'Aviso' : 'Info');
    el.innerHTML = `<strong>${label}</strong><p>${String(message||'')}</p>`;
    wrap.appendChild(el);
    setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .25s ease'; }, 3400);
    setTimeout(()=>{ el.remove(); }, 3800);
  }

  window.MMCNotify = (type, message)=>{
    if (type==='error') console.error(message);
    else if (type==='warn') console.warn(message);
    else console.log(message);
    toast(type, message);
  };

  window.ui = window.ui || {};
  window.ui.notifications = {
    info: (m)=> window.MMCNotify('info', m),
    warn: (m)=> window.MMCNotify('warn', m),
    error: (m)=> window.MMCNotify('error', m)
  };

  class Application {
    constructor(){
      this.element = null; // Foundry uses a jQuery-ish array; we mimic as [root]
      this._rendered = false;
    }
    async render(){
      if (!this.root) throw new Error('Application.root not set');
      const inner = await this._renderInner({});
      this.root.innerHTML = '';
      this.root.appendChild(inner);
      this.element = [this.root];
      this._rendered = true;
      return this;
    }
    close(){ /* no-op on web */ }
  }

  // ---------- Web-adapted Charactermancer (trimmed from the module) ----------
  class MMCCharactermancer extends Application {

    static _mmcDedupByName(arr){
      try{
        const seen = new Set();
        const out = [];
        for (const it of arr||[]){
          const key = String(it?.name||"").toLowerCase();
          if (!key) continue;
          if (seen.has(key)) continue;
          seen.add(key); out.push(it);
        }
        return out;
      }catch(e){ return Array.from(arr||[]); }
    }

    static _mmcDedupPowersByNameAndSet(arr){
      try{
        const map = new Map();
        for (const it of arr||[]){
          const nm = String(it?.name||"").toLowerCase().trim();
          const set = String(it?.system?.powerSet||"").toLowerCase().trim();
          if (!nm) continue;
          const key = nm + "::" + set;
          if (!map.has(key)) map.set(key, it);
          else map.set(key, it);
        }
        return Array.from(map.values()).sort((a,b)=> (a?.name||"").localeCompare(b?.name||""));
      }catch(e){ return Array.from(arr||[]); }
    }

    static async _mmcEnsureType(stub, fallback){
      try{
        const source = deepClone(stub ?? {});
        // In the site we don't resolve UUIDs/compendia; we only ensure basic shape.
        if (!source.type && fallback) source.type = fallback;
        if (!source.system) source.system = {};
        delete source._id;
        delete source.id;
        delete source.uuid;
        delete source.pack;
        delete source.mmcKind;
        return source;
      }catch(e){ return stub; }
    }

    _restoreScroll(el, key){
      try{
        el.scrollTop = (this.state?.scroll?.[key] ?? 0);
        requestAnimationFrame(()=>{
          try{
            el.scrollTop = (this.state?.scroll?.[key] ?? 0);
            setTimeout(()=>{ try{ el.scrollTop = (this.state?.scroll?.[key] ?? 0); }catch(_){} }, 0);
          }catch(_){}
        });
      }catch(_){}
    }

    _bindScrollMemory(el, key){
      if (!el || !key) return;
      // Restore first (useful when returning to a step)
      this._restoreScroll(el, key);
      // Keep memory updated as the user scrolls
      el.addEventListener('scroll', ()=>{
        try{ this.state.scroll[key] = el.scrollTop; }catch(_){ }
      }, { passive: true });
    }

    static mmcDebounce(fn, wait=200){
      let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn.apply(this,args), wait); };
    }

    constructor(options={}){
      super(options);
      this.steps = ["rank-abilities","occupation","origin","traits-tags","powers","review"];
      this.step = 0;
      this.state = this._freshState();
      this._loaded = false;
      this._focus = null;
    }

    _freshState(){
      return {
        rank: 1,
        maxAbility: 4,
        abilityPointsByRank: {1:5,2:10,3:15,4:20,5:25,6:30},
        abilities: {mle:0, agl:0, res:0, vig:0, ego:0, log:0},
        occupation: null,
        origin: null,
        selectedTraits: [],
        selectedTags: [],
        powerSet: "Basic",
        chosenPowers: [],
        powerLimitMatrix: {1:{'<=1':4}, 2:{'1':9,'2+':8}, 3:{'1':14,'2':13,'3+':12}, 4:{'1':19,'2':18,'3':17,'4+':16}, 5:{'1':24,'2':23,'3':22,'4':21,'5+':20}, 6:{'1':26,'2':25,'3':24,'4':23,'5':22,'6+':21}},
        data: {items:[], occupations:[], origins:[], traits:[], tags:[], powers:[]},
        search: {occupation:"", origin:"", traits:"", tags:"", powers:""},
        bio: { codename:"", realname:"", gender:"", size:"average", height:"", weight:"", eyes:"", hair:"", teams:"", base:"", history:"", personality:"" },
        export: { theme: 'red', includeExtras: true },
        scroll: {}
      };
    }

    async _loadJSON(path){
      const r = await fetch(path, { cache: 'no-store' });
      if (!r.ok) throw new Error(`Falha ao carregar ${path}`);
      return await r.json();
    }

    async _ensureData(){
      if (this._loaded) return;
      const base = 'data/';
      const [items, occupations, origins, traits, tags, powers, actorModel] = await Promise.all([
        this._loadJSON(base+'items.json').catch(()=>({items:[]})),
        this._loadJSON(base+'occupations.json').catch(()=>({items:[]})),
        this._loadJSON(base+'origins.json').catch(()=>({items:[]})),
        this._loadJSON(base+'traits.json').catch(()=>({items:[]})),
        this._loadJSON(base+'tags.json').catch(()=>({items:[]})),
        this._loadJSON(base+'powers.json').catch(()=>({items:[]})),
        this._loadJSON(base+'actor-modelo.json').catch(()=>({}))
      ]);

      this.state.data.items = items.items ?? [];
      this.state.data.occupations = occupations.items ?? [];
      this.state.data.origins = origins.items ?? [];
      this.state.data.traits = traits.items ?? [];
      this.state.data.tags = tags.items ?? [];
      this.state.data.powers = powers.items ?? [];

      // Normalize powerSet labels
      try{
        const canon = s => String(s||"").replace(/[–—]/g,"-").replace(/\s+/g," ").trim();
        this.state.data.powers = (this.state.data.powers||[]).map(p=>{
          try{ if (p?.system) p.system.powerSet = canon(p.system.powerSet); }catch(_){ }
          return p;
        });
      }catch(_){ }

      this.state.actorModel = actorModel;

      const byName = (a,b)=> (a?.name||"").localeCompare(b?.name||"");
      for (const k of ["items","occupations","origins","traits","tags","powers"]) this.state.data[k].sort(byName);

      const sets = Array.from(new Set((this.state.data.powers||[]).map(p=>p.system?.powerSet).filter(Boolean))).sort();
      this.state.powerSets = sets.filter(s=>s!=="Basic");
      this.state.powerSet = this.state.powerSets[0] ?? "";

      const m = actorModel?.system||{};
      const bioKeys = ["codename","realname","height","weight","gender","eyes","hair","size","teams","history","personality"];
      for (const k of bioKeys) this.state.bio[k] = m[k] ?? this.state.bio[k];

      this._loaded = true;
    }

    _labelFor(step){
      const L = {
        "rank-abilities": "Rank & Atributos",
        "occupation": "Ocupação",
        "origin": "Origem",
        "traits-tags": "Traços & Tags",
        "powers": "Poderes",
        "review": "Revisão"
      };
      return L[step] ?? step;
    }

    _refreshPowerChips(){
      try{ this.render(true); }catch(e){ console.error('MMC render error', e); }
    }

    _getMaxAttributeForRank(rank){
      const r = Number(rank || this.state.rank || 1);
      return Math.max(1, r + 3);
    }

    _rankSummaries(){ return {
      1:{maxAbility:this._getMaxAttributeForRank(1), powerLimit:"4", note:"Basic + 1 Power Set"},
      2:{maxAbility:this._getMaxAttributeForRank(2), powerLimit:"9 (1 set) • 8 (2+ sets)", note:""},
      3:{maxAbility:this._getMaxAttributeForRank(3), powerLimit:"14 (1) • 13 (2) • 12 (3+)", note:""},
      4:{maxAbility:this._getMaxAttributeForRank(4), powerLimit:"19 (1) • 18 (2) • 17 (3) • 16 (4+)", note:""},
      5:{maxAbility:this._getMaxAttributeForRank(5), powerLimit:"24 (1) • 23 (2) • 22 (3) • 21 (4) • 20 (5+)", note:""},
      6:{maxAbility:this._getMaxAttributeForRank(6), powerLimit:"26 (1) • 25 (2) • 24 (3) • 23 (4) • 22 (5) • 21 (6+)", note:""}
    }; }

    _getChosenSetsCount(){
      const sets = new Set((this.state.chosenPowers||[]).map(x=> (x.system?.powerSet ?? 'Basic')).filter(s=> s !== 'Basic'));
      return sets.size;
    }

    _getGrantedPowers(){
      const out = [];
      const pushAll = (arr,src)=>{ if (Array.isArray(arr)) for (const p of arr) if (p) { const q=deepClone(p); q._grantedFrom=src; out.push(q);} };
      try{ pushAll(this.state.occupation?.system?.powers || [], 'occupation'); }catch(_){ }
      try{ pushAll(this.state.origin?.system?.powers || [], 'origin'); }catch(_){ }
      const seen = new Set(); const seenN = new Set(); const uniq=[];
      for (const p of out){
        const id=p._id||null;
        const nm=(p.name||'').toLowerCase();
        if ((id && seen.has(id))||(nm && seenN.has(nm))) continue;
        if(id) seen.add(id);
        if(nm) seenN.add(nm);
        uniq.push(p);
      }
      return uniq;
    }

    _originGrantSubset(limit){
      try{
        const all = this._getGrantedPowers()||[];
        const origin = all.filter(p=> p._grantedFrom==='origin').sort((a,b)=> (a.name||'').localeCompare(b.name||''));
        const n = Math.max(0, Math.min(limit||0, origin.length));
        return origin.slice(0, n);
      }catch(_){ return []; }
    }

    _computePowerLimit(){
      const r = this.state.rank || 1;
      const m = this.state.powerLimitMatrix?.[r];
      if (!m) return 4;
      const n = this._getChosenSetsCount();
      const key = (()=>{
        if (m[String(n)]) return String(n);
        if (n <= 1 && m['<=1']) return '<=1';
        if (n >= 6 && m['6+']) return '6+';
        if (n >= 5 && m['5+']) return '5+';
        if (n >= 4 && m['4+']) return '4+';
        if (n >= 3 && m['3+']) return '3+';
        if (n >= 2 && m['2+']) return '2+';
        const keys = Object.keys(m);
        return keys.length ? keys[0] : null;
      })();
      return key ? (m[key] || 4) : 4;
    }

    // ---------- prereq parsing (as-is, but without Foundry deps) ----------
    _meetsAllPrereqs(preText, state, ctx={}){
      try{
        if (!preText || !String(preText).trim()) return {ok:true, missing:[]};
        const text = String(preText).toLowerCase().replace(/^pré:\s*/,'').trim();
        const missing = [];

        const rankMatch = text.match(/rank\s*(\d+)/i);
        if (rankMatch){
          const need = parseInt(rankMatch[1]||'0');
          if ((state.rank||1) < need) missing.push(`Rank ${need}`);
        }

        const abilityMap = {
          melee: 'mle', mle:'mle',
          agility:'agl', agl:'agl',
          resilience:'res', res:'res',
          vigilance:'vig', vig:'vig',
          ego:'ego',
          logic:'log', log:'log'
        };
        const abilityRe = /(melee|mle|agility|agl|resilience|res|vigilance|vig|ego|logic|log)\s*(\d+)/gi;
        let m;
        while ((m = abilityRe.exec(text))){
          const key = abilityMap[m[1].toLowerCase()];
          const need = parseInt(m[2]||'0');
          const cur = Number(state.abilities?.[key] ?? 0);
          if (cur < need) missing.push(`${m[1]} ${need}`);
        }

        // Powers / Traits / Tags required by name
        const reqPowerNames = [];
        const powerRe = /(power|poder)\s*:\s*([^;]+)/gi;
        while ((m = powerRe.exec(text))){
          const names = String(m[2]||'').split(',').map(s=>s.trim()).filter(Boolean);
          reqPowerNames.push(...names);
        }

        // Also handle simple patterns like "Jump 2" or "Wall-Crawling" if present in prereq text.
        // The original module checks by scanning known names.
        const allP = ctx.allP || [];
        const chosen = ctx.chosen || state.chosenPowers || [];
        const grantedNameSet = ctx.grantedNameSet || new Set();
        const grantedIdSet = ctx.grantedIdSet || new Set();
        const chosenNameSet = new Set((chosen||[]).map(p=>String(p?.name||'').toLowerCase()));

        // Build a lookup of known power names for free-form prereqs
        const knownPowerNames = new Set((allP||[]).map(p=>String(p?.name||'').toLowerCase()).filter(Boolean));

        const hasPowerName = (nm)=>{
          const k = String(nm||'').toLowerCase();
          if (!k) return true;
          if (chosenNameSet.has(k)) return true;
          if (grantedNameSet.has(k)) return true;
          // If we have ids, consider them too
          for (const p of chosen){ if (p?._id && grantedIdSet.has(p._id)) return true; }
          return false;
        };

        for (const nm of reqPowerNames){ if (!hasPowerName(nm)) missing.push(nm); }

        // Heuristic: if prereq contains the name of a known power, require it.
        // (Keeps behavior close to the original module.)
        const tokens = String(text).split(/[^a-z0-9\-\s]+/i).join(' ');
        const tLower = tokens.toLowerCase();
        for (const nm of knownPowerNames){
          if (nm.length < 4) continue;
          if (tLower.includes(nm.toLowerCase())){
            if (!hasPowerName(nm)) missing.push(nm);
          }
        }

        return { ok: missing.length===0, missing };
      }catch(e){
        console.warn('MMC prereq parse failed', e);
        return { ok:true, missing:[] };
      }
    }

    // ---------- Rendering ----------
    async render(force){
      await this._ensureData();
      const r = await super.render(force);
      try{ this._updateTip(); }catch(_){ }
      return r;
    }

    _updateTip(){
      const el = document.getElementById('mmc-tip');
      if (!el) return;
      // Same tip on all steps (per project requirement)
      el.textContent = 'Dica: Esse criador de personagem foi desenvolvido para ser utilizado no Foundry VTT e com o sistema Multiverse D616.';
    }

    async _renderStep(){
      const step = this.steps[this.step];
      if (step==='rank-abilities') return this._renderRankStep();
      if (step==='occupation') return this._renderListStep('occupation');
      if (step==='origin') return this._renderListStep('origin');
      if (step==='traits-tags') return this._renderTraitsTags();
      if (step==='powers') return this._renderPowers();
      if (step==='review') return this._renderReview();
      return document.createElement('div');
    }

    async _renderInner(){
      const wrap = document.createElement('div');

      // Header / Steps
      const stepsBar = document.createElement('div');
      stepsBar.className = 'mmc-steps';
      this.steps.forEach((s, i)=>{
        const el = document.createElement('div');
        el.className = 'mmc-step'+(i===this.step?' active':'');
        el.textContent = `${i+1}. ${this._labelFor(s)}`;
        stepsBar.appendChild(el);
      });
      wrap.appendChild(stepsBar);

      const body = document.createElement('div');
      body.className = 'mmc-body';
      body.appendChild(await this._renderStep());
      wrap.appendChild(body);

      const nav = document.createElement('div');
      nav.className = 'mmc-nav';

      const leftGroup = document.createElement('div');
      leftGroup.className = 'mmc-nav-group';

      const centerGroup = document.createElement('div');
      centerGroup.className = 'mmc-nav-group mmc-nav-center';

      const rightGroup = document.createElement('div');
      rightGroup.className = 'mmc-nav-group';

      const back = document.createElement('button');
      back.className = 'mmc-btn';
      back.textContent = game.i18n.localize('MMC.Back') || 'Voltar';
      back.disabled = (this.step===0);
      back.addEventListener('click', ()=>{ this.step=Math.max(0,this.step-1); this._refreshPowerChips(); });

      const next = document.createElement('button');
      next.className = 'mmc-btn';
      next.textContent = (this.step===this.steps.length-1) ? (game.i18n.localize('MMC.Apply')||'Baixar PDF (M616)') : (game.i18n.localize('MMC.Next')||'Seguinte');
      next.addEventListener('click', ()=> this._onNext());

      leftGroup.appendChild(back);

      // Step 1 (Rank & Atributos): Import JSON centralizado
      if (this.step === 0){
        const ijson = document.createElement('button');
        ijson.className = 'mmc-btn';
        ijson.textContent = 'Importar JSON';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'application/json';
        fileInput.style.display = 'none';

        ijson.addEventListener('click', ()=> fileInput.click());

        fileInput.addEventListener('change', async ()=>{
          const f = fileInput.files?.[0];
          if (!f) return;
          try{
            await this._importJsonFile(f);
            ui.notifications.info('JSON importado.');
          }catch(e){
            console.error(e);
            ui.notifications.error('Falha ao importar JSON.');
          } finally {
            fileInput.value='';
          }
        });

        centerGroup.appendChild(ijson);
        centerGroup.appendChild(fileInput);
      }

      // Step 6 (Revisão): botões extras no rodapé (sem Import aqui)
      if (this.step === this.steps.length - 1){
        const reset = document.createElement('button');
        reset.className = 'mmc-btn';
        reset.textContent = 'Resetar Tudo';
        reset.addEventListener('click', ()=> this.resetAll());
        leftGroup.appendChild(reset);

        const djson = document.createElement('button');
        djson.className = 'mmc-btn';
        djson.textContent = 'Baixar JSON';
        djson.addEventListener('click', ()=> this._downloadJson());

        rightGroup.appendChild(djson);
        rightGroup.appendChild(next);
      } else {
        rightGroup.appendChild(next);
      }

      nav.appendChild(leftGroup);
      nav.appendChild(centerGroup);
      nav.appendChild(rightGroup);
      wrap.appendChild(nav);

      return wrap;
    }

    _renderRankStep(){
      // Almost identical to module; no Foundry deps.
      const wrap = document.createElement('div');
      wrap.className = 'mmc-grid';

      const left = document.createElement('div'); left.className='mmc-card';
      left.innerHTML = `<h3>Rank</h3>`;
      const list = document.createElement('div'); list.className='mmc-list';
      const S = this._rankSummaries();
      [1,2,3,4,5,6].forEach(r=>{
        const row = document.createElement('div'); row.className='mmc-pwr';
        const active = (this.state.rank===r) ? ' style="border:1px solid var(--mmc-accent);border-radius:8px;padding:6px;"' : '';
        row.innerHTML = `<div class="name"${active}>Rank ${r}</div>
          <div class="desc mmc-small">Máx. atributo: ${S[r].maxAbility} • Limite de poderes: ${S[r].powerLimit} ${S[r].note?('• '+S[r].note):''}</div>
          <div><button class="mmc-btn" data-pick-rank="${r}">Selecionar</button></div>`;
        list.appendChild(row);
      });
      left.appendChild(list);
      this._bindScrollMemory(list, 'rankList');
      wrap.appendChild(left);

      const right = document.createElement('div'); right.className='mmc-card';
      right.innerHTML = `<h3>Atributos (M.A.R.V.E.L.)</h3>`;
      const labels = {mle:'Melee', agl:'Agility', res:'Resilience', vig:'Vigilance', ego:'Ego', log:'Logic'};
      const keys = ['mle','agl','res','vig','ego','log'];
      const pointsBudget = this.state.abilityPointsByRank[this.state.rank] ?? 0;
      const maxA = this._getMaxAttributeForRank(this.state.rank);

      const allowedFor = (name)=>{
        const out=[];
        for (let v=-3; v<=maxA; v++){
          const cur = {...(this.state.abilities||{})};
          cur[name]=Number(v||0);
          let pos=0, neg=0;
          for (const k of keys){ const val=Number(cur[k]||0); if (val>=0) pos+=val; else neg+=-val; }
          if (pos <= (pointsBudget + neg)) out.push(v);
        }
        return out;
      };

      for (const k of keys){
        const field = document.createElement('div'); field.className='mmc-field';
        const sel = document.createElement('select'); sel.name=k; sel.className='mmc-attr-select';
        const allowed = allowedFor(k);
        const current = Number((this.state.abilities||{})[k] ?? 0);
        for (const v of allowed){
          const opt = document.createElement('option');
          opt.value = String(v);
          opt.textContent = String(v);
          if (v===current) opt.selected = true;
          sel.appendChild(opt);
        }
        if (allowed.includes(current)) sel.value=String(current);
        else if (allowed.includes(0)) { sel.value='0'; this.state.abilities[k]=0; }
        else if (allowed.length) { sel.value=String(allowed[0]); this.state.abilities[k]=Number(allowed[0]||0); }

        sel.addEventListener('change', (ev)=>{
          const v = Number(ev.target.value||0);
          this.state.abilities[k]=v;
          try{ this.state.scroll.rankList = list.scrollTop; }catch(_){ }
          this._refreshPowerChips();
        });
        field.innerHTML = `<label>${labels[k]}</label>`;
        field.appendChild(sel);
        right.appendChild(field);
      }

      const sumPos = Object.values(this.state.abilities||{}).reduce((a,b)=>a + (b>0?b:0),0);
      const refund = Object.values(this.state.abilities||{}).reduce((a,b)=>a + (b<0?(-b):0),0);
      const rest = pointsBudget + refund - sumPos;
      const restEl = document.createElement('div'); restEl.className='mmc-small';
      restEl.textContent = `Pontos restantes: ${rest}`;
      right.appendChild(restEl);
      wrap.appendChild(right);

      left.querySelectorAll('[data-pick-rank]').forEach(btn=>btn.addEventListener('click',(ev)=>{
        const rank = Number(ev.currentTarget.dataset.pickRank || ev.currentTarget.getAttribute('data-pick-rank'));
        const was = this.state.rank;
        this.state.rank = rank;
        this.state.maxAbility = this._getMaxAttributeForRank(rank);
        if (rank !== was) this.state.abilities = {mle:0, agl:0, res:0, vig:0, ego:0, log:0};
        try{ this.state.scroll.rankList = list.scrollTop; }catch(_){ }
        this._refreshPowerChips();
      }));

      return wrap;
    }

    _renderSelectionDetails(kind, sel){
      const right = document.createElement('div');
      right.className = 'mmc-card mmc-selected';
      if (!sel){
        right.innerHTML = `<h3>Selecionado</h3><div class="mmc-small">Nada selecionado.</div>`;
        return right;
      }
      const grantsTraits = (sel.system?.traits||[]).map(t=>t.name).join(', ');
      const grantsTags = (sel.system?.tags||[]).map(t=>t.name).join(', ');
      const grantsPowers = (sel.system?.powers||[]).map(p=>p.name).join(', ');
      right.innerHTML = `<h3>Selecionado</h3>
        <div class="mmc-pwr">
          <div class="name">${sel.name}</div>
          <div class="desc">${sel.system?.description||''}</div>
        </div>
        <div class="mmc-small"><strong>Concede:</strong></div>
        <ul class="mmc-summary">
          <li><strong>Traços:</strong> ${grantsTraits||'—'}</li>
          <li><strong>Tags:</strong> ${grantsTags||'—'}</li>
          <li><strong>Poderes:</strong> ${grantsPowers||'—'}</li>
        </ul>`;
      return right;
    }

    _renderListStep(kind){
      const wrap = document.createElement('div');
      wrap.className='mmc-grid';

      const left = document.createElement('div');
      left.className='mmc-card';
      left.innerHTML = `<h3>${kind==='occupation'?'Ocupação':'Origem'}</h3>
        <input class="mmc-search" placeholder="Buscar..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">`;
      const list = document.createElement('div'); list.className='mmc-list';
      left.appendChild(list);
      wrap.appendChild(left);

      const right = this._renderSelectionDetails(kind, (kind==='occupation'?this.state.occupation:this.state.origin) || null);
      wrap.appendChild(right);

      const keyOf = (o)=> String(o?.name||'').toLowerCase().trim();
      const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

      const src = (kind==='occupation' ? (this.state.data.occupations||[]) : (this.state.data.origins||[]))
        .slice()
        .sort((a,b)=>collator.compare(a?.name||'', b?.name||''));

      const renderList = ()=>{
        const q = (left.querySelector('.mmc-search')?.value || '').toLowerCase();
        const scrollKey = (kind==='occupation' ? 'occupationList' : 'originList');
        const st = list.scrollTop;
        try{ this.state.scroll[scrollKey] = st; }catch(_){ }
        list.innerHTML='';
        src.filter(o=> keyOf(o).includes(q) || String(o.system?.description||'').toLowerCase().includes(q))
          .forEach(o=>{
            const row = document.createElement('div'); row.className='mmc-pwr';
            const pickKey = keyOf(o);
            row.innerHTML = `<div class="name">${o.name}</div>
              <div class="desc">${o.system?.description||''}</div>
              <div><button class="mmc-btn" data-pick="${pickKey}">${game.i18n.localize('MMC.Select')||'Selecionar'}</button></div>`;
            list.appendChild(row);
          });

        list.querySelectorAll('[data-pick]').forEach(btn=>btn.addEventListener('click',(ev)=>{
          try{ this.state.scroll[scrollKey] = list.scrollTop; }catch(_){ }
          const k = ev.currentTarget.dataset.pick;
          const obj = src.find(x=>keyOf(x)===k) ?? null;
          if (kind==='occupation') this.state.occupation=obj; else this.state.origin=obj;
          const html = this._renderSelectionDetails(kind, obj).innerHTML;
          const cur = wrap.querySelector('.mmc-selected');
          if (cur) cur.innerHTML = html;
        }));

        // Keep the list where the user was (important when filtering/searching)
        try{ list.scrollTop = st; }catch(_){ }
      };

      renderList();
      this._bindScrollMemory(list, kind==='occupation' ? 'occupationList' : 'originList');
      const sEl = left.querySelector('.mmc-search');
      if (sEl) sEl.addEventListener('input', ()=>renderList());

      return wrap;
    }
    _renderTraitsTags(){
      const wrap = document.createElement('div');
      // 2x2 grid like the Foundry module: top row lists, bottom row selected panels
      wrap.className='mmc-grid';

      // Helpers/state
      this.state.search = this.state.search || {};
      this.state.scroll = this.state.scroll || {};
      this.state.selectedTraits = this.state.selectedTraits || [];
      this.state.selectedTags = this.state.selectedTags || [];

      // Granted by Occupation/Origin
      const grantedTraits = [ ...(this.state.occupation?.system?.traits||[]), ...(this.state.origin?.system?.traits||[]) ].filter(Boolean);
      const grantedTags   = [ ...(this.state.occupation?.system?.tags||[]),   ...(this.state.origin?.system?.tags||[])   ].filter(Boolean);

      // Build id and name sets for reliable matching
      const traitIdSet = new Set(grantedTraits.map(t=>t?._id).filter(Boolean));
      const traitNameSet = new Set(grantedTraits.map(t=>(t?.name||'').toLowerCase()).filter(Boolean));
      const tagIdSet = new Set(grantedTags.map(t=>t?._id).filter(Boolean));
      const tagNameSet = new Set(grantedTags.map(t=>(t?.name||'').toLowerCase()).filter(Boolean));
      const isConnections = (nm)=> /^(connections|conexões)$/i.test(nm||'');

      // Rules (same as Foundry module): extra Traits allowed = current Rank
      const extraAllowed = Number(this.state.rank || 1);
      const used = (this.state.selectedTraits || []).length;
      const remaining = Math.max(0, extraAllowed - used);

      const traits = MMCCharactermancer._mmcDedupByName([...(this.state.data.traits||[])]);
      const tags   = MMCCharactermancer._mmcDedupByName([...(this.state.data.tags||[])]);

      // Top-left: Traits
      const leftTop = document.createElement('div'); leftTop.className='mmc-card';
      leftTop.innerHTML = `<h3>Traços</h3>
        <div id="mmc-traits-remaining" class="mmc-small">Traços extras restantes: ${remaining} (de ${extraAllowed})</div>
        <input class="mmc-search" placeholder="Buscar..." name="search-traits" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" value="${this.state.search?.traits||''}">`;
      const listTraits = document.createElement('div'); listTraits.className='mmc-list mmc-scroll';
      leftTop.appendChild(listTraits);
      wrap.appendChild(leftTop);

      // Top-right: Tags
      const rightTop = document.createElement('div'); rightTop.className='mmc-card';
      rightTop.innerHTML = `<h3>Tags</h3>
        <input class="mmc-search" placeholder="Buscar..." name="search-tags" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" value="${this.state.search?.tags||''}">`;
      const listTags = document.createElement('div'); listTags.className='mmc-list mmc-scroll';
      rightTop.appendChild(listTags);
      wrap.appendChild(rightTop);

      // Bottom-left: Selected Traits
      const selTraits = document.createElement('div'); selTraits.className='mmc-card mmc-selected';
      selTraits.innerHTML = `<h3>Selecionados — Traços</h3>`;
      const chipsTraits = document.createElement('div'); chipsTraits.className='mmc-chips';
      selTraits.appendChild(chipsTraits);
      wrap.appendChild(selTraits);

      // Bottom-right: Selected Tags
      const selTags = document.createElement('div'); selTags.className='mmc-card mmc-selected';
      selTags.innerHTML = `<h3>Selecionados — Tags</h3>`;
      const chipsTags = document.createElement('div'); chipsTags.className='mmc-chips';
      selTags.appendChild(chipsTags);
      wrap.appendChild(selTags);

      const mkChip = (label, removeFn, granted=false)=>{
        const c = document.createElement('div');
        c.className = granted ? 'mmc-tag mmc-tag-granted' : 'mmc-tag';
        c.innerHTML = granted ? label : `${label} <button type="button" class="mmc-chip-x" title="Remover">×</button>`;
        if (!granted && removeFn){
          const b = c.querySelector('button');
          if (b) b.addEventListener('click', (ev)=>{ ev.preventDefault(); ev.stopPropagation(); removeFn(); });
        }
        return c;
      };

      const renderSelected = ()=>{
        chipsTraits.innerHTML='';
        chipsTags.innerHTML='';

        // Traits
        grantedTraits.forEach(t=> chipsTraits.appendChild(mkChip(t.name, null, true)));
        (this.state.selectedTraits||[]).forEach(t=> chipsTraits.appendChild(mkChip(t.name, ()=>{
          try{ this.state.scroll.traits = listTraits.scrollTop; }catch(_){ }
          try{ this.state.scroll.tags = listTags.scrollTop; }catch(_){ }
          this.state.selectedTraits = (this.state.selectedTraits||[]).filter(x=>x._id!==t._id);
          this._refreshPowerChips();
        })));

        // Tags
        grantedTags.forEach(t=> chipsTags.appendChild(mkChip(t.name, null, true)));
        (this.state.selectedTags||[]).forEach(t=> chipsTags.appendChild(mkChip(t.name, ()=>{
          try{ this.state.scroll.traits = listTraits.scrollTop; }catch(_){ }
          try{ this.state.scroll.tags = listTags.scrollTop; }catch(_){ }
          this.state.selectedTags = (this.state.selectedTags||[]).filter(x=>x._id!==t._id);
          this._refreshPowerChips();
        })));
      };

      const renderListTraits = ()=>{
        const prev = listTraits.scrollTop;
        listTraits.innerHTML='';
        const qlc = (this.state.search?.traits||'').toLowerCase();

        // Recompute remaining to reflect current selection
        const extraAllowedNow = Number(this.state.rank || 1);
        const usedNow = (this.state.selectedTraits || []).length;
        const remainingNow = Math.max(0, extraAllowedNow - usedNow);
        const remEl = leftTop.querySelector('#mmc-traits-remaining');
        if (remEl) remEl.textContent = `Traços extras restantes: ${remainingNow} (de ${extraAllowedNow})`;

        traits
          .filter(t => {
            const nm = String(t?.name||'').toLowerCase();
            const desc = String(t?.system?.description||'').toLowerCase();
            return nm.includes(qlc) || desc.includes(qlc);
          })
          // Hide granted traits unless "Connections" (same as Foundry module)
          .filter(t => !(traitIdSet.has(t._id) || traitNameSet.has((t.name||'').toLowerCase())) || isConnections(t.name))
          .forEach(t=>{
            const row = document.createElement('div'); row.className='mmc-pwr';
            const picked = !!(this.state.selectedTraits||[]).find(x=>x._id===t._id || (x.name||'').toLowerCase()===(t.name||'').toLowerCase());
            const disableByGrant = (traitIdSet.has(t._id) || traitNameSet.has((t.name||'').toLowerCase())) && !isConnections(t.name);
            const disableByPicked = picked && !isConnections(t.name);
            const disabled = disableByGrant || disableByPicked || remainingNow<=0;

            let action = `<button class="mmc-btn" data-add-trait="${t._id}" ${disabled?'disabled':''}>Selecionar</button>`;
            if (disableByGrant) action = `<button class="mmc-btn" disabled>Concedido</button>`;
            if (!disableByGrant && disableByPicked) action = `<button class="mmc-btn" disabled>Selecionado</button>`;

            row.innerHTML = `<div class="name">${t.name||''}</div><div class="desc">${t.system?.description||''}</div><div>${action}</div>`;
            listTraits.appendChild(row);
          });

        listTraits.scrollTop = prev;
        requestAnimationFrame(()=>{ try{ listTraits.scrollTop = prev; }catch(_){ } });

        listTraits.querySelectorAll('[data-add-trait]').forEach(btn=>btn.addEventListener('click',(ev)=>{
          const id = ev.currentTarget.dataset.addTrait;
          const obj = traits.find(x=>x._id===id);
          if (!obj) return;

          const extraAllowedNow = Number(this.state.rank || 1);
          const usedNow = (this.state.selectedTraits || []).length;
          const remainingNow = Math.max(0, extraAllowedNow - usedNow);
          if (remainingNow <= 0){
            ui.notifications?.warn?.('Você já escolheu todos os Traços bônus.');
            return;
          }
          // prevent dup by name when not Connections
          if (!isConnections(obj.name)){
            const dupByName = (this.state.selectedTraits||[]).some(x => (x.name||'').toLowerCase()===(obj.name||'').toLowerCase());
            if (dupByName) return;
          }

          try{ this.state.scroll.traits = listTraits.scrollTop; }catch(_){ }
          try{ this.state.scroll.tags = listTags.scrollTop; }catch(_){ }
          this.state.selectedTraits = [...(this.state.selectedTraits||[]), obj];
          this._refreshPowerChips();
        }));
      };

      const renderListTags = ()=>{
        const prev = listTags.scrollTop;
        listTags.innerHTML='';
        const qlc = (this.state.search?.tags||'').toLowerCase();
        const chosenNames = new Set((this.state.selectedTags||[]).map(x=>String(x?.name||'').toLowerCase()));

        tags
          .filter(t => {
            const nm = String(t?.name||'').toLowerCase();
            const desc = String(t?.system?.description||'').toLowerCase();
            return nm.includes(qlc) || desc.includes(qlc);
          })
          .forEach(t=>{
            const row = document.createElement('div'); row.className='mmc-pwr';
            const granted = tagIdSet.has(t._id) || tagNameSet.has((t.name||'').toLowerCase());
            const picked = chosenNames.has((t.name||'').toLowerCase());
            let action = `<button class="mmc-btn" data-add-tag="${t._id}">Selecionar</button>`;
            if (granted) action = `<button class="mmc-btn" disabled>Concedido</button>`;
            else if (picked) action = `<button class="mmc-btn" disabled>Selecionado</button>`;
            row.innerHTML = `<div class="name">${t.name||''}</div><div class="desc">${t.system?.description||''}</div><div>${action}</div>`;
            listTags.appendChild(row);
          });

        listTags.scrollTop = prev;
        requestAnimationFrame(()=>{ try{ listTags.scrollTop = prev; }catch(_){ } });

        listTags.querySelectorAll('[data-add-tag]').forEach(btn=>btn.addEventListener('click',(ev)=>{
          const id = ev.currentTarget.dataset.addTag;
          const obj = tags.find(x=>x._id===id);
          if (!obj) return;
          // prevent dup by name
          const dupByName = (this.state.selectedTags||[]).some(x => (x.name||'').toLowerCase()===(obj.name||'').toLowerCase());
          if (dupByName) return;
          try{ this.state.scroll.traits = listTraits.scrollTop; }catch(_){ }
          try{ this.state.scroll.tags = listTags.scrollTop; }catch(_){ }
          this.state.selectedTags = [...(this.state.selectedTags||[]), obj];
          this._refreshPowerChips();
        }));
      };

      renderSelected();
      renderListTraits();
      renderListTags();

      this._bindScrollMemory(listTraits, 'traits');
      this._bindScrollMemory(listTags, 'tags');

      leftTop.querySelector('input[name="search-traits"]').addEventListener('input', (ev)=>{
        this.state.search.traits = ev.target.value;
        this.state.scroll.traits = listTraits.scrollTop;
        renderListTraits();
        this._restoreScroll(listTraits, 'traits');
      });
      rightTop.querySelector('input[name="search-tags"]').addEventListener('input', (ev)=>{
        this.state.search.tags = ev.target.value;
        this.state.scroll.tags = listTags.scrollTop;
        renderListTags();
        this._restoreScroll(listTags, 'tags');
      });

      return wrap;
    }
    _renderPowers(){
      const container = document.createElement('div');
      // 2x2 grid: top row lists, bottom row selected panels
      container.className='mmc-grid';
      container.style.gridTemplateColumns = '1fr 1fr';

      // prepare granted / limits
      const limit = this._computePowerLimit();
      const grantedPowers = [ ...(this._getGrantedPowers()||[]).filter(p=>p._grantedFrom!=='origin'), ...this._originGrantSubset(limit) ];
      const grantedIdSet = new Set(grantedPowers.map(p=>p._id).filter(Boolean));
      const grantedNameSet = new Set(grantedPowers.map(p=>String(p?.name||'').toLowerCase()));
      const originConsume = this._originGrantSubset(limit);

      // TOP-LEFT: Basic
      const left = document.createElement('div'); left.className='mmc-card';
      left.innerHTML = `<h3>Básicos</h3>
        <input class="mmc-search" name="search-powers-basic" placeholder="Buscar..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">`;
      const listBasic = document.createElement('div'); listBasic.className='mmc-list mmc-scroll';
      left.appendChild(listBasic);
      container.appendChild(left);

      // TOP-RIGHT: Power Sets
      const right = document.createElement('div'); right.className='mmc-card';
      right.innerHTML = `<h3>Power Sets</h3>`;
      const setSel = document.createElement('select');
      setSel.name='powerSet';
      setSel.className='mmc-search mmc-select mmc-select-tall';
      (this.state.powerSets||[]).forEach(s=>{ const opt=document.createElement('option'); opt.value=s; opt.textContent=s; setSel.appendChild(opt); });
      setSel.value = this.state.powerSet || '';
      right.appendChild(setSel);
      const listSet = document.createElement('div'); listSet.className='mmc-list mmc-scroll';
      right.appendChild(listSet);
      container.appendChild(right);

      const _filterList = (list, q)=>{
        q = (q||'').toLowerCase();
        Array.from(list.children||[]).forEach(ch=>{
          const nm = ch?.dataset?.nameLc || '';
          ch.style.display = nm.includes(q)?'':'none';
        });
      };

      const q = (this.state.search?.powers||'').toLowerCase();
      const allP = MMCCharactermancer._mmcDedupPowersByNameAndSet(this.state.data.powers||[]).filter(p=>(p.name||'').toLowerCase().includes(q));
      const setName = this.state.powerSet || '';

      const minRankFromPrereq = (txt)=>{
        if(!txt) return 0;
        let max=0; const re=/Rank\s*(\d+)/gi; let m;
        while((m=re.exec(txt))){ const n=parseInt(m[1]); if(!isNaN(n)) max=Math.max(max,n); }
        return max;
      };

      const buildRow = (p)=>{
        const row = document.createElement('div');
        row.className='mmc-pwr';
        row.dataset.nameLc = (p.name||'').toLowerCase();
        const pre = p.system?.prerequisites || '';
        const reqRank = minRankFromPrereq(pre);
        const picked = !!(this.state.chosenPowers||[]).find(x=>x._id===p._id || (x.name||'').toLowerCase()===(p.name||'').toLowerCase());
        const granted = grantedIdSet.has(p._id) || grantedNameSet.has((p.name||'').toLowerCase());

        let actionHTML='';
        if (granted) actionHTML = `<button class="mmc-btn" disabled>Concedido</button>`;
        else if (picked) actionHTML = `<button class="mmc-btn" disabled>Selecionado</button>`;
        else if (reqRank && (Number(this.state.rank||1) < reqRank)) actionHTML = `<button class="mmc-btn" disabled title="Requer Rank ${reqRank}">Rank ${reqRank}</button>`;
        else if ( (this.state.chosenPowers||[]).length >= Math.max(0, limit - (originConsume?.length||0)) ) actionHTML = `<button class="mmc-btn" disabled title="Limite atingido">Limite</button>`;
        else {
          const result = this._meetsAllPrereqs(pre, this.state, { allP, grantedNameSet, grantedIdSet, chosen: this.state.chosenPowers });
          if (!result.ok){
            const tt = (result.missing&&result.missing.length) ? ` title="Falta: ${result.missing.join(', ')}"` : '';
            actionHTML = `<button class="mmc-btn" disabled${tt}>Bloqueado</button>`;
          } else {
            actionHTML = `<button class="mmc-btn" data-add-power="${p._id}">Selecionar</button>`;
          }
        }

        row.innerHTML = `<div class="name">${p.name}${pre?` <span class="mmc-small">— Pré: ${pre}</span>`:''}</div>
          <div class="desc">${p.system?.description||''}</div>
          <div>${actionHTML}</div>`;
        return row;
      };

      // Render BASIC list
      listBasic.innerHTML='';
      allP.filter(p=>(p.system?.powerSet??'Basic')==='Basic').forEach(p=>listBasic.appendChild(buildRow(p)));
      this._bindScrollMemory(listBasic, 'powers-basic');
      _filterList(listBasic, q);

      // Render SET list (family-aware)
      listSet.innerHTML='';
      const _mmcBaseName = (n)=> String(n||'').replace(/\s*\d+$/, '').trim().toLowerCase();
      const setLower = String(setName||'').toLowerCase().trim();
      const inCurrentSet = (allP||[]).filter(p=> String(p.system?.powerSet||'').toLowerCase().trim() === setLower);
      const baseNames = new Set(inCurrentSet.map(p=>_mmcBaseName(p?.name)));
      const crossList = (allP||[]).filter(p=>baseNames.has(_mmcBaseName(p?.name)));
      const shownList = MMCCharactermancer._mmcDedupPowersByNameAndSet(crossList);
      shownList.forEach(p=>listSet.appendChild(buildRow(p)));
      this._bindScrollMemory(listSet, 'powers-set');

      // BOTTOM-LEFT: Selected Basics
      const chosenCount = (this.state.chosenPowers||[]).length + (originConsume?.length||0);
      const selBasic = document.createElement('div'); selBasic.className='mmc-card mmc-selected';
      selBasic.innerHTML = `<h3>Selecionados — Básicos (${chosenCount} / ${limit})</h3>`;
      const chipsBasic = document.createElement('div'); chipsBasic.className='mmc-chips';
      selBasic.appendChild(chipsBasic);
      container.appendChild(selBasic);

      // BOTTOM-RIGHT: Selected Power Sets
      const selSet = document.createElement('div'); selSet.className='mmc-card mmc-selected';
      selSet.innerHTML = `<h3>Selecionados — Power Sets (${chosenCount} / ${limit})</h3>`;
      const chipsSet = document.createElement('div'); chipsSet.className='mmc-chips';
      selSet.appendChild(chipsSet);
      container.appendChild(selSet);

      const chosenBasic = (this.state.chosenPowers||[]).filter(p=>(p.system?.powerSet??'Basic')==='Basic');
      const grantBasic = grantedPowers.filter(p=>(p.system?.powerSet??'Basic')==='Basic');
      chipsBasic.innerHTML='';
      grantBasic.forEach(p=>{ const c=document.createElement('div'); c.className='mmc-tag mmc-tag-granted'; c.textContent=p.name; chipsBasic.appendChild(c); });
      chosenBasic.forEach(p=>{ const c=document.createElement('div'); c.className='mmc-tag'; c.innerHTML = `${p.name} <button type="button" class="mmc-chip-x" data-remove-power="${p._id}" title="Remover">×</button>`; chipsBasic.appendChild(c); });

      const chosenNonBasic = (this.state.chosenPowers||[]).filter(p=>(p.system?.powerSet??'Basic')!=='Basic');
      const grantNonBasic = grantedPowers.filter(p=>(p.system?.powerSet??'Basic')!=='Basic');
      chipsSet.innerHTML='';
      grantNonBasic.forEach(p=>{ const c=document.createElement('div'); c.className='mmc-tag mmc-tag-granted'; c.textContent = `${p.system?.powerSet? p.system.powerSet+': ' : ''}${p.name}`; chipsSet.appendChild(c); });
      chosenNonBasic.forEach(p=>{ const c=document.createElement('div'); c.className='mmc-tag'; c.innerHTML = `${p.system?.powerSet? p.system.powerSet+': ' : ''}${p.name} <button type="button" class="mmc-chip-x" data-remove-power="${p._id}" title="Remover">×</button>`; chipsSet.appendChild(c); });

      // Search & select
      const deb = MMCCharactermancer.mmcDebounce((val)=>{
        this.state.search.powers = val||'';
        this.state.scroll['powers-basic'] = listBasic.scrollTop;
        this.state.scroll['powers-set'] = listSet.scrollTop;
        this._focus = { ...(this._focus||{}), 'powers-basic': { q: "input[name='search-powers-basic']", pos: (val||'').length } };
        this.render(true);
      }, 500);

      const inputBasic = left.querySelector('input[name="search-powers-basic"]');
      // Preserve search term across re-renders (so the filter doesn't "stick" with an empty input).
      try{ inputBasic.value = this.state.search?.powers || ''; }catch(_){ }
      if (this._focus?.['powers-basic']){
        try{ inputBasic.focus(); inputBasic.selectionStart=inputBasic.selectionEnd=inputBasic.value.length; }catch(_){ }
      }
      inputBasic.addEventListener('input',(ev)=>{
        const v=ev.target.value||'';
        // Update live filter immediately (both lists)
        _filterList(listBasic, v);
        _filterList(listSet, v);
        // Keep state in sync, and re-render after debounce to rebuild the set list properly
        this.state.search.powers = v;
        deb(v);
      });
      inputBasic.addEventListener('keyup',(ev)=>{ try{ this._focus = { ...(this._focus||{}), 'powers-basic': { q: "input[name='search-powers-basic']", pos: (ev.currentTarget.selectionEnd||ev.currentTarget.value.length) } }; }catch(_){ } });
      inputBasic.addEventListener('keydown',(ev)=>{
        if (ev.key==='Escape'){ ev.preventDefault(); inputBasic.value=''; this.state.search.powers=''; _filterList(listBasic,''); _filterList(listSet,''); deb(''); }
        if ((ev.ctrlKey||ev.metaKey) && ev.key.toLowerCase()==='f'){ ev.preventDefault(); inputBasic.focus(); inputBasic.select(); }
      });

      setSel.addEventListener('change',(ev)=>{
        this.state.powerSet = ev.target.value||'';
        this.state.scroll['powers-basic'] = listBasic.scrollTop;
        this.state.scroll['powers-set'] = listSet.scrollTop;
        this.render(true);
      });

      container.querySelectorAll('[data-add-power]').forEach(btn=>btn.addEventListener('click',(ev)=>{
        const id = ev.currentTarget.dataset.addPower;
        const p = (this.state.data.powers||[]).find(x=>x._id===id);
        if (!p) return;

        if ((this.state.rank||1)===1){
          const chosenSets = new Set((this.state.chosenPowers||[]).map(x=>x.system?.powerSet ?? 'Basic').filter(s=>s!=='Basic'));
          const pSet = p.system?.powerSet ?? 'Basic';
          if (chosenSets.size>=1 && pSet!=='Basic' && !chosenSets.has(pSet)){
            ui.notifications.warn('Rank 1: Somente Basic + 1 Power Set.');
            return;
          }
        }

        const curLim = this._computePowerLimit();
        const originTake = (this._originGrantSubset(curLim)||[]).length;
        const avail = Math.max(0, curLim - originTake);
        if ((this.state.chosenPowers||[]).length >= avail){
          ui.notifications.warn(`Limite de poderes: ${curLim} (Origem consumiu ${originTake})`);
          return;
        }

        this.state.chosenPowers = [...(this.state.chosenPowers||[]), p];
        this.state.scroll['powers-basic'] = listBasic.scrollTop;
        this.state.scroll['powers-set'] = listSet.scrollTop;
        this.render(true);
      }));

      container.querySelectorAll('[data-remove-power]').forEach(btn=>btn.addEventListener('click',(ev)=>{
        const id = ev.currentTarget.dataset.removePower;
        this.state.chosenPowers = (this.state.chosenPowers||[]).filter(x=>x._id!==id);
        this.state.scroll['powers-basic'] = listBasic.scrollTop;
        this.state.scroll['powers-set'] = listSet.scrollTop;
        this.render(true);
      }));

      return container;
    }

    _bioInput(key,label,val){
      return `<div class="mmc-field"><label>${label}</label><input type="text" data-bio="${key}" value="${val??''}"></div>`;
    }
    _bioSelectSize(key,label,val){
      const opts = ['MICROSCOPIC','MINATURE','TINY','LITTLE','SMALL','AVERAGE','BIG','HUGE','GIGANTIC','TITANIC','GARGANTUAN'];
      const cur = (val||'AVERAGE').toUpperCase();
      const build = opts.map(o=>`<option value="${o}" ${o===cur?'selected':''}>${o}</option>`).join('');
      return `<div class="mmc-field"><label>${label}</label><select class="mmc-select" data-bio="${key}">${build}</select></div>`;
    }

    _renderReview(){
      const wrap = document.createElement('div');
      wrap.className='mmc-card mmc-review';
      const bio = this.state.bio;

      const limit = this._computePowerLimit();
      const chosenCount = (this.state.chosenPowers||[]).length + (this._originGrantSubset(limit)?.length||0);
      const chosenSets = this._getChosenSetsCount();
      const warnings = [];
      if ((this.state.rank||1)===1 && chosenSets>1) warnings.push('Rank 1: apenas Basic + 1 Power Set.');
      if (chosenCount>limit) warnings.push(`Poderes escolhidos (${chosenCount}) excedem o limite (${limit}).`);

      const grantedPowers = [ ...(this._getGrantedPowers()||[]).filter(p=>p._grantedFrom!=='origin'), ...this._originGrantSubset(this._computePowerLimit()) ];

      wrap.innerHTML = `<h3>Revisão</h3>
        <div class="mmc-rank-display">RANK ${this.state.rank}</div>
        ${warnings.length?`<div class="mmc-warn">${warnings.map(w=>`<div>⚠️ ${w}</div>`).join('')}</div>`:''}
        <ul class="mmc-summary">
          <li><strong>Atributos:</strong> M${this.state.abilities.mle} A${this.state.abilities.agl} R${this.state.abilities.res} V${this.state.abilities.vig} E${this.state.abilities.ego} L${this.state.abilities.log}</li>
          <li><strong>Ocupação:</strong> ${this.state.occupation?.name||'—'}</li>
          <li><strong>Origem:</strong> ${this.state.origin?.name||'—'}</li>
          <li><strong>Traços:</strong> ${[...(this.state.occupation?.system?.traits||[]), ...(this.state.origin?.system?.traits||[]), ...(this.state.selectedTraits||[])].map(t=>t.name).join(', ')||'—'}</li>
          <li><strong>Tags:</strong> ${[...(this.state.occupation?.system?.tags||[]), ...(this.state.origin?.system?.tags||[]), ...(this.state.selectedTags||[])].map(t=>t.name).join(', ')||'—'}</li>
          <li><strong>Poderes (concedidos + escolhidos):</strong> ${[...grantedPowers, ...(this.state.chosenPowers||[])].map(p=>p.name).join(', ')||'—'}</li>
          <li><strong>Limite / Escolhidos:</strong> ${chosenCount} / ${limit}</li>
        </ul>
        <hr>
        <h3>Biografia</h3>
        <div class="mmc-grid" style="grid-template-columns: 1fr 1fr; gap:10px;">
          ${this._bioInput('codename','Codinome', bio.codename)}
          ${this._bioInput('realname','Nome Real', bio.realname)}
          ${this._bioInput('gender','Gênero', bio.gender)}
          ${this._bioSelectSize('size','Tamanho', bio.size)}
          ${this._bioInput('height','Altura', bio.height)}
          ${this._bioInput('weight','Peso', bio.weight)}
        </div>
        <div class="mmc-field" style="grid-column:1/-1;"><label>Histórico</label><textarea name="bio.history">${bio.history||''}</textarea></div>
        <div class="mmc-field" style="grid-column:1/-1;"><label>Personalidade</label><textarea name="bio.personality">${bio.personality||''}</textarea></div>
        <hr>
        <h3>Exportação</h3>
        <div class="mmc-grid" style="grid-template-columns: 1fr 1fr; gap:10px;">
          <div class="mmc-field"><label>Template do PDF</label>
            <select class="mmc-select" name="export.theme">
              <option value="red">Red</option>
              <option value="black">Black</option>
              <option value="blue">Blue</option>
              <option value="gray">Gray</option>
              <option value="orange">Orange</option>
              <option value="pink">Pink</option>
              <option value="purple">Purple</option>
            </select>
          </div>
          <div class="mmc-field"><label>Opções</label>
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;">
              <input type="checkbox" name="export.includeExtras"> Incluir páginas extras (descrições)
            </label>
          </div>
        </div>
        <div class="mmc-small" style="margin-top:8px;opacity:.95;">
          Use os botões na barra inferior para baixar PDF/JSON, importar JSON ou resetar.
        </div>
      `;

      // Listeners for bio
      wrap.querySelectorAll('[data-bio]').forEach(inp=>{
        const handler = (ev)=>{ const key = ev.currentTarget.dataset.bio; this.state.bio[key] = ev.currentTarget.value; };
        inp.addEventListener('input', handler);
        inp.addEventListener('change', handler);
      });
      wrap.querySelector('textarea[name="bio.history"]').addEventListener('input', ev=> this.state.bio.history = ev.target.value);
      wrap.querySelector('textarea[name="bio.personality"]').addEventListener('input', ev=> this.state.bio.personality = ev.target.value);

      // Export options
      const themeSel = wrap.querySelector('select[name="export.theme"]');
      themeSel.value = this.state.export.theme || 'red';
      themeSel.addEventListener('change', ev=> this.state.export.theme = ev.target.value);
      const extrasCb = wrap.querySelector('input[name="export.includeExtras"]');
      extrasCb.checked = this.state.export.includeExtras !== false;
      extrasCb.addEventListener('change', ev=> this.state.export.includeExtras = !!ev.target.checked);


      return wrap;
    }

    // ---------- Export / Build actor ----------
    async _buildActorForExport(){
      const actorData = deepClone(this.state.actorModel ?? {});
      if (!actorData?.system){
        ui.notifications.error('Ator modelo ausente em data/actor-modelo.json');
        return null;
      }

      actorData.system.attributes.rank.value = this.state.rank;
      for (const k of Object.keys(this.state.abilities||{})){
        if (actorData.system.abilities?.[k]) actorData.system.abilities[k].value = this.state.abilities[k];
      }
      const calc = (v)=> Math.max(10, (v??0)*30);
      actorData.system.health = actorData.system.health || {};
      actorData.system.focus  = actorData.system.focus  || {};
      actorData.system.health.max = calc(this.state.abilities.res);
      actorData.system.health.value = actorData.system.health.max;
      actorData.system.focus.max = calc(this.state.abilities.vig);
      actorData.system.focus.value = actorData.system.focus.max;

      for (const [k,v] of Object.entries(this.state.bio||{})) actorData.system[k] = v;

      actorData.name = (this.state.bio.codename?.trim()) || (this.state.bio.realname?.trim()) || actorData.name || 'Herói';
      if (this.state.bio?.size) actorData.system.size = String(this.state.bio.size).toLowerCase();

      const items = [];
      if (this.state.occupation) items.push(this.state.occupation);
      if (this.state.origin) items.push(this.state.origin);

      const grantedTraits = [ ...(this.state.occupation?.system?.traits || []), ...(this.state.origin?.system?.traits || []) ];
      const grantedTags   = [ ...(this.state.occupation?.system?.tags   || []), ...(this.state.origin?.system?.tags   || []) ];

      const preparedTraits = MMCCharactermancer._mmcDedupByName([ ...grantedTraits, ...(this.state.selectedTraits||[]) ]).map(it=>{
        const clone = deepClone(it ?? {});
        if (!clone.mmcKind) clone.mmcKind = 'trait';
        if (!clone.type && clone.mmcKind) clone.type = clone.mmcKind;
        return clone;
      });
      const preparedTags = MMCCharactermancer._mmcDedupByName([ ...grantedTags, ...(this.state.selectedTags||[]) ]).map(it=>{
        const clone = deepClone(it ?? {});
        if (!clone.mmcKind) clone.mmcKind = 'tag';
        if (!clone.type && clone.mmcKind) clone.type = clone.mmcKind;
        return clone;
      });

      const grantedPowers = [ ...(this._getGrantedPowers()||[]).filter(p=>p._grantedFrom!=='origin'), ...this._originGrantSubset(this._computePowerLimit()) ];
      const byName = new Set(grantedPowers.map(p=>(p.name||'').toLowerCase()));
      const chosen = (this.state.chosenPowers||[]).filter(p=> !byName.has((p.name||'').toLowerCase()));

      const collapseNumericSeries = (arr)=>{
        const best = new Map();
        for (const it of arr||[]){
          const name = String(it?.name||'');
          const m = name.match(/^(.*?)(?:\s+(\d+))$/);
          if (!m){
            const base = name.toLowerCase();
            if (!best.get(base)) best.set(base, {num:null, item:it});
            continue;
          }
          const base = m[1].toLowerCase();
          const num = Number(m[2]||0);
          const prev = best.get(base);
          if (!prev || (prev.num ?? -1) < num) best.set(base, {num, item:it});
        }
        return Array.from(best.values()).map(v=>v.item);
      };

      const cleanedPowers = collapseNumericSeries([ ...grantedPowers, ...chosen ]);
      const cleanedNames = new Set(cleanedPowers.map(p=>(p.name||'').toLowerCase()));
      const keptChosen = (chosen||[]).filter(p=> cleanedNames.has((p.name||'').toLowerCase()));
      const keptGranted = (grantedPowers||[]).filter(p=> cleanedNames.has((p.name||'').toLowerCase()));

      items.push(...preparedTraits, ...preparedTags, ...keptGranted, ...keptChosen);

      const fixedItems = [];
      for (const it of items){
        const fallback = it?.mmcKind || (it?.system?.powerSet!==undefined || it?.system?.actionType ? 'power' : undefined);
        fixedItems.push(await MMCCharactermancer._mmcEnsureType(it, fallback));
      }

      const actor = { name: actorData.name, system: actorData.system, items: fixedItems };
      return actor;
    }

    async _downloadPdf(){
      const actor = await this._buildActorForExport();
      if (!actor) return;
      if (!window.M616Export?.exportActor){
        ui.notifications.error('M616Export não carregou.');
        return;
      }
      await window.M616Export.exportActor(actor, {
        theme: this.state.export.theme || 'red',
        includeExtras: this.state.export.includeExtras !== false
      });
    }

    _downloadJson(){
      const payload = this._buildFoundryActorJson();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const name = (this.state.bio.codename||this.state.bio.realname||'actor').replace(/[^\w\-]+/g,'_');
      a.download = `fvtt-Actor-${name}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 1000);
    }

    async _importJsonFile(file){
      const txt = await file.text();
      const obj = JSON.parse(txt);

      // Accept wrapper: { _type, version, step, state }
      if (obj && (obj._type === 'multiverse-d616-charactermancer-site' || obj.state)){
        return this._importStateInternal(obj);
      }

      // Foundry Actor export: direct actor document or wrapped under {actor:...}
      const actor = (obj?.system && Array.isArray(obj?.items)) ? obj : (obj?.actor?.system && Array.isArray(obj?.actor?.items) ? obj.actor : null);
      if (!actor) throw new Error('Formato de JSON não reconhecido.');

      await this._importFoundryActor(actor);
    }

    _importStateInternal(obj){
      const incoming = obj?.state ?? obj;
      if (!incoming || typeof incoming !== 'object') throw new Error('invalid');

      // Keep loaded data references, replace user selections only
      const keepData = this.state.data;
      const keepActorModel = this.state.actorModel;
      const keepPowerSets = this.state.powerSets;

      this.state = mergeObject(this._freshState(), incoming, { recursive: true });
      this.state.data = keepData;
      this.state.actorModel = keepActorModel;
      this.state.powerSets = keepPowerSets;

      this.step = 0;
      this.render(true);
    }

    async _importFoundryActor(actor){
      // Preserve the original actor as a base (prototypeToken, movement, etc.)
      try{
        this.state.foundry = this.state.foundry || {};
        this.state.foundry.baseActor = deepClone(actor);
      }catch(_){ /* ignore */ }

      // Rank
      const rawRank = Number(actor?.system?.attributes?.rank?.value ?? actor?.system?.attributes?.rank ?? 1);
      const rank = Math.max(1, Math.min(6, isNaN(rawRank)?1:rawRank));
      this.state.rank = rank;
      this.state.maxAbility = this._getMaxAttributeForRank(rank);

      // Abilities (M.A.R.V.E.L.)
      const keys = ['mle','agl','res','vig','ego','log'];
      for (const k of keys){
        const v = Number(actor?.system?.abilities?.[k]?.value ?? 0);
        this.state.abilities[k] = isNaN(v) ? 0 : v;
      }

      // Bio / identity
      const bioKeys = ['codename','realname','gender','size','height','weight','eyes','hair','teams','base','history','personality','distinguishingFeatures'];
      for (const k of bioKeys){
        if (actor?.system?.[k] !== undefined) this.state.bio[k] = actor.system[k] ?? '';
      }
      if (this.state.bio?.size) this.state.bio.size = String(this.state.bio.size).toLowerCase();

      // Helper: find by name in our datasets
      const findByName = (arr, name)=>{
        const n = String(name||'').trim().toLowerCase();
        if (!n) return null;
        return (arr||[]).find(it=> String(it?.name||'').trim().toLowerCase() === n) || null;
      };

      // Occupation & Origin (prefer items[], fallback to system.occupations/origins names)
      const items = Array.isArray(actor?.items) ? actor.items : [];
      const occItem = items.find(i=>i?.type==='occupation') || null;
      const orgItem = items.find(i=>i?.type==='origin') || null;

      const occName = occItem?.name || actor?.system?.occupations?.[0]?.name;
      const orgName = orgItem?.name || actor?.system?.origins?.[0]?.name;

      this.state.occupation = findByName(this.state.data.occupations, occName) || occItem || null;
      this.state.origin = findByName(this.state.data.origins, orgName) || orgItem || null;

      // Granted Traits/Tags (from occupation/origin definitions)
      const grantedTraits = [ ...(this.state.occupation?.system?.traits||[]), ...(this.state.origin?.system?.traits||[]) ];
      const grantedTags   = [ ...(this.state.occupation?.system?.tags||[]),   ...(this.state.origin?.system?.tags||[])   ];
      const grantedTraitNames = new Set(grantedTraits.map(t=>String(t?.name||'').toLowerCase()));
      const grantedTagNames   = new Set(grantedTags.map(t=>String(t?.name||'').toLowerCase()));

      // Traits/Tags selected explicitly
      const traitItems = items.filter(i=>i?.type==='trait');
      const tagItems   = items.filter(i=>i?.type==='tag');

      const pickedTraits = [];
      for (const t of traitItems){
        const n = String(t?.name||'').toLowerCase();
        if (!n || grantedTraitNames.has(n)) continue;
        pickedTraits.push(findByName(this.state.data.traits, t.name) || t);
      }
      const pickedTags = [];
      for (const t of tagItems){
        const n = String(t?.name||'').toLowerCase();
        if (!n || grantedTagNames.has(n)) continue;
        pickedTags.push(findByName(this.state.data.tags, t.name) || t);
      }
      this.state.selectedTraits = MMCCharactermancer._mmcDedupByName(pickedTraits);
      this.state.selectedTags = MMCCharactermancer._mmcDedupByName(pickedTags);

      // Powers (skip granted ones)
      const powerItems = items.filter(i=>i?.type==='power');

      // Compute granted powers from current occupation/origin
      const limit = this._computePowerLimit();
      const grantedPowers = [ ...(this._getGrantedPowers()||[]).filter(p=>p._grantedFrom!=='origin'), ...this._originGrantSubset(limit) ];
      const grantedPowerNames = new Set(grantedPowers.map(p=>String(p?.name||'').toLowerCase()));
      const grantedPowerIds = new Set(grantedPowers.map(p=>p?._id).filter(Boolean));

      const lookupPower = (power)=>{
        const nm = String(power?.name||'').trim().toLowerCase();
        const set = String(power?.system?.powerSet || power?.system?.powerSetName || '').trim().toLowerCase();
        // Try strict match by name+set, fallback by name only
        const all = (this.state.data.powers||[]);
        const byNameSet = all.find(p=> String(p?.name||'').trim().toLowerCase()===nm && String(p?.system?.powerSet||'').trim().toLowerCase()===set);
        if (byNameSet) return byNameSet;
        const byName = all.find(p=> String(p?.name||'').trim().toLowerCase()===nm);
        return byName || null;
      };

      const chosen = [];
      for (const p of powerItems){
        const n = String(p?.name||'').toLowerCase();
        if (!n) continue;
        const isGranted = grantedPowerNames.has(n) || (p?._id && grantedPowerIds.has(p._id));
        if (isGranted) continue;

        const mapped = lookupPower(p) || p;
        // Ensure minimal fields for non-catalog powers
        if (!mapped.type) mapped.type = 'power';
        if (!mapped.system) mapped.system = (p.system||{});
        if (mapped.system && mapped.system.powerSet == null && p?.system?.powerSet != null) mapped.system.powerSet = p.system.powerSet;
        chosen.push(mapped);
      }
      this.state.chosenPowers = MMCCharactermancer._mmcDedupPowersByNameAndSet(chosen);

      // Pick a reasonable Power Set dropdown value after import
      const nonBasic = (this.state.chosenPowers||[]).find(p=>String(p?.system?.powerSet||'Basic')!=='Basic');
      if (nonBasic?.system?.powerSet) this.state.powerSet = nonBasic.system.powerSet;
      else this.state.powerSet = (this.state.powerSets?.[0] ?? '');

      // Always return to Step 1 after import
      this.step = 0;
      this.render(true);
    }

    _buildFoundryActorJson(){
      const base = (this.state.foundry?.baseActor) ? deepClone(this.state.foundry.baseActor) : deepClone(this.state.actorModel ?? {});
      if (!base?.system) base.system = {};
      if (!base?.system?.attributes) base.system.attributes = {};
      if (!base.system.attributes.rank) base.system.attributes.rank = { value: 1 };

      base.system.attributes.rank.value = this.state.rank;

      // Abilities
      if (!base.system.abilities) base.system.abilities = {};
      for (const k of Object.keys(this.state.abilities||{})){
        base.system.abilities[k] = base.system.abilities[k] || {};
        base.system.abilities[k].value = this.state.abilities[k];
      }

      // Health/Focus (same logic as PDF export)
      const calc = (v)=> Math.max(10, (v??0)*30);
      base.system.health = base.system.health || {};
      base.system.focus  = base.system.focus  || {};
      base.system.health.max = calc(this.state.abilities.res);
      base.system.health.value = base.system.health.max;
      base.system.focus.max = calc(this.state.abilities.vig);
      base.system.focus.value = base.system.focus.max;

      // Bio fields
      for (const [k,v] of Object.entries(this.state.bio||{})) base.system[k] = v;
      base.name = (this.state.bio.codename?.trim()) || (this.state.bio.realname?.trim()) || base.name || 'Herói';

      // Items — mimic charactermancer export (include granted on the actor file)
      const items = [];
      if (this.state.occupation) items.push(this.state.occupation);
      if (this.state.origin) items.push(this.state.origin);

      const grantedTraits = [ ...(this.state.occupation?.system?.traits || []), ...(this.state.origin?.system?.traits || []) ];
      const grantedTags   = [ ...(this.state.occupation?.system?.tags   || []), ...(this.state.origin?.system?.tags   || []) ];

      const preparedTraits = MMCCharactermancer._mmcDedupByName([ ...grantedTraits, ...(this.state.selectedTraits||[]) ]).map(it=>{
        const clone = deepClone(it ?? {});
        if (!clone.type) clone.type = 'trait';
        return clone;
      });
      const preparedTags = MMCCharactermancer._mmcDedupByName([ ...grantedTags, ...(this.state.selectedTags||[]) ]).map(it=>{
        const clone = deepClone(it ?? {});
        if (!clone.type) clone.type = 'tag';
        return clone;
      });

      const limit = this._computePowerLimit();
      const grantedPowers = [ ...(this._getGrantedPowers()||[]).filter(p=>p._grantedFrom!=='origin'), ...this._originGrantSubset(limit) ];
      const byName = new Set(grantedPowers.map(p=>(p.name||'').toLowerCase()));
      const chosen = (this.state.chosenPowers||[]).filter(p=> !byName.has((p.name||'').toLowerCase()));

      items.push(...preparedTraits, ...preparedTags, ...grantedPowers, ...chosen);

      base.items = [];
      for (const it of items){
        const kind = it?.type || it?.mmcKind || (it?.system?.powerSet ? 'power' : undefined);
        const clone = deepClone(it ?? {});
        if (!clone.type && kind) clone.type = kind;
        base.items.push(clone);
      }

      // Effects remain as-is; optional
      return base;
    }

    _importState(obj){
      return this._importStateInternal(obj);
    }


    resetAll(){
      this.step = 0;
      const keepData = this.state.data;
      const keepActorModel = this.state.actorModel;
      const keepPowerSets = this.state.powerSets;
      this.state = this._freshState();
      this.state.data = keepData;
      this.state.actorModel = keepActorModel;
      this.state.powerSets = keepPowerSets;
      this.state.powerSet = keepPowerSets?.[0] ?? '';
      this.render(true);
      ui.notifications.info('Dados resetados.');
    }

    async _onNext(){
      if (this.step < this.steps.length-1){
        this.step += 1;
        return this._refreshPowerChips();
      }
      // Last step: export PDF
      return this._downloadPdf();
    }
  }

  // ---------- Boot ----------
  document.addEventListener('DOMContentLoaded', async ()=>{
    const versionEl = document.getElementById('version');
    if (versionEl) versionEl.textContent = `v${SITE_VERSION}`;

    const root = document.getElementById(ROOT_ID);
    if (!root){
      console.error('Root not found');
      return;
    }

    const app = new MMCCharactermancer();
    app.root = root;
    await app.render(true);

    // Expose helpers
    window.mmcApp = app;
    window.mmcReset = ()=> app.resetAll();
  });
})();

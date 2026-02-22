/* Sheet Export — Marvel Multiverse (D616) — Web Port
 * Based on sheet-export-m616 v0.3.54
 * License/credit: original module by RodrigoSinistro.
 */

(function(){
  'use strict';

  const M616 = {
    VERSION: '0.3.54-web',
    TEMPLATES: {
      red:   'assets/templates/M616 Character Sheet - Alt Red.pdf',
      black: 'assets/templates/M616 Character Sheet - Alt Black.pdf',
      blue:  'assets/templates/M616 Character Sheet - Alt Blue.pdf',
      gray:  'assets/templates/M616 Character Sheet - Alt Gray.pdf',
      orange:'assets/templates/M616 Character Sheet - Alt Orange.pdf',
      pink:  'assets/templates/M616 Character Sheet - Alt Pink.pdf',
      purple:'assets/templates/M616 Character Sheet - Alt Purple.pdf',
    },
    LONG_FIELDS: ['Text38','Text39','Text40','Text41','Text42'],
    FLATTEN_SIZE: 17,
  };

  function notify(type, msg){
    try{
      if (window.MMCNotify) return window.MMCNotify(type, msg);
    }catch(_){/* ignore */}
    if (type === 'error') alert(msg);
    else console.log(`[${type}] ${msg}`);
  }

  /* ------- Utils ------- */
  function get(obj, path){ try{ const parts = String(path).split('.'); let o=obj; for(const p of parts){ if(o==null) return; o=o[p]; } return o; }catch{} }
  function nvl(a,b){ return (a!==undefined && a!==null) ? a : b; }
  function nvl3(a,b,c){ return nvl(nvl(a,b), c); }
  function stripHtml(html){ if(!html) return ''; const div=document.createElement('div'); div.innerHTML=String(html); return (div.textContent||div.innerText||'').trim(); }
  function cleanText(v){ const t=stripHtml(v); return t? t.replace(/\s+/g,' ').trim() : ''; }
  function normalizePdfText(text){
    if (!text) return '';
    let t = String(text);
    const map = { "\u00A0":" ", "\u2010":"-","\u2011":"-","\u2012":"-","\u2013":"-","\u2014":"-","\u2212":"-",
      "\u2018":"'","\u2019":"'","\u201A":"'","\u201B":"'","\u201C":'"',"\u201D":'"',"\u201E":'"',
      "\u2026":"...","\u2022":"-","\u00B7":"-"};
    return t.replace(/[\u00A0\u2010-\u2014\u2212\u2018-\u201E\u2026\u2022\u00B7]/g, ch => map[ch] || '');
  }
  function fmtDR(v){ const n = Number(v)||0; if(n===0) return '0'; return `-${Math.abs(n)}`; }
  function abilityDefense(val){ return String(10 + (Number(val)||0)); }
  function fmtSigned(v){ const n=Number(v); if(isNaN(n)) return v??''; return n>=0?`+${n}`:`${n}`; }

  // Apply Foundry-like ActiveEffect changes (minimal subset) so exports match what the FVTT system would prepare.
  function deepClone(obj){
    try{ return structuredClone(obj); }catch(_){ return JSON.parse(JSON.stringify(obj ?? {})); }
  }
  function parseEffectValue(v){
    if (v === null || v === undefined) return 0;
    const s = String(v).trim();
    if (s === 'true') return true;
    if (s === 'false') return false;
    const n = Number(s);
    if (!Number.isNaN(n)) return n;
    return s;
  }
  function setByPath(obj, path, value){
    const parts = String(path||'').split('.').filter(Boolean);
    if (!parts.length) return;
    let o = obj;
    for (let i=0;i<parts.length-1;i++){
      const p = parts[i];
      if (o[p] == null || typeof o[p] !== 'object') o[p] = {};
      o = o[p];
    }
    o[parts[parts.length-1]] = value;
  }
  function applyChange(root, key, mode, value){
    const path = String(key||'').startsWith('system.') ? String(key).slice(7) : String(key||'');
    if (!path) return;
    const cur = get(root, path);
    const v = parseEffectValue(value);
    // Foundry modes: 1 MULTIPLY, 2 ADD, 5 OVERRIDE
    if (mode === 2){
      const a = Number(cur)||0;
      const b = (typeof v === 'number') ? v : Number(v)||0;
      setByPath(root, path, a + b);
    } else if (mode === 1){
      const a = Number(cur)||0;
      const b = (typeof v === 'number') ? v : Number(v)||1;
      setByPath(root, path, a * b);
    } else if (mode === 5 || mode === 0){
      setByPath(root, path, v);
    }
  }
  function computePreparedSystem(sysRaw, items){
    const sys = deepClone(sysRaw || {});
    sys.attributes = sys.attributes || {};
    sys.abilities = sys.abilities || {};
    const keys = ['mle','agl','res','vig','ego','log'];

    // If the actor came from a raw JSON export, many derived fields will be 0.
    // Defense score is never below 10, damage multipliers are never below 1.
    // In Multiverse-D616 FVTT, non-combat checks are stored as the TOTAL modifier (ability value + bonuses).
    const dmgKeys = new Set(['mle','agl','ego','log']);
    const needs = keys.some(k => {
      const a = sys.abilities?.[k] || {};
      const v = Number(a.value||0);
      const needsDefense = (a.defense == null) || Number(a.defense||0) < 10;
      const needsNoncom = (a.noncom == null) || (Number(a.noncom||0) === 0 && v !== 0);
      const needsMult = dmgKeys.has(k) ? ((a.damageMultiplier == null) || Number(a.damageMultiplier||0) < 1) : false;
      return needsDefense || needsNoncom || needsMult;
    });
    if (!needs) return sys;

    // Base derived values (match Multiverse-D616 FVTT behavior)
    // - Defense score shown on the sheet is TOTAL: 10 + ability value (+ any bonuses via effects)
    // - Non-combat checks shown on the sheet is TOTAL: ability value (+ any bonuses via effects)
    for (const k of keys){
      sys.abilities[k] = sys.abilities[k] || {};
      const val = Number(sys.abilities[k].value || 0);
      sys.abilities[k].defense = 10 + val;
      sys.abilities[k].noncom = val;
    }
    // Damage multiplier base (dMarvel x Multiplier + Ability)
    for (const k of ['mle','agl','ego','log']){
      sys.abilities[k].damageMultiplier = Math.max(1, Number(sys.abilities[k].damageMultiplier || 0));
    }

    // Initiative base (most common rule in Multiverse sheets): Agility + Vigilance
    if (sys.attributes?.init){
      const curInit = Number(sys.attributes.init.value || 0);
      const baseInit = Number(sys.abilities.agl?.value||0) + Number(sys.abilities.vig?.value||0);
      if (!curInit && baseInit) sys.attributes.init.value = baseInit;
    }

    // Apply transferable ActiveEffects from items
    const allItems = Array.from(items || []);
    for (const it of allItems){
      const effects = Array.from(it?.effects || []);
      for (const ef of effects){
        if (ef?.disabled) continue;
        if (ef?.transfer === false) continue;
        for (const ch of Array.from(ef?.changes || [])){
          // If an effect changes an ability value, keep the derived totals in sync.
          const keyPath = String(ch?.key||'');
          const m = keyPath.match(/^system\.abilities\.(mle|agl|res|vig|ego|log)\.value$/);
          if (m){
            const ab = m[1];
            const before = Number(get(sys, `abilities.${ab}.value`) || 0);
            applyChange(sys, ch?.key, ch?.mode, ch?.value);
            const after = Number(get(sys, `abilities.${ab}.value`) || 0);
            const delta = after - before;
            if (delta){
              setByPath(sys, `abilities.${ab}.defense`, Number(get(sys,`abilities.${ab}.defense`)||0) + delta);
              setByPath(sys, `abilities.${ab}.noncom`,  Number(get(sys,`abilities.${ab}.noncom`)||0) + delta);
            }
          } else {
            applyChange(sys, ch?.key, ch?.mode, ch?.value);
          }
        }
      }
    }

    // Sanity clamps
    for (const k of keys){
      const v = Number(get(sys, `abilities.${k}.value`) || 0);
      const d = Number(get(sys, `abilities.${k}.defense`) || (10+v));
      if (d < 10) setByPath(sys, `abilities.${k}.defense`, 10 + v);
      const nc = Number(get(sys, `abilities.${k}.noncom`) || v);
      setByPath(sys, `abilities.${k}.noncom`, nc);
    }
    for (const k of ['mle','agl','ego','log']){
      const dm = Number(get(sys, `abilities.${k}.damageMultiplier`) || 0);
      if (dm < 1) setByPath(sys, `abilities.${k}.damageMultiplier`, 1);
    }

    // Keep current = max after max-modifying effects (common expectation when exporting a fresh sheet)
    if (sys.health?.max != null) sys.health.value = sys.health.max;
    if (sys.focus?.max != null) sys.focus.value = sys.focus.max;
    if (sys.karma?.max != null && (sys.karma.value == null || Number(sys.karma.value) === 0)) sys.karma.value = sys.karma.max;

    return sys;
  }

  async function ensureAcroFormDA(pdfDoc, sizePt, helv){
    const {PDFName, PDFString, PDFDict, PDFBool} = window.PDFLib;
    const ctx = pdfDoc.context;
    let acro = pdfDoc.catalog.lookup(PDFName.of('AcroForm'), PDFDict);
    if (!acro){ acro = ctx.obj({}); pdfDoc.catalog.set(PDFName.of('AcroForm'), acro); }
    let dr = acro.lookup(PDFName.of('DR'), PDFDict);
    if (!dr){ dr = ctx.obj({}); acro.set(PDFName.of('DR'), dr); }
    let font = dr.lookup(PDFName.of('Font'), PDFDict);
    if (!font){ font = ctx.obj({}); dr.set(PDFName.of('Font'), font); }
    font.set(PDFName.of('Helv'), helv.ref);
    acro.set(PDFName.of('DA'), PDFString.of(`/Helv ${sizePt} Tf 0 g`));
    acro.set(PDFName.of('NeedAppearances'), PDFBool.False);
  }
  function setFieldDA(tf, size){
    const {PDFName, PDFString} = window.PDFLib;
    const da = `/Helv ${size} Tf 0 g`;
    try { tf.acroField?.set(PDFName.of('DA'), PDFString.of(da)); } catch {}
    try {
      const widgets = tf.acroField?.getWidgets?.() ?? [];
      for (const w of widgets){
        if (w.dict.has?.(PDFName.of('AP'))) w.dict.delete?.(PDFName.of('AP'));
        w.dict.set(PDFName.of('DA'), PDFString.of(da));
      }
    } catch {}
  }
  function setText(form, name, value, size){
    try { const tf = form.getTextField(name); setFieldDA(tf, size||M616.FLATTEN_SIZE); tf.setText(value==null?'':String(value)); } catch {}
  }

  /* ------- Long columns ------- */
  function collectLong(actor){
    const items = Array.from(actor?.items ?? []);
    const uniq = arr => Array.from(new Set(arr.map(s => String(s||'').trim()).filter(Boolean)));
    const traits = uniq(items.filter(i=>i.type==='trait').map(i=>i.name));
    const tags   = uniq(items.filter(i=>i.type==='tag').map(i=>i.name));
    const powers = uniq(items.filter(i=>i.type==='power').map(i=>i.name));
    const perCol = Math.ceil(powers.length/3) || 0;
    const cols = [powers.slice(0,perCol), powers.slice(perCol,2*perCol), powers.slice(2*perCol)];
    const bullet = s=>`• ${s}`;
    return { traits: traits.map(bullet), tags: tags.map(bullet), pow1: cols[0].map(bullet), pow2: cols[1].map(bullet), pow3: cols[2].map(bullet) };
  }
  function pickLongSize(lines){ const txt=lines.join(' '); if(lines.length>22||txt.length>900) return 12; if(lines.length>14||txt.length>500) return 14; return 17; }

  function wrapText(font, text, size, maxWidth){
    text = normalizePdfText(text||'');
    const words = String(text||'').split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words){
      const test = cur ? (cur + ' ' + w) : w;
      const width = font.widthOfTextAtSize(test, size);
      if (width <= maxWidth) { cur = test; }
      else {
        if (cur) lines.push(cur);
        if (font.widthOfTextAtSize(w, size) > maxWidth){
          let acc = '';
          for (const ch of w){
            const t = acc + ch;
            if (font.widthOfTextAtSize(t, size) > maxWidth){ if(acc) lines.push(acc); acc = ch; } else acc = t;
          }
          cur = acc;
        } else cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  async function ensureDeps(){
    if(!window.PDFLib) await loadScript('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js');
    if(!window.saveAs) await loadScript('https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js');
  }
  function loadScript(src){
    return new Promise((res,rej)=>{
      const s=document.createElement('script');
      s.src=src;
      s.onload=()=>res();
      s.onerror=e=>rej(e);
      document.head.appendChild(s);
    });
  }

  /* ------- Export ------- */
  async function exportActor(actor, opts={}){
    try{
      await ensureDeps();
      const { PDFDocument, StandardFonts, rgb } = window.PDFLib;

      const theme = (opts.theme || 'red').toLowerCase();
      const tplPath = M616.TEMPLATES[theme] || M616.TEMPLATES.red;

      const bytes = await fetch(tplPath).then(r=>r.arrayBuffer());
      const pdfDoc = await PDFDocument.load(bytes);
      const form = pdfDoc.getForm();
      const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      await ensureAcroFormDA(pdfDoc, 12, helv);

      const items = Array.from(actor?.items ?? []);
      // In Foundry, derived stats and ActiveEffects are prepared at runtime.
      // In the static site we compute the relevant derived fields so the PDF matches FVTT.
      const sys = computePreparedSystem(actor?.system || {}, items);

      const name = nvl(sys.codename, actor?.name);
      setText(form, 'Name1', normalizePdfText(name), 17);

      setText(form, 'Text1',  nvl3(get(sys,'attributes.rank.value'), get(sys,'attributes.rank.max'), ''));
      setText(form, 'Text28', nvl3(get(sys,'karma.value'), get(sys,'karma.max'), ''));

      setText(form, 'Text29', nvl3(get(sys,'health.value'), get(sys,'health.max'), ''));
      setText(form, 'Text30', fmtDR(get(sys,'healthDamageReduction')));
      setText(form, 'Text31', nvl3(get(sys,'focus.value'), get(sys,'focus.max'), ''));
      setText(form, 'Text32', fmtDR(get(sys,'focusDamageReduction')));

      const initV = get(sys,'attributes.init.value');
      const edge = !!get(sys,'attributes.init.edge');
      setText(form, 'Text33', initV!=null ? (edge ? (initV+'E') : String(initV)) : '');

      setText(form, 'Text34', nvl(get(sys,'movement.run.value'), get(sys,'movement.run')));
      setText(form, 'Text35', nvl(get(sys,'movement.climb.value'), ''));
      setText(form, 'Text36', nvl(get(sys,'movement.swim.value'), ''));
      const lastSpeed = nvl3(get(sys,'movement.jump.value'), get(sys,'movement.flight.value'), get(sys,'movement.glide.value'));
      setText(form, 'Text37', nvl(lastSpeed,''));

      const blocks = [['mle',2],['agl',5],['res',8],['vig',11],['ego',14],['log',17]];
      for (let i=0;i<blocks.length;i++){
        const key=blocks[i][0], base=blocks[i][1];
        const val = nvl(get(sys,`abilities.${key}.value`), 0);
        const def = nvl(get(sys,`abilities.${key}.defense`), abilityDefense(val));
        const non = nvl(get(sys,`abilities.${key}.noncom`), 0);
        setText(form, `Text${base}`,   val);
        setText(form, `Text${base+1}`, def);
        setText(form, `Text${base+2}`, fmtSigned(non));
      }

      setText(form, 'Text20', nvl(get(sys,'abilities.mle.damageMultiplier'), 0));
      setText(form, 'Text21', nvl(get(sys,'abilities.mle.value'), 0));
      setText(form, 'Text22', nvl(get(sys,'abilities.agl.damageMultiplier'), 0));
      setText(form, 'Text23', nvl(get(sys,'abilities.agl.value'), 0));
      setText(form, 'Text24', nvl(get(sys,'abilities.ego.damageMultiplier'), 0));
      setText(form, 'Text25', nvl(get(sys,'abilities.ego.value'), 0));
      setText(form, 'Text26', nvl(get(sys,'abilities.log.damageMultiplier'), 0));
      setText(form, 'Text27', nvl(get(sys,'abilities.log.value'), 0));

      setText(form, 'Text43', nvl(get(sys,'realname'), ''));
      setText(form, 'Text44', nvl(get(sys,'height'), ''));
      setText(form, 'Text45', nvl(get(sys,'weight'), ''));
      setText(form, 'Text46', nvl(get(sys,'gender'), ''));
      setText(form, 'Text47', nvl(get(sys,'eyes'), ''));
      setText(form, 'Text48', nvl(get(sys,'hair'), ''));
      setText(form, 'Text49', nvl(get(sys,'size'), ''));
      setText(form, 'Text50', nvl(get(sys,'distinguishingFeatures'), ''));

      const occ = items.filter(i=>i.type==='occupation').map(i=>i.name).join(', ');
      const ori = items.filter(i=>i.type==='origin').map(i=>i.name).join(', ');
      setText(form, 'Text51', occ);
      setText(form, 'Text52', ori);
      // Extra bio fields (same as the Foundry exporter)
      setText(form, 'Text53', nvl(get(sys,'teams'), ''));
      setText(form, 'Text54', nvl(get(sys,'base'), ''));
      setText(form, 'Text55', cleanText(get(sys,'history')));
      setText(form, 'Text56', cleanText(get(sys,'personality')));

      // Long columns (Traits/Tags/Powers)
      const long = collectLong(actor);
      const sizeTraits = pickLongSize(long.traits);
      const sizeTags = pickLongSize(long.tags);
      const sizeP1 = pickLongSize(long.pow1);
      const sizeP2 = pickLongSize(long.pow2);
      const sizeP3 = pickLongSize(long.pow3);
      // Field mapping follows the Foundry module (sheet-export-m616):
      // Text38=Traits, Text39=Tags, Text40..42=Powers columns
      setText(form, 'Text38', normalizePdfText(long.traits.join('\n')), sizeTraits);
      setText(form, 'Text39', normalizePdfText(long.tags.join('\n')), sizeTags);
      setText(form, 'Text40', normalizePdfText(long.pow1.join('\n')), sizeP1);
      setText(form, 'Text41', normalizePdfText(long.pow2.join('\n')), sizeP2);
      setText(form, 'Text42', normalizePdfText(long.pow3.join('\n')), sizeP3);

      // Keep form fields editable (do NOT flatten)
      try{ form.updateFieldAppearances(helv); }catch(_){/* ignore */}

      // Optional extra pages (like module): details of powers/traits/tags descriptions
      const includeExtras = opts.includeExtras !== false;
      if (includeExtras){
        const powers = items.filter(i=>i.type==='power').map(p => ({
          name: p.name,
          effect: cleanText(p.system?.effect || p.system?.description || ''),
          powerSet: cleanText(p.system?.powerSet || ''),
          action: cleanText(p.system?.action || ''),
          trigger: cleanText(p.system?.trigger || ''),
          duration: cleanText(p.system?.duration || ''),
          range: cleanText(p.system?.range || ''),
          cost: cleanText(p.system?.cost || ''),
          prereq: cleanText(p.system?.prereq || p.system?.prerequisites || ''),
        })).filter(p=>p.name);

        const traits = items.filter(i=>i.type==='trait').map(t => ({ name:t.name, desc: cleanText(t.system?.description || '') })).filter(t=>t.name);
        const tags = items.filter(i=>i.type==='tag').map(t => ({ name:t.name, desc: cleanText(t.system?.description || '') })).filter(t=>t.name);

        // Only add pages if there is meaningful text
        const hasAnyDetails = powers.some(p=>p.effect||p.powerSet||p.action||p.cost||p.prereq) || traits.some(t=>t.desc) || tags.some(t=>t.desc);

        if (hasAnyDetails){
          const pageRef = { page: pdfDoc.addPage() };
          const { width, height } = pageRef.page.getSize();

          const margin = 48;
          const colW = (width - margin*2); // 1 coluna
          const lineH = 12;

          let x = margin;
          let y = height - margin;

          const newPage = ()=>{
            pageRef.page = pdfDoc.addPage();
            x = margin;
            y = height - margin;
          };

          const ensureSpace = (need)=>{
            if (y - need < margin) newPage();
          };

          const drawH1 = (txt)=>{
            ensureSpace(22);
            pageRef.page.drawText(txt, { x, y, size: 14, font: helvBold });
            y -= 18;
          };

          const drawP = (txt)=>{
            const lines = wrapText(helv, txt, 9.5, colW);
            for (const ln of lines){
              if (y < margin + 30) newPage();
              pageRef.page.drawText(ln, { x, y, size: 9.5, font: helv });
              y -= lineH;
            }
          };

          // Section: Powers
          if (powers.length){
            drawH1('PODERES');
            for (const p of powers){
              const header = `${p.powerSet ? (p.powerSet + ': ') : ''}${p.name}`;
              ensureSpace(28);
              pageRef.page.drawText(header, { x, y, size: 11, font: helvBold });
              y -= 14;
              const meta = [
                p.action ? `Ação: ${p.action}` : '',
                p.trigger ? `Gatilho: ${p.trigger}` : '',
                p.duration ? `Duração: ${p.duration}` : '',
                p.range ? `Alcance: ${p.range}` : '',
                p.cost ? `Custo: ${p.cost}` : '',
                p.prereq ? `Pré: ${p.prereq}` : '',
              ].filter(Boolean).join(' • ');
              if (meta){ ensureSpace(14); pageRef.page.drawText(meta, { x, y, size: 8.5, font: helv }); y -= 12; }
              if (p.effect){ drawP(p.effect); y -= 6; }
              else { y -= 6; }
            }
          }

          const addSimpleList = (title, arr)=>{
            if (!arr.length) return;
            if (powers.length) ensureSpace(26);
            drawH1(title);
            for (const it of arr){
              ensureSpace(22);
              pageRef.page.drawText(it.name, { x, y, size: 10.5, font: helvBold });
              y -= 12;
              if (it.desc){ drawP(it.desc); y -= 6; }
              else { y -= 6; }
            }
          };

          addSimpleList('TRAÇOS', traits);
          addSimpleList('TAGS', tags);
        }
      }

      const out = await pdfDoc.save();
      const blob = new Blob([out], { type: 'application/pdf' });
      const filename = `${(actor.name||'character').replace(/[^\w\-]+/g,'_')}-M616.pdf`;

      if (window.saveAs) window.saveAs(blob, filename);
      else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(()=>URL.revokeObjectURL(url), 2000);
      }

      notify('info', 'PDF gerado com sucesso.');
    }catch(e){
      console.error('[M616 export] error', e);
      notify('error', 'Export PDF falhou. Veja o console.');
    }
  }

  window.M616Export = { M616, exportActor };
})();

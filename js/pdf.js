import { clamp } from './util.js';

export async function loadPdfFieldMap(){
  const res = await fetch('./assets/pdf-field-map.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Falha ao carregar mapa do PDF.');
  return await res.json();
}

function calcFontSize(rectPx){
  // heuristic: keep readable but inside box
  const h = rectPx.h;
  return clamp(Math.floor(h * 0.65), 8, 20);
}

export function buildFilledFields(state){
  // This is the canonical mapping taken from sheet-export-m616.
  const abilityDefense = (v) => String(10 + (Number(v)||0));

  const val = (x, fallback='') => (x==null ? fallback : String(x));

  const abilities = state.abilities;

  const fields = {
    // header
    Name1: val(state.codename),
    Text1: val(state.rank),

    // resources
    Text28: val(state.karma),
    Text29: val(state.health),
    Text30: val(state.healthDR),
    Text31: val(state.focus),
    Text32: val(state.focusDR),
    Text33: val(state.init),

    // movement
    Text34: val(state.moveRun),
    Text35: val(state.moveClimb),
    Text36: val(state.moveSwim),
    Text37: val(state.moveOther),

    // identity
    Text43: val(state.realName),
    Text44: val(state.height),
    Text45: val(state.weight),
    Text46: val(state.gender),
    Text47: val(state.eyes),
    Text48: val(state.hair),
    Text49: val(state.size),
    Text50: val(state.distinguishingFeatures),

    Text51: val(state.occupationName),
    Text52: val(state.originName),
    Text53: val(state.teams),
    Text54: val(state.base),
    Text55: val(state.history),
    Text56: val(state.personality),
  };

  // abilities block -> Text2..Text19
  const blocks = [
    ['mle', 2],
    ['agl', 5],
    ['res', 8],
    ['vig', 11],
    ['ego', 14],
    ['log', 17],
  ];

  for (const [key, base] of blocks){
    const v = Number(abilities?.[key]?.value ?? 0);
    const def = abilities?.[key]?.defense ?? abilityDefense(v);
    const non = abilities?.[key]?.noncom ?? 0;
    fields[`Text${base}`] = String(v);
    fields[`Text${base+1}`] = String(def);
    fields[`Text${base+2}`] = String(non).match(/^[-+]/) ? String(non) : (Number(non) >= 0 ? `+${Number(non)}` : String(non));
  }

  // damage multipliers & repeated values
  fields.Text20 = val(abilities?.mle?.damageMultiplier ?? '');
  fields.Text21 = val(abilities?.mle?.value ?? '');
  fields.Text22 = val(abilities?.agl?.damageMultiplier ?? '');
  fields.Text23 = val(abilities?.agl?.value ?? '');
  fields.Text24 = val(abilities?.ego?.damageMultiplier ?? '');
  fields.Text25 = val(abilities?.ego?.value ?? '');
  fields.Text26 = val(abilities?.log?.damageMultiplier ?? '');
  fields.Text27 = val(abilities?.log?.value ?? '');

  // long columns
  fields.Text38 = (state.traitsSelected || []).map(t=>`• ${t.name}`).join('\n');
  fields.Text39 = (state.tagsSelected || []).map(t=>`• ${t.name}`).join('\n');

  const powers = (state.powersSelected || []).map(p=>p.name);
  const perCol = Math.ceil(powers.length/3) || 0;
  const cols = [powers.slice(0, perCol), powers.slice(perCol, 2*perCol), powers.slice(2*perCol)];
  fields.Text40 = cols[0].map(n=>`• ${n}`).join('\n');
  fields.Text41 = cols[1].map(n=>`• ${n}`).join('\n');
  fields.Text42 = cols[2].map(n=>`• ${n}`).join('\n');

  return fields;
}

export function renderOverlay(containerEl, fieldMap, filledFields){
  // containerEl should already contain the <img> template as first child
  // We render absolutely positioned text for any filled field.
  const root = containerEl;
  const old = root.querySelectorAll('.previewText');
  old.forEach(n => n.remove());

  for (const [name, value] of Object.entries(filledFields)){
    if (!value) continue;
    const f = fieldMap?.fields?.[name];
    if (!f?.widgets?.length) continue;
    // Usually a single widget.
    for (const w of f.widgets){
      const r = w.rect_px;
      const el = document.createElement('div');
      el.className = 'previewText';
      el.style.left = `${r.x}px`;
      el.style.top = `${r.y}px`;
      el.style.width = `${r.w}px`;
      el.style.height = `${r.h}px`;

      // font sizing heuristic
      let fs = calcFontSize(r);
      if (name === 'Name1') fs = 24;
      if (name === 'Text55' || name === 'Text56') fs = 10;
      if (['Text38','Text39','Text40','Text41','Text42'].includes(name)) fs = 10;

      el.style.fontSize = `${fs}px`;
      el.style.lineHeight = `${Math.max(10, Math.floor(fs*1.12))}px`;

      // alignment for small numeric boxes
      const isSmall = r.h < 22 || r.w < 60;
      if (isSmall){
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.textAlign = 'center';
      }

      el.textContent = String(value);
      root.appendChild(el);
    }
  }
}

export function openPrintWindow(fieldMap, filledFields){
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) {
    alert('Pop-up bloqueado. Permita pop-ups para gerar o PDF.');
    return;
  }

  const pxW = fieldMap?.meta?.render?.px_w ?? 1433;
  const pxH = fieldMap?.meta?.render?.px_h ?? 1853;

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Imprimir ficha</title>
<style>
  html,body{ margin:0; padding:0; }
  .wrap{ display:flex; justify-content:center; padding:0; }
  .sheet{ position:relative; width:${pxW}px; height:${pxH}px; }
  .sheet img{ width:100%; height:100%; display:block; }
  .t{ position:absolute; color:#111; font-family: Arial, Helvetica, sans-serif; font-weight:500; overflow:hidden; white-space: pre-wrap; }
  @page{ margin:0; }
  @media print{ body{ -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  .hint{ font-family: Arial, Helvetica, sans-serif; color:#333; font-size:12px; padding:10px 14px; }
</style>
</head>
<body>
  <div class="hint">Dica: ao imprimir para PDF, use <b>Escala: Ajustar à página</b> (ou 100% se couber).</div>
  <div class="wrap">
    <div class="sheet" id="sheet">
      <img src="./assets/template.png" alt="Template" />
    </div>
  </div>
<script>
  const fieldMap = ${JSON.stringify(fieldMap)};
  const filled = ${JSON.stringify(filledFields)};

  const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
  const calcFS = (r)=>clamp(Math.floor(r.h*0.65),8,20);

  const root = document.getElementById('sheet');
  for (const [name, value] of Object.entries(filled)){
    if (!value) continue;
    const f = fieldMap?.fields?.[name];
    if (!f?.widgets?.length) continue;
    for (const w of f.widgets){
      const r = w.rect_px;
      const el = document.createElement('div');
      el.className = 't';
      el.style.left = r.x + 'px';
      el.style.top = r.y + 'px';
      el.style.width = r.w + 'px';
      el.style.height = r.h + 'px';
      let fs = calcFS(r);
      if (name === 'Name1') fs = 24;
      if (name === 'Text55' || name === 'Text56') fs = 10;
      if (['Text38','Text39','Text40','Text41','Text42'].includes(name)) fs = 10;
      el.style.fontSize = fs + 'px';
      el.style.lineHeight = Math.max(10, Math.floor(fs*1.12)) + 'px';
      const isSmall = r.h < 22 || r.w < 60;
      if (isSmall){
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.textAlign = 'center';
      }
      el.textContent = String(value);
      root.appendChild(el);
    }
  }
</script>
</body>
</html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
}

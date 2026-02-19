export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

export function debounce(fn, ms=150){
  let t=null;
  return (...args)=>{
    clearTimeout(t);
    t=setTimeout(()=>fn(...args), ms);
  };
}

export function stripHtml(s){
  if (!s) return "";
  const div = document.createElement('div');
  div.innerHTML = String(s);
  return (div.textContent || div.innerText || '').trim();
}

export function cleanText(s){
  const t = stripHtml(s);
  return t ? t.replace(/\s+/g, ' ').trim() : '';
}

export function fmtSigned(n){
  if (n === '' || n == null) return '';
  const x = Number(n);
  if (Number.isNaN(x)) return String(n);
  return x >= 0 ? `+${x}` : `${x}`;
}

export function downloadText(filename, text, mime='application/json'){
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2500);
}

export function safeJsonParse(text){
  try { return JSON.parse(text); } catch { return null; }
}

export function uniqBy(arr, keyFn){
  const seen = new Set();
  const out = [];
  for (const it of arr){
    const k = keyFn(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

export function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, (c)=>({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[c]));
}

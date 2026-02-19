import { cleanText } from './util.js';

async function fetchJson(path){
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Falha ao carregar ${path}: ${res.status}`);
  return await res.json();
}

function packToList(pack){
  const items = Array.isArray(pack?.items) ? pack.items : [];
  return items.map(i => ({
    id: i._id || i.id || crypto.randomUUID(),
    name: i.name || '',
    type: i.type || '',
    img: i.img || '',
    system: i.system || {},
    description: cleanText(i.system?.description || i.system?.effect || ''),
  }));
}

export async function loadAllData(){
  const [occupations, origins, traits, tags, powers] = await Promise.all([
    fetchJson('./data/occupations.json'),
    fetchJson('./data/origins.json'),
    fetchJson('./data/traits.json'),
    fetchJson('./data/tags.json'),
    fetchJson('./data/powers.json'),
  ]);

  const ocs = packToList(occupations).filter(i=>i.type==='occupation');
  const org = packToList(origins).filter(i=>i.type==='origin');
  const trs = packToList(traits).filter(i=>i.type==='trait');
  const tgs = packToList(tags).filter(i=>i.type==='tag');
  const pws = packToList(powers).filter(i=>i.type==='power');

  // add some useful computed fields
  for (const p of pws){
    p.powerSet = p.system?.powerSet || '';
    p.prerequisites = cleanText(p.system?.prerequisites || '');
    p.action = cleanText(p.system?.action || '');
    p.duration = cleanText(p.system?.duration || '');
    p.range = cleanText(p.system?.range || '');
    p.cost = cleanText(p.system?.cost || '');
  }

  return {
    occupations: ocs,
    origins: org,
    traits: trs,
    tags: tgs,
    powers: pws,
    powerSets: Array.from(new Set(pws.map(p=>p.powerSet).filter(Boolean))).sort((a,b)=>a.localeCompare(b)),
  };
}

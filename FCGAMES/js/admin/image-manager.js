import {loadAllQuestions} from '../data/loader.js';
import {validateImagePath} from '../media/image-manager.js';
import {ensureCatalogDefaults} from '../storage/catalog-store.js';

const usedGallery=document.getElementById('usedGallery');
const libraryGallery=document.getElementById('libraryGallery');
const refreshUsed=document.getElementById('refreshUsed');

// Every place a question can reference an image: the question's own image,
// a per-option image (mcq / identify_picture / image_mcq / odd_one_out …),
// the older imageOptions list, or a drag & drop target image.
function extractImageRefs(q){
  const refs=[];
  if(q.image)refs.push({path:q.image,role:'Question image'});
  (Array.isArray(q.options)?q.options:[]).forEach(o=>{
    if(o&&typeof o==='object'&&o.image)refs.push({path:o.image,role:'Option image'});
  });
  (Array.isArray(q.imageOptions)?q.imageOptions:[]).forEach(o=>{
    if(o&&o.image)refs.push({path:o.image,role:'Option image'});
  });
  (Array.isArray(q.pairs)?q.pairs:[]).forEach(p=>{
    if(p&&p.image)refs.push({path:p.image,role:'Target image'});
  });
  return refs;
}

async function buildUsedMap(){
  const all=await loadAllQuestions();
  const map=new Map();
  all.forEach(q=>{
    extractImageRefs(q).forEach(({path,role})=>{
      if(!map.has(path))map.set(path,{path,roles:new Set(),uses:[]});
      const entry=map.get(path);
      entry.roles.add(role);
      entry.uses.push({id:q.id,topic:q.topic,subject:q.subject,class:q.class});
    });
  });
  return map;
}

function galleryCardHtml(path,metaHtml){
  return `<article class="image-card" data-path="${escapeAttr(path)}">
    <div class="image-thumb-wrap"><img class="image-thumb" src="../${escapeAttr(path)}" alt="" loading="lazy"></div>
    <div class="image-card-body">
      <code class="image-path">${escapeHtml(path)}</code>
      <div class="image-status" data-status>Checking…</div>
      ${metaHtml||''}
      <button type="button" class="small-btn copy-path-btn">📋 Copy path</button>
    </div>
  </article>`;
}

async function checkAndMark(card,path){
  const statusEl=card.querySelector('[data-status]');
  const result=await validateImagePath('../'+path);
  if(result.ok){
    statusEl.textContent=`✅ Loads fine (${result.width}×${result.height})`;
    statusEl.className='image-status ok';
  } else {
    statusEl.textContent=`⚠️ Broken — ${result.reason||'could not load'}`;
    statusEl.className='image-status broken';
    card.querySelector('.image-thumb-wrap').classList.add('broken');
  }
}

function wireCards(container){
  container.querySelectorAll('.image-card').forEach(card=>{
    checkAndMark(card,card.dataset.path);
  });
  container.querySelectorAll('.copy-path-btn').forEach(btn=>{
    btn.onclick=()=>{
      const path=btn.closest('.image-card').dataset.path;
      copyText(path);
      btn.textContent='✅ Copied!';
      setTimeout(()=>{btn.textContent='📋 Copy path';},1400);
    };
  });
}

async function renderUsed(){
  usedGallery.innerHTML='<p class="muted">Loading…</p>';
  const map=await buildUsedMap();
  if(!map.size){usedGallery.innerHTML='<p class="muted">No images are attached to any question yet.</p>';return map;}
  const entries=[...map.values()].sort((a,b)=>a.path.localeCompare(b.path));
  usedGallery.innerHTML=entries.map(e=>{
    const usesText=e.uses.slice(0,3).map(u=>escapeHtml(`${u.subject} · ${u.topic}`)).join(', ')+(e.uses.length>3?` +${e.uses.length-3} more`:'');
    const meta=`<div class="image-meta">${[...e.roles].map(r=>`<span class="badge">${escapeHtml(r)}</span>`).join('')}</div><div class="image-uses">${usesText}</div>`;
    return galleryCardHtml(e.path,meta);
  }).join('');
  wireCards(usedGallery);
  return map;
}

async function renderLibrary(usedPaths){
  libraryGallery.innerHTML='<p class="muted">Loading…</p>';
  try{
    const r=await fetch('../data/media-manifest.json',{cache:'no-store'});
    const m=await r.json();
    const images=(m.images||[]).map(i=>i.path);
    if(!images.length){libraryGallery.innerHTML='<p class="muted">No entries in the asset library yet.</p>';return;}
    libraryGallery.innerHTML=images.map(path=>{
      const used=usedPaths.includes(path);
      const meta=`<div class="image-meta">${used?'<span class="badge used-badge">In use</span>':'<span class="badge">Not used yet</span>'}</div>`;
      return galleryCardHtml(path,meta);
    }).join('');
    wireCards(libraryGallery);
  }catch{
    libraryGallery.innerHTML='<p class="muted">Could not load data/media-manifest.json.</p>';
  }
}

async function refreshAll(){
  const map=await renderUsed();
  await renderLibrary([...(map?.keys()||[])]);
}
refreshUsed.onclick=refreshAll;
refreshAll();

function copyText(text){
  if(navigator.clipboard?.writeText){navigator.clipboard.writeText(text).catch(()=>{});return;}
  const ta=document.createElement('textarea');
  ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
  document.body.appendChild(ta);ta.select();
  try{document.execCommand('copy');}catch{}
  ta.remove();
}

// ---- Local preview tool — client-side only, nothing is uploaded anywhere.
// It just helps a teacher pick a sensible path before adding the file to
// the project themselves (see the note on the page).
const localFilePicker=document.getElementById('localFilePicker');
const localPreviewWrap=document.getElementById('localPreviewWrap');
const localPreviewImg=document.getElementById('localPreviewImg');
const suggestedPath=document.getElementById('suggestedPath');
const suggestSubject=document.getElementById('suggestSubject');
const suggestFolder=document.getElementById('suggestFolder');
const copySuggested=document.getElementById('copySuggested');

function loadPickerOptions(){
  const c=ensureCatalogDefaults();
  suggestSubject.innerHTML=c.subjects.map(s=>`<option value="${escapeAttr(String(s.name).toLowerCase())}">${escapeHtml(s.name)}</option>`).join('');
}
loadPickerOptions();

function slugify(v){return String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');}

function updateSuggestedPath(){
  const file=localFilePicker.files?.[0];
  if(!file)return;
  const ext=(file.name.split('.').pop()||'png').toLowerCase();
  const safeName=slugify(file.name.replace(/\.[^.]+$/,''))||'image';
  const folder=slugify(suggestFolder.value)||'misc';
  const subj=suggestSubject.value||'maths';
  suggestedPath.value=`assets/images/${subj}/${folder}/${safeName}.${ext}`;
}
[suggestSubject,suggestFolder].forEach(el=>el.addEventListener('input',updateSuggestedPath));

localFilePicker.addEventListener('change',()=>{
  const file=localFilePicker.files?.[0];
  if(!file)return;
  localPreviewImg.src=URL.createObjectURL(file);
  localPreviewWrap.hidden=false;
  updateSuggestedPath();
});
copySuggested.onclick=()=>{
  copyText(suggestedPath.value);
  copySuggested.textContent='✅ Copied!';
  setTimeout(()=>{copySuggested.textContent='📋 Copy';},1400);
};

function escapeHtml(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");}
function escapeAttr(v){return escapeHtml(v);}

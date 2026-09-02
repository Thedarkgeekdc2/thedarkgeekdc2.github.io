import {ensureCatalogDefaults,getCatalog} from '../storage/catalog-store.js';
import {getTopics,upsertTopic,removeTopic} from '../storage/data-store.js';

const cls=document.getElementById('classNo');
const sub=document.getElementById('subject');
const input=document.getElementById('topic');
const list=document.getElementById('topics');

function loadSelectors(){
  const c=ensureCatalogDefaults();
  cls.innerHTML=c.classes.map(x=>`<option value="${x.number}">${esc(x.name)}</option>`).join('');
  sub.innerHTML=c.subjects.map(x=>`<option value="${esc(x.name)}">${esc(x.name)}</option>`).join('');
}
async function render(){
  const m=await fetch('../data/manifest.json',{cache:'no-store'}).then(r=>r.json()).catch(()=>({topics:[]}));
  const c=ensureCatalogDefaults();
  const built=(m.topics||[]).map((x,i)=>({id:'built-'+i,class:x.class,subject:x.subject,topic:x.topic,builtIn:true}));
  const custom=getTopics().map(x=>({...x,builtIn:false}));
  const all=[...built,...custom];
  const selected=all.filter(x=>String(x.class)===String(cls.value)&&String(x.subject).toLowerCase()===String(sub.value).toLowerCase());
  list.innerHTML=selected.length?selected.map(t=>`<article class="topic-item"><div><span class="badge">Class ${esc(t.class)}</span><span class="badge">${esc(t.subject)}</span><h2>${esc(t.topic)}</h2><p>${t.builtIn?'Built-in topic':'Custom topic'}</p></div>${t.builtIn?'':`<button class="danger-outline" data-id="${esc(t.id)}">🗑️ Delete</button>`}</article>`).join(''):'<div class="empty-library">No topics for this selection.</div>';
  list.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{
    if(!confirm('Delete this custom topic?'))return;
    removeTopic(b.dataset.id);render();
  });
}
document.getElementById('add').onclick=()=>{
  const name=input.value.trim(); if(!name)return;
  try{
    const topics=getTopics();
    if(topics.some(t=>t.class===Number(cls.value)&&String(t.subject).toLowerCase()===String(sub.value).toLowerCase()&&String(t.topic).toLowerCase()===name.toLowerCase()))
      throw new Error('This topic already exists.');
    upsertTopic({id:`topic-${Date.now()}`,class:Number(cls.value),subject:sub.value,topic:name});
    input.value='';document.getElementById('status').textContent='✅ Topic added.';render();
  }catch(e){document.getElementById('status').textContent='❌ '+e.message;}
};
[cls,sub].forEach(x=>x.addEventListener('change',render));
window.addEventListener('flashcard:catalog-changed',()=>{loadSelectors();render();});
loadSelectors();render();

function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;")}

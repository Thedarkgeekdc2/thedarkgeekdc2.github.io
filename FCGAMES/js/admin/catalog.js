import {
  ensureCatalogDefaults,getCatalog,addClass,addSubject,removeClass,removeSubject
} from '../storage/catalog-store.js';

const classInput=document.getElementById('classInput');
const subjectInput=document.getElementById('subjectInput');
const classList=document.getElementById('classList');
const subjectList=document.getElementById('subjectList');
const status=document.getElementById('status');

function escapeHtml(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
function escapeAttr(v){return escapeHtml(v);}
function say(msg,ok=true){status.textContent=msg;status.className='tool-status '+(ok?'ok':'error');}

function render(){
  const c=ensureCatalogDefaults();
  document.getElementById('classCount').textContent=c.classes.length;
  document.getElementById('subjectCount').textContent=c.subjects.length;

  classList.innerHTML=c.classes.map(x=>`
    <div class="catalog-item">
      <div><b>${escapeHtml(x.name)}</b><small>Number: ${escapeHtml(x.number)}</small></div>
      <button class="delete-catalog" type="button" data-class-id="${escapeAttr(x.id)}" title="Delete ${escapeAttr(x.name)}">🗑️</button>
    </div>`).join('');

  subjectList.innerHTML=c.subjects.map(x=>`
    <div class="catalog-item">
      <div><b>${escapeHtml(x.name)}</b><small>Subject</small></div>
      <button class="delete-catalog" type="button" data-subject-id="${escapeAttr(x.id)}" title="Delete ${escapeAttr(x.name)}">🗑️</button>
    </div>`).join('');
}

document.getElementById('addClass').addEventListener('click',()=>{
  try{
    addClass(classInput.value);
    classInput.value='';
    say('✅ Class added.');
    render();
  }catch(e){say('❌ '+e.message,false);}
});
document.getElementById('addSubject').addEventListener('click',()=>{
  try{
    addSubject(subjectInput.value);
    subjectInput.value='';
    say('✅ Subject added.');
    render();
  }catch(e){say('❌ '+e.message,false);}
});

classInput.addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('addClass').click();});
subjectInput.addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('addSubject').click();});

classList.addEventListener('click',e=>{
  const btn=e.target.closest('[data-class-id]'); if(!btn)return;
  const id=btn.dataset.classId;
  const item=getCatalog().classes.find(x=>x.id===id);
  if(!item)return;
  if(!confirm(`Delete ${item.name}?`))return;
  try{removeClass(id);say('✅ Class removed.');render();}catch(err){say('❌ '+err.message,false);}
});

subjectList.addEventListener('click',e=>{
  const btn=e.target.closest('[data-subject-id]'); if(!btn)return;
  const id=btn.dataset.subjectId;
  const item=getCatalog().subjects.find(x=>x.id===id);
  if(!item)return;
  if(!confirm(`Delete ${item.name}?`))return;
  try{removeSubject(id);say('✅ Subject removed.');render();}catch(err){say('❌ '+err.message,false);}
});

ensureCatalogDefaults();
render();

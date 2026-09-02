import {ensureCatalogDefaults,getCatalog} from '../storage/catalog-store.js';
import {loadAllQuestions,clearQuestionCache} from '../data/loader.js';
import {getCustomQuestions,deleteCustomQuestion} from '../storage/custom-questions.js';

const library=document.getElementById('library');
const search=document.getElementById('search');
const filterClass=document.getElementById('filterClass');
const filterType=document.getElementById('filterType');
const filterSubject=document.getElementById('filterSubject');
const refresh=document.getElementById('refresh');
const confirmModal=document.getElementById('confirm');
let pendingDelete=null;
let all=[];

const typeLabels={
 mcq:'MCQ',true_false:'True / False',
 match:'Match',image_based:'Image Based',identify_picture:'Identify Picture',
 choose_answer:'Choose Answer',odd_one_out:'Odd One Out',yes_no:'Yes / No',
 arrange_order:'Arrange Order',drag_drop:'Drag & Drop',image_mcq:'Image MCQ'
};

function hasAnyImage(q){
  if(q.image)return true;
  if(Array.isArray(q.options)&&q.options.some(o=>o&&typeof o==='object'&&o.image))return true;
  if(Array.isArray(q.imageOptions)&&q.imageOptions.length)return true;
  if(Array.isArray(q.pairs)&&q.pairs.some(p=>p&&p.image))return true;
  return false;
}

async function load(){
  try{
    ensureCatalogDefaults();
    clearQuestionCache();
    all=await loadAllQuestions();
    const catalog=getCatalog();
    filterClass.innerHTML='<option value="">All Classes</option>'+catalog.classes.map(c=>`<option value="${c.number}">${escapeHtml(c.name)}</option>`).join('');
    filterSubject.innerHTML='<option value="">All Subjects</option>'+catalog.subjects.map(s=>`<option value="${escapeAttr(s.name)}">${escapeHtml(s.name)}</option>`).join('');
    filterType.innerHTML='<option value="">All Types</option>';
    [...new Set(all.map(q=>q.type))].sort().forEach(t=>{
      const o=document.createElement('option');o.value=t;o.textContent=typeLabels[t]||t;filterType.appendChild(o);
    });
    render();
  }catch(e){library.innerHTML=`<div class="empty-library">❌ ${escapeHtml(e.message)}</div>`;}
}
function render(){
  const term=search.value.trim().toLowerCase();
  const c=filterClass.value,s=filterSubject.value,t=filterType.value;
  const items=all.filter(q=>{
    const hay=`${q.question||''} ${q.topic||''} ${q.subject||''}`.toLowerCase();
    return (!term||hay.includes(term))&&(!c||String(q.class)===c)&&(!s||String(q.subject).toLowerCase()===String(s).toLowerCase())&&(!t||q.type===t);
  });
  if(!items.length){library.innerHTML='<div class="empty-library">No questions found.</div>';return;}
  library.innerHTML=items.map(q=>`
    <article class="question-item">
      <div class="question-meta">
        <span class="badge">Class ${escapeHtml(q.class)}</span>
        <span class="badge">${escapeHtml(q.subject)}</span>
        <span class="badge">${escapeHtml(q.topic)}</span>
        <span class="badge">${escapeHtml(typeLabels[q.type]||q.type)}</span>
        ${hasAnyImage(q)?'<span class="badge image-badge">🖼️ Image</span>':''}
        ${q.sourceFile==='localStorage'?'<span class="badge custom-badge">Custom</span>':'<span class="badge">Built-in</span>'}
      </div>
      <div class="question-text">${escapeHtml(q.question||'Interactive question')}</div>
      <div class="question-actions">
        ${q.sourceFile==='localStorage'
          ?`<button data-edit="${escapeAttr(q.id)}">✏️ Edit</button><button data-delete="${escapeAttr(q.id)}">🗑️ Delete</button>`
          :'<span class="library-note">Built-in content</span>'}
      </div>
    </article>`).join('');

  library.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>openDelete(b.dataset.delete));
  library.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(b.dataset.edit));
}

function edit(id){
  const q=getCustomQuestions().find(x=>x.id===id);
  if(!q)return;
  localStorage.setItem('flashcardChampEditQuestion',JSON.stringify(q));
  location.href='question-builder.html';
}
function openDelete(id){
  pendingDelete=id;
  const q=getCustomQuestions().find(x=>x.id===id);
  document.getElementById('confirmText').textContent=
    q?`Delete this saved question from local content?`: 'Delete this question?';
  confirmModal.hidden=false;
  confirmModal.setAttribute('aria-hidden','false');
}
document.getElementById('cancelDelete').onclick=()=>{
  pendingDelete=null;confirmModal.hidden=true;confirmModal.setAttribute('aria-hidden','true');
};
document.getElementById('confirmDelete').onclick=()=>{
  if(pendingDelete) deleteCustomQuestion(pendingDelete);
  pendingDelete=null;confirmModal.hidden=true;confirmModal.setAttribute('aria-hidden','true');
  load();
};
[search,filterClass,filterSubject,filterType].forEach(el=>el.addEventListener('input',render));
window.addEventListener('flashcard:catalog-changed',load);
refresh.onclick=load;
window.addEventListener('flashcard:questions-changed',load);
load();

function escapeHtml(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;")}
function escapeAttr(v){return escapeHtml(v)}

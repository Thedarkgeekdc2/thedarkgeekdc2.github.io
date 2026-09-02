import {getTopics as getCustomTopics} from '../storage/data-store.js';
import {getCatalog,ensureCatalogDefaults} from '../storage/catalog-store.js';
import { saveCustomQuestion } from '../storage/custom-questions.js';
const STORAGE_KEY='flashcardChampCustomQuestions';
const SUBJECTS={3:'maths',4:'hindi'};
const TYPE_LABELS={
  mcq:'MCQ',true_false:'True / False',
  match:'Match the Following',image_based:'Image Based',identify_picture:'Identify the Picture',
  image_mcq:'Image MCQ',choose_answer:'Choose the Correct Answer',odd_one_out:'Odd One Out',yes_no:'Yes / No',
  arrange_order:'Arrange in Order',drag_drop:'Drag & Drop'
};

// Types that show options to tap (as opposed to true/false, match, etc.) —
// each option can optionally carry its own image (e.g. Identify the Picture,
// Odd One Out with pictures, or a plain MCQ where one answer is a diagram).
const CHOICE_TYPES=['mcq','choose_answer','odd_one_out','image_based','identify_picture','image_mcq'];
// Types where a single image illustrating the question itself is required,
// not just optional — the question cannot be answered without seeing it.
const MANDATORY_IMAGE_TYPES=['image_based','identify_picture','image_mcq'];

const form=document.getElementById('builderForm');
const classNo=document.getElementById('classNo');
const subject=document.getElementById('subject');
const topic=document.getElementById('topic');
const topicList=document.getElementById('topicList');
const type=document.getElementById('type');
const difficulty=document.getElementById('difficulty');
const question=document.getElementById('question');
const dynamicFields=document.getElementById('dynamicFields');
const livePreview=document.getElementById('livePreview');
const previewType=document.getElementById('previewType');
const saveStatus=document.getElementById('saveStatus');
const toast=document.getElementById('toast');

const state={editingId:null, pairs:[]};

function optionField(i,label=`Option ${i}`){
  return `<div class="opt-field">
    <label>${label}<input class="opt-input" data-index="${i}" placeholder="${label}"></label>
    <input class="opt-image-input" data-index="${i}" placeholder="🖼️ Image for this option (optional)">
  </div>`;
}
function imageField(required=true){
  return `<div class="field-block">
    <label>Image Path / File Reference<input id="imagePath" placeholder="assets/images/..."></label>
    <small>Pick a path from Admin → Images, or type a relative path to a file already in the project.${required?'':' Optional for this question type.'}</small>
  </div>`;
}
function optionalImageField(){
  return `<div class="field-block optional-image-block">
    <label class="switch-row"><input type="checkbox" id="hasImage"> Add an image to this card (optional)</label>
    <div id="imageFieldWrap" style="display:none">
      <label>Image Path / File Reference<input id="imagePath" placeholder="assets/images/..."></label>
      <small>Pick a path from Admin → Images, or type a relative path to a file already in the project.</small>
    </div>
  </div>`;
}
function answerSelect(options){return `<label>Correct Answer<select id="correctAnswer">${options.map(x=>`<option value="${escapeAttr(x)}">${escapeHtml(x)}</option>`).join('')}</select></label>`;}

function renderTypeFields(){
  const t=type.value;
  let html='';
  if(CHOICE_TYPES.includes(t)){
    const imgBlock=MANDATORY_IMAGE_TYPES.includes(t)?imageField(true):'';
    html=`${imgBlock}<div class="form-grid">${optionField(1)}${optionField(2)}${optionField(3)}${optionField(4)}</div>
    <div class="form-grid single">${answerSelect(['Option 1','Option 2','Option 3','Option 4'])}</div>`;
  } else if(t==='true_false'){
    html=`<div class="form-grid single">${answerSelect(['true','false'])}</div>`;
  } else if(t==='yes_no'){
    html=`<div class="form-grid single">${answerSelect(['Yes','No'])}</div>`;
  } else if(t==='match'){
    html=`<div class="field-block"><div class="field-header"><b>Pairs</b><button type="button" class="small-btn" id="addPair">+ Add Pair</button></div><div id="pairs"></div></div>`;
  } else if(t==='arrange_order'){
    html=`<div class="field-block"><label>Items <textarea id="itemsText" rows="4" placeholder="One item per line"></textarea></label><small>Students will arrange these items in the correct order.</small></div><div class="form-grid single"><label>Correct Order <input id="orderAnswer" placeholder="Use the exact order, separated by |"></label></div>`;
  } else if(t==='drag_drop'){
    html=`<div class="field-block"><div class="field-header"><b>Drag → Target pairs</b><button type="button" class="small-btn" id="addPair">+ Add Pair</button></div><div id="pairs"></div><small>Add a target image on a pair to drop onto a picture instead of plain text.</small></div>`;
  }
  if(!MANDATORY_IMAGE_TYPES.includes(t)){
    html+=optionalImageField();
  }
  dynamicFields.innerHTML=html;
  if(t==='match'||t==='drag_drop'){
    state.pairs=[];
    addPairRow(); addPairRow();
    document.getElementById('addPair').onclick=()=>addPairRow();
  }
  const hasImageCb=document.getElementById('hasImage');
  if(hasImageCb){
    hasImageCb.addEventListener('change',()=>{
      const wrap=document.getElementById('imageFieldWrap');
      if(wrap)wrap.style.display=hasImageCb.checked?'':'none';
      if(!hasImageCb.checked){const p=document.getElementById('imagePath');if(p)p.value='';}
      try{preview(collect())}catch{}
    });
  }
  wireLivePreview();
}

function addPairRow(left='',right='',image=''){
  const list=document.getElementById('pairs'); if(!list)return;
  const isDrag=type.value==='drag_drop';
  const row=document.createElement('div'); row.className='pair-row'+(isDrag?' pair-row-drag':'');
  row.innerHTML=`<input class="pair-left" placeholder="${type.value==='match'?'Left item':'Drag item'}" value="${escapeAttr(left)}">
  <span>→</span><input class="pair-right" placeholder="${type.value==='match'?'Right item':'Target'}" value="${escapeAttr(right)}">
  ${isDrag?`<input class="pair-image" placeholder="🖼️ Target image (optional)" value="${escapeAttr(image)}">`:''}
  <button type="button" class="remove-pair" aria-label="Remove pair">×</button>`;
  row.querySelector('.remove-pair').onclick=()=>row.remove();
  list.appendChild(row);
}

function optionIsEmpty(o){
  if(o&&typeof o==='object')return !(String(o.label??o.answer??'').trim());
  return !String(o??'').trim();
}

function collect(){
  const t=type.value;
  const q={id:state.editingId||`custom-${Date.now()}`,type:t,question:question.value.trim(),difficulty:difficulty.value,class:Number(classNo.value),subject:subject.value,topic:topic.value.trim()};
  if(CHOICE_TYPES.includes(t)){
    const textInputs=[...dynamicFields.querySelectorAll('.opt-input')];
    const imageInputs=[...dynamicFields.querySelectorAll('.opt-image-input')];
    const options=textInputs.map((x,i)=>{
      const text=x.value.trim();
      const img=imageInputs[i]?.value.trim();
      return img?{label:text,answer:text,image:img}:text;
    });
    const ansIndex=Number(dynamicFields.querySelector('#correctAnswer')?.value?.replace('Option ','')||1)-1;
    q.options=options;
    const chosen=options[ansIndex];
    q.answer=(chosen&&typeof chosen==='object')?(chosen.answer||''):(chosen||'');
  } else if(t==='true_false'){
    q.answer=dynamicFields.querySelector('#correctAnswer').value==='true';
  } else if(t==='yes_no'){
    q.answer=dynamicFields.querySelector('#correctAnswer').value;
  } else if(t==='match'){
    q.pairs=[...dynamicFields.querySelectorAll('.pair-row')].map(r=>({left:r.querySelector('.pair-left').value.trim(),right:r.querySelector('.pair-right').value.trim()})).filter(x=>x.left&&x.right);
  } else if(t==='drag_drop'){
    q.pairs=[...dynamicFields.querySelectorAll('.pair-row')].map(r=>{
      const drag=r.querySelector('.pair-left').value.trim();
      const target=r.querySelector('.pair-right').value.trim();
      const image=r.querySelector('.pair-image')?.value.trim();
      const pair={drag,target};
      if(image)pair.image=image;
      return pair;
    }).filter(x=>x.drag&&x.target);
  } else if(t==='arrange_order'){
    q.items=dynamicFields.querySelector('#itemsText').value.split(/\n/).map(x=>x.trim()).filter(Boolean);
    q.answer=dynamicFields.querySelector('#orderAnswer').value.split('|').map(x=>x.trim()).filter(Boolean);
  }
  // Question image — same #imagePath field id whether it came from a
  // mandatory image type (image_based / identify_picture / image_mcq) or
  // from the optional "Add an image to this card" toggle on every other type.
  const imgVal=document.getElementById('imagePath')?.value?.trim();
  if(imgVal)q.image=imgVal;
  return q;
}

function validate(q){
  if(!q.topic) return 'Please enter a topic.';
  if(!q.question) return 'Please enter the question.';
  if(CHOICE_TYPES.includes(q.type)){
    if(q.options.length<2 || q.options.some(optionIsEmpty)) return 'Please fill all four options.';
    if(!q.answer) return 'Please choose a correct answer.';
    if(MANDATORY_IMAGE_TYPES.includes(q.type)&&!q.image) return 'Please add an image path.';
  }
  if(q.type==='match'&&q.pairs.length<2) return 'Add at least two pairs.';
  if(q.type==='drag_drop'&&q.pairs.length<2) return 'Add at least two drag → target pairs.';
  if(q.type==='arrange_order'&&q.items.length<2) return 'Add at least two items.';
  if(q.type==='arrange_order'&&q.answer.length!==q.items.length) return 'Correct Order must contain every item in the right order.';
  return '';
}

function loadSubjects(){
  const c=ensureCatalogDefaults();
  subject.innerHTML=c.subjects.map(s=>`<option value="${escapeAttr(s.name)}">${escapeHtml(s.name)}</option>`).join('');
}

async function loadClasses(){
  const c=ensureCatalogDefaults();
  classNo.innerHTML=c.classes.map(x=>`<option value="${x.number}">${escapeHtml(x.name)}</option>`).join('');
}

async function loadTopics(){
  // Known topics from current data manifest + custom localStorage topics.
  try{
    const r=await fetch('../data/manifest.json',{cache:'no-store'});
    const m=await r.json();
    const names=[...new Set((m.topics||[]).filter(x=>x.class===Number(classNo.value)&&x.subject===subject.value).map(x=>x.topic))];
    const custom=getCustomQuestions().filter(q=>q.class===Number(classNo.value)&&q.subject===subject.value).map(q=>q.topic);
    const customTopicRecords=getCustomTopics().filter(t=>t.class===Number(classNo.value)&&t.subject===subject.value).map(t=>t.topic);
    [...new Set([...names,...custom,...customTopicRecords])].sort().forEach(n=>{
      const o=document.createElement('option');o.value=n;topicList.appendChild(o);
    });
  }catch{}
}

function getCustomQuestions(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return []}}
function saveCustom(q){ return saveCustomQuestion(q); }

function previewOptionButton(o){
  const text=(o&&typeof o==='object')?(o.label??o.answer??'Option'):(o||'Option');
  const img=(o&&typeof o==='object')?o.image:'';
  return `<button type="button">${img?`<img src="../${escapeAttr(img)}" alt="" loading="lazy" onerror="this.style.display='none'">`:''}<span>${escapeHtml(text)}</span></button>`;
}

function preview(q){
  previewType.textContent=TYPE_LABELS[q.type]||q.type;
  let html=`<div class="preview-question">${escapeHtml(q.question||'Your question will appear here.')}</div>`;
  if(q.image)html+=`<img class="preview-image" src="../${escapeAttr(q.image)}" alt="Preview image" onerror="this.style.display='none'">`;
  if(q.options)html+=`<div class="preview-options">${q.options.map(previewOptionButton).join('')}</div>`;
  if(q.type==='true_false')html+='<div class="preview-options"><button>True</button><button>False</button></div>';
  if(q.type==='yes_no')html+='<div class="preview-options"><button>Yes</button><button>No</button></div>';
  if(q.type==='match')html+='<div class="preview-chip">Match pairs ↔</div>';
  if(q.type==='arrange_order')html+=`<div class="preview-chip">${(q.items||[]).map(escapeHtml).join('  •  ')}</div>`;
  if(q.type==='drag_drop')html+='<div class="preview-chip">Drag items → targets</div>';
  livePreview.innerHTML=html;
}

function wireLivePreview(){
  previewType.textContent=TYPE_LABELS[type.value]||type.value;
  [question,topic,type,difficulty,classNo,subject].forEach(el=>el.addEventListener('input',()=>{try{preview(collect())}catch{}}));
  dynamicFields.querySelectorAll('input,textarea,select').forEach(el=>el.addEventListener('input',()=>{try{preview(collect())}catch{}}));
  preview(collectSafe());
}
function collectSafe(){try{return collect()}catch{return {type:type.value,question:question.value}}}

function reset(){
  state.editingId=null; form.reset(); classNo.value='3'; loadClasses(); loadSubjects(); renderTypeFields(); loadTopics(); preview(collectSafe()); saveStatus.textContent='';
}
function toastMsg(msg){toast.textContent=msg;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1800)}

classNo.addEventListener('change',()=>{loadSubjects();topic.value='';topicList.innerHTML='';loadTopics();});
subject.addEventListener('change',()=>{topic.value='';topicList.innerHTML='';loadTopics();});
type.addEventListener('change',renderTypeFields);
form.addEventListener('submit',e=>{
  e.preventDefault();
  const q=collect(); const error=validate(q);
  if(error){saveStatus.textContent=error;saveStatus.className='save-status error';return;}
  saveCustom(q);
  saveStatus.textContent=`Saved successfully • ${q.id}`;
  saveStatus.className='save-status success';
  toastMsg('✅ Question saved');
  preview(q);
  document.dispatchEvent(new CustomEvent('question:saved',{detail:q}));
});
document.getElementById('previewBtn').onclick=()=>preview(collect());
document.addEventListener('question:saved',()=>{
  const b=document.createElement('button');
  b.type='button'; b.className='small-btn new-question-btn'; b.textContent='＋ New Question';
  if(!document.querySelector('.new-question-btn')){
    document.querySelector('.builder-actions').appendChild(b);
    b.onclick=()=>{b.remove(); reset();};
  }
});
loadClasses(); loadSubjects(); renderTypeFields(); loadTopics();

function escapeHtml(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;")}
function escapeAttr(v){return escapeHtml(v)}


function populateEditQuestion(){
  try{
    const raw=localStorage.getItem('flashcardChampEditQuestion');
    if(!raw)return;
    const q=JSON.parse(raw);
    localStorage.removeItem('flashcardChampEditQuestion');
    state.editingId=q.id;
    classNo.value=String(q.class);
    loadSubjects();
    subject.value=q.subject;
    topic.value=q.topic;
    difficulty.value=q.difficulty||'easy';
    type.value=q.type;
    question.value=q.question||'';
    renderTypeFields();
    if(q.options){
      const textOpts=[...dynamicFields.querySelectorAll('.opt-input')];
      const imgOpts=[...dynamicFields.querySelectorAll('.opt-image-input')];
      q.options.forEach((v,i)=>{
        const text=(v&&typeof v==='object')?(v.label??v.answer??''):v;
        const img=(v&&typeof v==='object')?(v.image??''):'';
        if(textOpts[i])textOpts[i].value=text;
        if(imgOpts[i])imgOpts[i].value=img;
      });
      const sel=dynamicFields.querySelector('#correctAnswer');
      const idx=q.options.findIndex(o=>{
        const val=(o&&typeof o==='object')?(o.answer??o.label??''):o;
        return val===q.answer;
      });
      if(sel&&idx>=0)sel.value=`Option ${idx+1}`;
    }
    if(q.image){
      const img=document.getElementById('imagePath');
      if(img){
        img.value=q.image;
        const hasImageCb=document.getElementById('hasImage');
        if(hasImageCb){
          hasImageCb.checked=true;
          const wrap=document.getElementById('imageFieldWrap');
          if(wrap)wrap.style.display='';
        }
      }
    }
    if(q.type==='arrange_order'){
      const it=dynamicFields.querySelector('#itemsText'), oa=dynamicFields.querySelector('#orderAnswer');
      if(it)it.value=(q.items||[]).join('\\n'); if(oa)oa.value=(q.answer||[]).join('|');
    }
    if(['match','drag_drop'].includes(q.type)){
      const list=q.pairs||[];
      const container=dynamicFields.querySelector('#pairs');
      if(container){container.innerHTML='';list.forEach(p=>addPairRow(p.left??p.drag,p.right??p.target,p.image));}
    }
    preview(collectSafe());
  }catch{}
}
populateEditQuestion();
window.addEventListener('flashcard:catalog-changed',()=>{
  const currentClass=classNo.value,currentSubject=subject.value,currentTopic=topic.value;
  loadClasses(); classNo.value=currentClass||classNo.value; loadSubjects(); subject.value=currentSubject||subject.value; loadTopics(); topic.value=currentTopic||'';
});

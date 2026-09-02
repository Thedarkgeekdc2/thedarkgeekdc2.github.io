import {
  getQuestions,getTopics,setQuestions,setTopics,makeBackup,restoreBackup,exportJson
} from '../storage/data-store.js';
import {saveCatalog,ensureCatalogDefaults,mergeCatalogEntries} from '../storage/catalog-store.js';

const importFile=document.getElementById('importFile');
const restoreFile=document.getElementById('restoreFile');
const status=document.getElementById('status');
const modal=document.getElementById('confirm');
const importName=document.getElementById('importName');
const restoreName=document.getElementById('restoreName');

importFile.addEventListener('change',()=>{
  importName.textContent=importFile.files?.[0]?.name||'No file selected';
});
restoreFile.addEventListener('change',()=>{
  restoreName.textContent=restoreFile.files?.[0]?.name||'No backup selected';
});

function say(msg,ok=true){
  status.textContent=msg;
  status.className='tool-status '+(ok?'ok':'error');
}
function parseText(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(new Error('Could not read the selected file.'));
    reader.readAsText(file);
  });
}
function normalizeQuestionSet(set, index, context){
  // A single "topic file" shaped exactly like the built-in data files:
  // {class, subject, topic, questions:[{id,type,question,...}]}
  // Individual questions inherit class/subject/topic from this wrapper when
  // they don't specify their own (matching how built-in files work).
  if(!set || typeof set!=='object' || !Array.isArray(set.questions)) return null;
  const hasClassSubjectTopic = set.class!==undefined && set.subject && set.topic;
  if(!hasClassSubjectTopic) return null;
  return set.questions.map((q,i)=>{
    if(!q || !q.id || !q.type || (!q.question && q.type!=='drag_drop')){
      throw new Error(`${context} question ${i+1}: missing id/type/question.`);
    }
    return {...q, class:q.class ?? Number(set.class), subject:q.subject || set.subject, topic:q.topic || set.topic};
  });
}

function normalizePayload(p){
  if(!p || typeof p!=='object') throw new Error('That file is not a valid JSON object or array.');
  if(p.format==='flashcard-champ-backup' && ![1,2].includes(p.version)){
    throw new Error('Unsupported backup version.');
  }

  let questions=null;

  // Format 1: a bare array - either fully-specified questions, or a list of
  // topic-file objects (bulk import of several topics at once).
  if(Array.isArray(p)){
    if(p.length && p[0] && typeof p[0]==='object' && Array.isArray(p[0].questions)){
      questions=p.flatMap((set,i)=>normalizeQuestionSet(set,i,`Topic ${i+1}`) ?? (()=>{throw new Error(`Topic ${i+1} is missing class/subject/topic.`);})());
    } else {
      questions=p;
    }
  }
  // Format 2: a single topic-file object {class, subject, topic, questions:[...]}
  else if(Array.isArray(p.questions) && p.class!==undefined && p.subject && p.topic && !('format' in p)){
    questions=normalizeQuestionSet(p,0,'This file\'s');
  }
  // Format 3: export/backup package {questions:[...], topics:[...], catalog:{...}}
  else if(Array.isArray(p.questions)){
    questions=p.questions;
  }

  if(!questions) throw new Error('No questions array found. See the format guide below.');

  questions.forEach((q,i)=>{
    if(!q || !q.id || !q.type || (!q.question && q.type!=='drag_drop')){
      throw new Error(`Question ${i+1} is missing an id, type, or question text.`);
    }
    if(q.class===undefined || q.class===null || !q.subject || !q.topic){
      throw new Error(`Question ${i+1} ("${q.id}") is missing class/subject/topic. Add these on each question, or wrap the file as {class, subject, topic, questions:[...]}.`);
    }
    if(q.type==='fill_blank'||q.type==='one_word'){
      throw new Error(`Question ${i+1} ("${q.id}") uses type "${q.type}", which requires typing an answer and is no longer supported. Convert it to "mcq" (or another tap-to-answer type) with an options list before importing.`);
    }
  });

  return {
    questions,
    topics:Array.isArray(p.topics)?p.topics:[],
    catalog:p.catalog||null,
    // Classes/subjects referenced by the questions themselves, so the game's
    // class/subject pickers pick them up even if the file has no catalog block.
    impliedClasses:[...new Set(questions.map(q=>Number(q.class)))].filter(Number.isFinite),
    impliedSubjects:[...new Set(questions.map(q=>String(q.subject)))]
  };
}

document.getElementById('downloadSample').onclick=()=>{
  const sample={
    class:3,
    subject:'maths',
    topic:'Multiplication Practice',
    questions:[
      {id:`sample-${Date.now()}-1`,type:'mcq',question:'7 × 8 = ?',options:['54','56','58','64'],answer:'56',difficulty:'easy'},
      {id:`sample-${Date.now()}-2`,type:'true_false',question:'9 × 9 = 81',answer:true,difficulty:'medium'},
      {id:`sample-${Date.now()}-3`,type:'mcq',question:'6 × 6 = ?',options:['30','32','36','40'],answer:'36',difficulty:'medium'}
    ]
  };
  exportJson(sample,'flashcard-champ-sample-import.json');
  say('✅ Sample file downloaded — edit it and import it back in.');
};

document.getElementById('importBtn').onclick=async()=>{
  const f=importFile.files?.[0];
  if(!f) return say('Choose a JSON file first.',false);
  try{
    const payload=normalizePayload(JSON.parse(await parseText(f)));
    const existing=getQuestions();
    const existingIds=new Set(existing.map(q=>q.id));
    let added=0,updated=0;
    const map=new Map(existing.map(q=>[q.id,q]));
    payload.questions.forEach(q=>{
      if(existingIds.has(q.id))updated++;else added++;
      map.set(q.id,{...q,sourceFile:'localStorage'});
    });
    setQuestions([...map.values()]);

    const topics=new Map(getTopics().map(t=>[t.id,t]));
    payload.topics.forEach(t=>topics.set(t.id,t));
    setTopics([...topics.values()]);

    // Merge (never replace) catalog classes/subjects - from an explicit
    // catalog block if present, and always from whatever the questions
    // themselves reference, so new classes/subjects show up in the game
    // even when the import file has no catalog block at all.
    const incomingClasses=payload.catalog?.classes || payload.impliedClasses.map(n=>({name:`Class ${n}`,number:n}));
    const incomingSubjects=payload.catalog?.subjects || payload.impliedSubjects.map(n=>({name:n}));
    const {addedClasses,addedSubjects}=mergeCatalogEntries(incomingClasses,incomingSubjects);

    let msg=`✅ Imported: ${added} new question(s), ${updated} updated.`;
    if(addedClasses.length) msg+=` +${addedClasses.length} new class(es).`;
    if(addedSubjects.length) msg+=` +${addedSubjects.length} new subject(s).`;
    say(msg);
    importFile.value='';importName.textContent='No file selected';
  }catch(e){say('❌ '+e.message,false);}
};

document.getElementById('exportBtn').onclick=()=>{
  const payload={
    format:'flashcard-champ-export',
    version:2,
    exportedAt:new Date().toISOString(),
    questions:getQuestions(),
    topics:getTopics(),
    catalog:ensureCatalogDefaults()
  };
  exportJson(payload,`flashcard-champ-export-${new Date().toISOString().slice(0,10)}.json`);
  say('✅ Export downloaded.');
};

document.getElementById('backupBtn').onclick=()=>{
  const backup=makeBackup(ensureCatalogDefaults());
  exportJson(backup,`flashcard-champ-backup-${new Date().toISOString().slice(0,10)}.json`);
  say('✅ Full backup downloaded.');
};

document.getElementById('restoreBtn').onclick=()=>{
  const f=restoreFile.files?.[0];
  if(!f)return say('Choose a backup JSON first.',false);
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const pkg=JSON.parse(reader.result);
      if(pkg.format!=='flashcard-champ-backup') throw new Error('This is not a Flashcard Champ backup.');
      if(![1,2].includes(pkg.version)) throw new Error('Unsupported backup version.');
      if(!Array.isArray(pkg.questions)||!Array.isArray(pkg.topics)) throw new Error('Backup is missing data.');
      window.pendingBackup=pkg;
      modal.hidden=false;
      modal.setAttribute('aria-hidden','false');
    }catch(e){say('❌ '+e.message,false);}
  };
  reader.onerror=()=>say('❌ Could not read backup file.',false);
  reader.readAsText(f);
};

document.getElementById('cancel').onclick=()=>{
  modal.hidden=true;
  modal.setAttribute('aria-hidden','true');
  window.pendingBackup=null;
};
document.getElementById('confirmRestore').onclick=()=>{
  try{
    const catalog=restoreBackup(window.pendingBackup);
    if(catalog?.classes && catalog?.subjects) saveCatalog(catalog);
    modal.hidden=true;
    window.pendingBackup=null;
    restoreFile.value='';
    restoreName.textContent='No backup selected';
    say('✅ Backup restored successfully. Reload the page to refresh all tools.');
  }catch(e){
    modal.hidden=true;
    window.pendingBackup=null;
    say('❌ '+e.message,false);
  }
};

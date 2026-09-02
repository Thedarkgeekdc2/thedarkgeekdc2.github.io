
const QUESTIONS_KEY='flashcardChampCustomQuestions';
const TOPICS_KEY='flashcardChampCustomTopics';

export function getQuestions(){
  try{
    const v=JSON.parse(localStorage.getItem(QUESTIONS_KEY)||'[]');
    return Array.isArray(v)?v:[];
  }catch{return []}
}
export function setQuestions(list){
  localStorage.setItem(QUESTIONS_KEY,JSON.stringify(Array.isArray(list)?list:[],null,2));
  window.dispatchEvent(new CustomEvent('flashcard:questions-changed'));
}
export function getTopics(){
  try{
    const v=JSON.parse(localStorage.getItem(TOPICS_KEY)||'[]');
    return Array.isArray(v)?v:[];
  }catch{return []}
}
export function setTopics(list){
  localStorage.setItem(TOPICS_KEY,JSON.stringify(Array.isArray(list)?list:[],null,2));
  window.dispatchEvent(new CustomEvent('flashcard:topics-changed'));
}
export function upsertQuestion(q){
  const all=getQuestions(), i=all.findIndex(x=>x.id===q.id);
  if(i>=0) all[i]=q; else all.push(q);
  setQuestions(all); return q;
}
export function removeQuestion(id){setQuestions(getQuestions().filter(q=>q.id!==id));}
export function upsertTopic(t){
  const all=getTopics(), i=all.findIndex(x=>x.id===t.id);
  if(i>=0) all[i]=t; else all.push(t);
  setTopics(all); return t;
}
export function removeTopic(id){setTopics(getTopics().filter(t=>t.id!==id));}

export function makeBackup(catalog=null){
  return {
    format:'flashcard-champ-backup',
    version:2,
    exportedAt:new Date().toISOString(),
    questions:getQuestions(),
    topics:getTopics(),
    catalog
  };
}
export function restoreBackup(pkg){
  if(!pkg || pkg.format!=='flashcard-champ-backup' || ![1,2].includes(pkg.version)){
    throw new Error('Invalid Flashcard Champ backup file.');
  }
  if(!Array.isArray(pkg.questions) || !Array.isArray(pkg.topics)){
    throw new Error('Backup is missing questions or topics.');
  }
  setQuestions(pkg.questions);
  setTopics(pkg.topics);
  return pkg.catalog||null;
}
export function exportJson(payload, filename){
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=filename||`flashcard-champ-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

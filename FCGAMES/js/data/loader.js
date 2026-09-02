import {getCustomQuestions} from '../storage/custom-questions.js';
import {getTopics as getCustomTopics} from '../storage/data-store.js';

const MANIFEST=new URL('../../data/manifest.json',import.meta.url);
let cache=null;

export async function loadCatalog(){
  const r=await fetch(MANIFEST,{cache:'no-store'});
  if(!r.ok) throw new Error(`Could not load data manifest (${r.status})`);
  return r.json();
}

function validateSet(set,file){
  if(!set||typeof set!=='object') throw new Error(`Invalid JSON data: ${file}`);
  if(!Number.isInteger(set.class)) throw new Error(`Missing/invalid class in ${file}`);
  if(!set.subject) throw new Error(`Missing subject in ${file}`);
  if(!set.topic) throw new Error(`Missing topic in ${file}`);
  if(!Array.isArray(set.questions)) throw new Error(`Missing questions array in ${file}`);
  return set;
}

export async function loadAllQuestions(){
  if(cache)return cache;
  const catalog=await loadCatalog();
  const sets=await Promise.all((catalog.topics||[]).map(async entry=>{
    const fileUrl=new URL('../../'+entry.file,import.meta.url);
    const r=await fetch(fileUrl,{cache:'no-store'});
    if(!r.ok)throw new Error(`Could not load ${entry.file} (${r.status})`);
    return {entry,set:validateSet(await r.json(),entry.file)};
  }));
  const builtIn=sets.flatMap(({entry,set})=>set.questions.map(q=>({
    ...q,class:set.class,subject:set.subject,topic:set.topic,sourceFile:entry.file
  })));
  const custom=getCustomQuestions().map(q=>({...q,sourceFile:'localStorage'}));
  cache=[...builtIn,...custom];
  return cache;
}
export function clearQuestionCache(){cache=null;}

export async function loadTopicCatalog(){
  const manifest=await loadCatalog();
  const map=new Map();
  for(const t of manifest.topics||[]){
    const key=`${t.class}|${String(t.subject).toLowerCase()}|${t.topic}`;
    map.set(key,{class:t.class,subject:t.subject,topic:t.topic,source:'built-in'});
  }
  getCustomTopics().forEach(t=>{
    const key=`${t.class}|${String(t.subject).toLowerCase()}|${t.topic}`;
    map.set(key,{...t,source:'custom'});
  });
  getCustomQuestions().forEach(q=>{
    const key=`${q.class}|${String(q.subject).toLowerCase()}|${q.topic}`;
    if(!map.has(key)) map.set(key,{class:q.class,subject:q.subject,topic:q.topic,source:'custom-question'});
  });
  return [...map.values()];
}

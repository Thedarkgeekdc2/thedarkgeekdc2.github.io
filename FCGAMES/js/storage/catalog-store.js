
const KEY='flashcardChampCatalog';

const DEFAULT_CATALOG = {
  classes: [
    {id:'class-3', name:'Class 3', number:3},
    {id:'class-4', name:'Class 4', number:4}
  ],
  subjects: [
    {id:'subject-maths', name:'Maths'},
    {id:'subject-hindi', name:'Hindi'}
  ]
};

function clone(v){ return JSON.parse(JSON.stringify(v)); }

export function getCatalog(){
  try{
    const raw=JSON.parse(localStorage.getItem(KEY)||'null');
    if(raw && Array.isArray(raw.classes) && Array.isArray(raw.subjects)){
      return {
        classes: raw.classes.filter(Boolean),
        subjects: raw.subjects.filter(Boolean)
      };
    }
  }catch{}
  return clone(DEFAULT_CATALOG);
}

export function saveCatalog(catalog){
  const clean={
    classes:Array.isArray(catalog.classes)?catalog.classes:[],
    subjects:Array.isArray(catalog.subjects)?catalog.subjects:[]
  };
  localStorage.setItem(KEY,JSON.stringify(clean,null,2));
  window.dispatchEvent(new CustomEvent('flashcard:catalog-changed',{detail:clean}));
  return clean;
}

export function ensureCatalogDefaults(){
  // Only seeds the built-in classes/subjects the very first time the app runs
  // (i.e. when nothing has been saved to storage yet). Once a catalog exists,
  // whatever the admin has saved - including deliberate deletions - is
  // respected and never overwritten with the defaults again.
  let raw=null;
  try{ raw=JSON.parse(localStorage.getItem(KEY)||'null'); }catch{}
  if(raw && Array.isArray(raw.classes) && Array.isArray(raw.subjects)){
    return { classes: raw.classes.filter(Boolean), subjects: raw.subjects.filter(Boolean) };
  }
  return saveCatalog(clone(DEFAULT_CATALOG));
}

export function addClass(name){
  const clean=String(name||'').trim();
  if(!clean) throw new Error('Class name is required.');
  const c=getCatalog();
  if(c.classes.some(x=>String(x.name).trim().toLowerCase()===clean.toLowerCase()))
    throw new Error('This class already exists.');
  const nums=c.classes.map(x=>Number(x.number)).filter(Number.isFinite);
  const next=(nums.length?Math.max(...nums):0)+1;
  c.classes.push({id:`class-${Date.now()}`,name:clean,number:next});
  return saveCatalog(c);
}

export function addSubject(name){
  const clean=String(name||'').trim();
  if(!clean) throw new Error('Subject name is required.');
  const c=getCatalog();
  if(c.subjects.some(x=>String(x.name).trim().toLowerCase()===clean.toLowerCase()))
    throw new Error('This subject already exists.');
  c.subjects.push({id:`subject-${Date.now()}`,name:clean});
  return saveCatalog(c);
}

export function removeClass(id){
  const c=getCatalog();
  if(c.classes.length<=1) throw new Error('At least one class must remain.');
  c.classes=c.classes.filter(x=>x.id!==id);
  return saveCatalog(c);
}
export function removeSubject(id){
  const c=getCatalog();
  if(c.subjects.length<=1) throw new Error('At least one subject must remain.');
  c.subjects=c.subjects.filter(x=>x.id!==id);
  return saveCatalog(c);
}

// Adds any classes/subjects that aren't already present (matched by number for
// classes, by name for subjects) without ever removing what's already there.
// Used by Import so bringing in a file with new classes/subjects/topics never
// wipes out what a school has already set up. Returns {addedClasses, addedSubjects}.
export function mergeCatalogEntries(incomingClasses=[], incomingSubjects=[]){
  const c=ensureCatalogDefaults();
  const addedClasses=[],addedSubjects=[];
  incomingClasses.forEach(entry=>{
    const number=Number(entry?.number ?? entry);
    const name=String(entry?.name ?? (Number.isFinite(number)?`Class ${number}`:'')).trim();
    if(!name) return;
    const exists=c.classes.some(x=>(Number.isFinite(number)&&Number(x.number)===number)||String(x.name).trim().toLowerCase()===name.toLowerCase());
    if(!exists){
      const nums=c.classes.map(x=>Number(x.number)).filter(Number.isFinite);
      const finalNumber=Number.isFinite(number)?number:(nums.length?Math.max(...nums):0)+1;
      const rec={id:`class-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name,number:finalNumber};
      c.classes.push(rec); addedClasses.push(rec);
    }
  });
  incomingSubjects.forEach(entry=>{
    const name=String(entry?.name ?? entry ?? '').trim();
    if(!name) return;
    const exists=c.subjects.some(x=>String(x.name).trim().toLowerCase()===name.toLowerCase());
    if(!exists){
      const rec={id:`subject-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name};
      c.subjects.push(rec); addedSubjects.push(rec);
    }
  });
  if(addedClasses.length||addedSubjects.length) saveCatalog(c);
  return {addedClasses,addedSubjects};
}


const KEY='flashcardChampSettings';
const DEFAULTS={
  app:{appName:'Flashcard Champ',version:'1.0.0',releaseYear:2026},
  school:{schoolName:'PM SHRI KV NO 2 KGP',schoolShortName:'KV2KGP',logo:'assets/icons/logo.svg',
    footerText:'Practice a little every day and watch yourself improve! 🌟',copyrightText:'© 2026 PM SHRI KV NO 2 KHARAGPUR',
    showSchoolNameInNavbar:true,showLogoInNavbar:true,showFooter:true},
  game:{questionsPerGame:24,startingLives:6,questionTimeSeconds:60,pointsPerCorrectAnswer:10,
    enableTimer:true,enableLives:true,enableStreak:true,enableSounds:true,
    showAnswerAfterWrong:true,enableSpecialCards:true},
  theme:{theme:'colorful',borderRadius:'large',animations:true,confetti:true}
};
function clone(v){return JSON.parse(JSON.stringify(v));}
function merge(a,b){
  const o=clone(a);
  Object.keys(b||{}).forEach(k=>{
    if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])&&o[k]&&typeof o[k]==='object')o[k]=merge(o[k],b[k]);
    else o[k]=b[k];
  });return o;
}
export function getSettings(){
  try{
    const r=JSON.parse(localStorage.getItem(KEY)||'null');
    return r?merge(DEFAULTS,r):clone(DEFAULTS);
  }catch{return clone(DEFAULTS);}
}
export function saveSettings(v){
  const out=merge(DEFAULTS,v||{});
  localStorage.setItem(KEY,JSON.stringify(out,null,2));
  window.dispatchEvent(new CustomEvent('flashcard:settings-changed',{detail:out}));
  return out;
}
export function resetSettings(){
  localStorage.removeItem(KEY);
  const out=clone(DEFAULTS);
  window.dispatchEvent(new CustomEvent('flashcard:settings-changed',{detail:out}));
  return out;
}

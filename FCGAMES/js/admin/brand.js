import {getSettings} from '../storage/settings-store.js';

function applyBrand(){
  const s=getSettings();
  const name=s.school.schoolName||'Flashcard Champ';
  document.querySelectorAll('.brand span, #schoolName').forEach(el=>{el.textContent=name;});
}
applyBrand();
window.addEventListener('flashcard:settings-changed',applyBrand);

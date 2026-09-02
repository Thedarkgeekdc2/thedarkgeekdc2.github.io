
import {getSettings,saveSettings,resetSettings} from '../storage/settings-store.js';
const $=id=>document.getElementById(id);
const status=$('status');
function say(t,ok=true){status.textContent=t;status.className='tool-status '+(ok?'ok':'error');}
function fill(s){
  $('schoolNameInput').value=s.school.schoolName||'';$('schoolShortName').value=s.school.schoolShortName||'';
  $('logo').value=s.school.logo||'';$('footerText').value=s.school.footerText||'';$('copyrightText').value=s.school.copyrightText||'';
  $('showSchoolName').checked=!!s.school.showSchoolNameInNavbar;$('showLogo').checked=!!s.school.showLogoInNavbar;$('showFooter').checked=!!s.school.showFooter;
  $('questionsPerGame').value=s.game.questionsPerGame;$('startingLives').value=s.game.startingLives;$('questionTimeSeconds').value=s.game.questionTimeSeconds;
  $('pointsPerCorrectAnswer').value=s.game.pointsPerCorrectAnswer;$('enableTimer').checked=!!s.game.enableTimer;$('enableLives').checked=!!s.game.enableLives;
  $('enableStreak').checked=!!s.game.enableStreak;$('enableSounds').checked=!!s.game.enableSounds;$('showAnswerAfterWrong').checked=!!s.game.showAnswerAfterWrong;
  $('enableSpecialCards').checked=!!s.game.enableSpecialCards;$('theme').value=s.theme.theme;$('borderRadius').value=s.theme.borderRadius;
  $('animations').checked=!!s.theme.animations;$('confetti').checked=!!s.theme.confetti;
}
function collect(){const old=getSettings();return {app:old.app,
school:{schoolName:$('schoolNameInput').value.trim(),schoolShortName:$('schoolShortName').value.trim(),logo:$('logo').value.trim(),footerText:$('footerText').value.trim(),copyrightText:$('copyrightText').value.trim(),showSchoolNameInNavbar:$('showSchoolName').checked,showLogoInNavbar:$('showLogo').checked,showFooter:$('showFooter').checked},
game:{questionsPerGame:Math.max(1,Math.min(50,Number($('questionsPerGame').value)||10)),startingLives:Math.max(1,Math.min(9,Number($('startingLives').value)||3)),questionTimeSeconds:Math.max(3,Math.min(120,Number($('questionTimeSeconds').value)||10)),pointsPerCorrectAnswer:Math.max(1,Math.min(1000,Number($('pointsPerCorrectAnswer').value)||10)),enableTimer:$('enableTimer').checked,enableLives:$('enableLives').checked,enableStreak:$('enableStreak').checked,enableSounds:$('enableSounds').checked,showAnswerAfterWrong:$('showAnswerAfterWrong').checked,enableSpecialCards:$('enableSpecialCards').checked},
theme:{theme:$('theme').value,borderRadius:$('borderRadius').value,animations:$('animations').checked,confetti:$('confetti').checked}}}
$('settingsForm').addEventListener('submit',e=>{e.preventDefault();try{saveSettings(collect());say('✅ Settings saved. Refresh the Game to apply all changes.')}catch(err){say('❌ '+err.message,false)}});
$('reset').onclick=()=>{if(confirm('Reset all settings to defaults?')){fill(resetSettings());say('✅ Defaults restored.')}};
fill(getSettings());

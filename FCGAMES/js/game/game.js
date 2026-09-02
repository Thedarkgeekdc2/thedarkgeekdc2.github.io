import { renderQuestion } from './question-types/renderers.js';
import { loadAllQuestions } from '../data/loader.js';

export async function startGame(app, state) {
  const all = await loadAllQuestions();
  const pool = all.filter(q => q.class === state.classNo && q.subject === state.subject && q.topic === state.topic &&
    (state.difficulty === 'mixed' || q.difficulty === state.difficulty));
  const questions = shuffle([...pool]).slice(0, Math.min(10, pool.length));
  const session = { questions, index:0, score:0, lives:3, streak:0, bestStreak:0, correct:0, answers:0, state };
  if (!questions.length) return app.innerHTML='<section class="panel"><h2>No questions</h2><p>Add questions for this topic.</p></section>';
  renderGame(app, session);
}

function renderGame(app, s) {
  const q = s.questions[s.index];
  let time = 10, locked=false;
  app.innerHTML = `
  <section class="game">
    <div class="game-top"><span>Q ${s.index+1}/${s.questions.length}</span><span>⭐ ${s.score}</span><span>🔥 ${s.streak}</span><span>❤️ ${s.lives}</span></div>
    <div class="timer">⏱️ <b id="time">${time}</b>s</div>
    <div id="card"></div>
  </section>`;
  const card = document.querySelector('#card');
  const finishOrNext = correct => {
    if (locked) return; locked = true;
    s.answers++;
    if (correct) { s.correct++; s.streak++; s.bestStreak=Math.max(s.bestStreak,s.streak); s.score += 10; }
    else { s.lives--; s.streak=0; }
    card.querySelectorAll('button,input,[draggable="true"]').forEach(el => el.disabled = true);
    const fb = document.createElement('div');
    fb.className = correct ? 'feedback ok' : 'feedback bad';
    fb.innerHTML = correct ? `✅ Excellent! <b>+10</b>` : `❌ Try again!<div>Correct answer: <b>${answerText(q)}</b></div>`;
    card.appendChild(fb);
    setTimeout(() => {
      if (s.lives <= 0 || s.index >= s.questions.length-1) showResult(app, s);
      else { s.index++; renderGame(app,s); }
    }, 900);
  };
  renderQuestion(card,q,finishOrNext);
  const tick = setInterval(() => {
    if (locked) return clearInterval(tick);
    time--; document.querySelector('#time').textContent=time;
    if (time <= 0) { clearInterval(tick); finishOrNext(false); }
  },1000);
}
function answerText(q){
  if(q.type==='arrange_order') return q.answer.join(' → ');
  if(q.type==='match') return 'all pairs';
  if(q.type==='drag_drop') return 'correct placements';
  return Array.isArray(q.answer) ? q.answer.join(', ') : String(q.answer);
}
function showResult(app,s) {
  const total=s.answers, acc=total?Math.round(s.correct/total*100):0;
  app.innerHTML = `<section class="result"><div class="trophy">🏆</div><h1>Game Complete!</h1>
    <div class="result-grid"><div><b>${s.score}</b><span>Score</span></div><div><b>${s.correct}/${total}</b><span>Correct</span></div><div><b>${acc}%</b><span>Accuracy</span></div><div><b>${s.bestStreak}</b><span>Best Streak</span></div></div>
    <div class="result-actions"><button id="again">🔄 Play Again</button><button id="home">🏠 Home</button></div></section>`;
  document.querySelector('#again').onclick=()=>startGame(app,s.state);
  document.querySelector('#home').onclick=()=>location.reload();
}
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

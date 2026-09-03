const state = {
  config: null, questions: [], filtered: [], index: 0, score: 0, lives: 3, streak: 0,
  bestStreak: 0, correct: 0, wrong: 0, timeLeft: 10, timerId: null, locked: false,
  session: null, paused: false
};

const params = new URLSearchParams(location.search);
const escapeHTML = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
async function loadJSON(path){ const r=await fetch('../'+path,{cache:'no-store'}); if(!r.ok) throw new Error('Could not load '+path); return r.json(); }
function getDifficulty(){ return params.get('difficulty') || 'all'; }

async function boot(){
  try{
    const [game, school, app, topicIndex] = await Promise.all([
      loadJSON('config/game-config.json'), loadJSON('config/school-config.json'), loadJSON('config/app-config.json'), loadJSON('data/topics.json')
    ]);
    const classNo=Number(params.get('class')), subject=params.get('subject'), topic=params.get('topic');
    const selectedTopicId=topic;
    const selectedTopic=topicIndex.topics.find(t=>t.class===classNo && t.subject===subject && t.id===selectedTopicId);
    if(!selectedTopic) throw new Error('Topic not found.');
    const bank=await loadJSON(selectedTopic.file.replace(/^data\//,''));
    state.config={game,school,app,topic:selectedTopic,classNo,subject};
    state.questions=shuffle([...bank.questions]);
    state.filtered = getDifficulty()==='all' ? state.questions : state.questions.filter(q=>q.difficulty===getDifficulty());
    if(!state.filtered.length) state.filtered=state.questions;
    const limit=Math.min(Number(game.questionsPerGame)||24,state.filtered.length);
    state.filtered=shuffle(state.filtered).slice(0,limit);
    state.lives=Number(game.startingLives)||6;
    state.timeLeft=Number(game.questionTimeSeconds)||60;
    state.session={classNo,subject,topicId:selectedTopic.id,topicName:selectedTopic.name};
    renderShell(); renderQuestion();
  }catch(e){ document.body.innerHTML=`<main class="main"><div class="hero-card"><h1>Game Setup Error</h1><p>${escapeHTML(e.message)}</p><a class="primary-btn" href="../index.html">Back Home</a></div></main>`; }
}

function renderShell(){
  const {school,app,topic,game}=state.config;
  document.getElementById('game-app').innerHTML=`<div class="app"><header class="navbar"><div class="brand"><img src="../${escapeHTML(school.logo)}" alt=""><div class="brand-text"><div class="app-name">${escapeHTML(app.appName)}</div><div class="school-name">${escapeHTML(school.schoolName)}</div></div></div><div class="nav-actions"><button class="secondary-btn" id="pause-btn" type="button">⏸️ Pause</button><a class="secondary-btn" href="../index.html">🏠 Home</a></div></header><main class="main game-main"><div class="game-topline"><div><div class="hero-kicker">${escapeHTML(topic.icon||'🃏')} ${escapeHTML(topic.name)}</div><h1 class="game-title">Flashcard Challenge</h1></div><div class="hud"><div class="hud-pill">⭐ <span id="score">0</span></div><div class="hud-pill">🔥 <span id="streak">0</span></div><div class="hud-pill">❤️ <span id="lives">${state.lives}</span></div></div></div><div class="progress-row"><span id="progress-text">Question 1 / ${state.filtered.length}</span><div class="progress-track"><div id="progress-fill" class="progress-fill"></div></div></div><section class="flashcard-wrap"><article class="flashcard" id="flashcard"><div class="card-top"><span class="type-badge" id="type-badge">MCQ</span><div class="timer-badge">⏱️ <span id="timer">${game.questionTimeSeconds}</span></div></div><div id="question-area"></div><div id="feedback" aria-live="polite"></div><div class="next-row"><button id="next-btn" class="primary-btn hidden" type="button">Next Question →</button></div></article></section><div class="tip"><span>💡</span><span>Choose an answer before time runs out.</span></div></main>${school.showFooter?`<footer class="footer"><div class="footer-inner"><div class="footer-main">${escapeHTML(school.copyrightText)}</div><div class="footer-credit">${escapeHTML(school.footerText)}</div></div></footer>`:''}<div id="pause-overlay" class="pause-overlay hidden" role="dialog" aria-modal="true" aria-label="Game Paused" aria-hidden="true"><div class="pause-card"><div class="pause-icon">⏸️</div><h2>Game Paused</h2><p>The timer is stopped. Resume whenever you're ready.</p><div class="pause-actions"><button class="primary-btn" id="resume-btn" type="button">▶️ Resume</button><a class="secondary-btn" href="../index.html">🏠 Home</a></div></div></div></div>`;
  document.getElementById('next-btn').addEventListener('click', nextQuestion);
  document.getElementById('pause-btn').addEventListener('click', pauseGame);
  document.getElementById('resume-btn').addEventListener('click', resumeGame);
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

function pauseGame(){
  if(state.paused || state.lives<=0) return;
  state.paused=true;
  clearTimer();
  const overlay=document.getElementById('pause-overlay');
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden','false');
  const pauseBtn=document.getElementById('pause-btn');
  if(pauseBtn) pauseBtn.disabled=true;
}

function resumeGame(){
  if(!state.paused) return;
  state.paused=false;
  const overlay=document.getElementById('pause-overlay');
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden','true');
  const pauseBtn=document.getElementById('pause-btn');
  if(pauseBtn) pauseBtn.disabled=false;
  if(state.config?.game?.enableTimer && !state.locked && state.lives>0) startTimer();
}

function handleVisibilityChange(){
  // If the app goes to the background (screen lock, tab switch, app switch),
  // pause immediately so the timer never keeps ticking behind the scenes.
  if(document.hidden && !state.paused && state.config && state.lives>0) pauseGame();
}

function renderQuestion(){
  clearTimer(); state.locked=false; state.timeLeft=Number(state.config.game.questionTimeSeconds)||60;
  const q=state.filtered[state.index];
  document.getElementById('progress-text').textContent=`Question ${state.index+1} / ${state.filtered.length}`;
  document.getElementById('progress-fill').style.width=`${((state.index+1)/state.filtered.length)*100}%`;
  document.getElementById('timer').textContent=state.timeLeft;
  document.getElementById('score').textContent=state.score;
  document.getElementById('streak').textContent=state.streak;
  document.getElementById('lives').textContent=state.lives;
  document.getElementById('feedback').innerHTML=''; document.getElementById('next-btn').classList.add('hidden');
  const area=document.getElementById('question-area');
  document.getElementById('type-badge').textContent=labelForType(q.type);
  area.innerHTML=renderType(q);
  bindQuestion(q);
  if(state.config.game.enableTimer) startTimer();
}

function renderType(q){
  const media=q.image?`<div class="question-media"><img src="../${escapeHTML(q.image)}" alt="${escapeHTML(q.imageAlt||'Question image')}" loading="eager"></div>`:'';
  const title=`<div class="question-number">Card ${state.index+1}</div>${media}<h2 class="question-text">${escapeHTML(q.question||'')}</h2>`;
  if(q.type==='true_false'||q.type==='yes_no') return title+`<div class="answer-grid two">${q.type==='yes_no'?`<button class="answer-btn" data-answer="Yes">✅ Yes</button><button class="answer-btn" data-answer="No">❌ No</button>`:`<button class="answer-btn" data-answer="True">✅ True</button><button class="answer-btn" data-answer="False">❌ False</button>`}</div>`;
  if(q.type==='fill_blank'||q.type==='one_word') return title+`<div class="text-answer"><input id="answer-input" autocomplete="off" aria-label="Your answer" placeholder="Type your answer"><button class="primary-btn" id="submit-text">Check Answer</button></div>`;
  if(q.type==='image_based'){
    const opts=(q.options||[]).map(o=>`<button class="answer-btn" data-answer="${escapeHTML(o)}">${escapeHTML(o)}</button>`).join('');
    return title+`<div class="answer-grid">${opts}</div>`;
  }
  if(q.type==='identify_picture'){
    const opts=(q.options||[]).map(o=>typeof o==='string'?`<button class="answer-btn" data-answer="${escapeHTML(o)}">${escapeHTML(o)}</button>`:`<button class="answer-btn picture-option" data-answer="${escapeHTML(o.answer)}"><img src="../${escapeHTML(o.image)}" alt="" loading="eager"><span>${escapeHTML(o.label||o.answer)}</span></button>`).join('');
    return title+`<div class="answer-grid picture-grid">${opts}</div>`;
  }
  if(q.type==='odd_one_out'){
    const opts=(q.options||[]).map(o=>`<button class="answer-btn" data-answer="${escapeHTML(o)}">${escapeHTML(o)}</button>`).join('');
    return title+`<div class="answer-grid">${opts}</div>`;
  }
  if(q.type==='choose_answer'||q.type==='mcq'){
    const opts=(q.options||[]).map(o=>`<button class="answer-btn" data-answer="${escapeHTML(o)}">${escapeHTML(o)}</button>`).join('');
    return title+`<div class="answer-grid">${opts}</div>`;
  }
  if(q.type==='match') return renderMatch(q,title);
  if(q.type==='arrange_order') return renderArrange(q,title);
  if(q.type==='drag_drop') return renderDragDrop(q,title);
  return title+`<div class="feedback error">Unsupported question type: ${escapeHTML(q.type)}</div>`;
}

function renderMatch(q,title){
  const left=q.left||[]; const right=q.right||[];
  return title+`<div class="match-board"><div><h3>Match the pairs</h3><div id="match-left">${left.map(x=>`<button class="match-item" data-match-left="${escapeHTML(x.id)}">${escapeHTML(x.text)}</button>`).join('')}</div></div><div><h3>Choose a match</h3><div id="match-right">${right.map(x=>`<button class="match-item" data-match-right="${escapeHTML(x.id)}">${escapeHTML(x.text)}</button>`).join('')}</div></div></div><div class="interactive-hint" id="match-hint">Select one item from each side.</div><button class="primary-btn" id="match-submit">Check Matches</button>`;
}
function renderArrange(q,title){
  const items=(q.items||[]).map((x,i)=>`<button class="order-item" draggable="true" data-order-id="${escapeHTML(x.id||String(i))}" data-correct-index="${Number(x.correctIndex??i)}">☰ ${escapeHTML(x.text??x)}</button>`).join('');
  return title+`<div class="order-list" id="order-list">${items}</div><div class="interactive-hint">Drag the items into the correct order.</div><button class="primary-btn" id="order-submit">Check Order</button>`;
}
function renderDragDrop(q,title){
  const items=(q.items||[]).map((x,i)=>`<div class="drag-item" draggable="true" data-drag-id="${escapeHTML(x.id||String(i))}">${escapeHTML(x.text??x)}</div>`).join('');
  const zones=(q.zones||[]).map(z=>`<div class="drop-zone" data-zone-id="${escapeHTML(z.id)}"><strong>${escapeHTML(z.label)}</strong><span>Drop here</span></div>`).join('');
  return title+`<div class="drag-source" id="drag-source">${items}</div><div class="drop-grid">${zones}</div><div class="interactive-hint">Drag each card into its matching box.</div><button class="primary-btn" id="drag-submit">Check Answers</button>`;
}

function bindQuestion(q){
  document.querySelectorAll('.answer-btn').forEach(btn=>btn.addEventListener('click',()=>handleAnswer(btn.dataset.answer,q)));
  const submit=document.getElementById('submit-text'); if(submit){submit.addEventListener('click',()=>handleAnswer(document.getElementById('answer-input').value,q)); document.getElementById('answer-input').addEventListener('keydown',e=>{if(e.key==='Enter')submit.click();}); setTimeout(()=>document.getElementById('answer-input')?.focus(),50);}
  if(q.type==='match') bindMatch(q);
  if(q.type==='arrange_order') bindArrange(q);
  if(q.type==='drag_drop') bindDragDrop(q);
}
function normalized(v){return String(v??'').trim().toLowerCase().replace(/[।,.!?]$/,'');}
function isCorrect(given,q){ const acceptable=[q.answer,...(q.acceptableAnswers||[])].filter(v=>v!==undefined).map(normalized); return acceptable.includes(normalized(given)); }
function handleAnswer(given,q){ if(state.locked) return; state.locked=true; clearTimer(); const ok=isCorrect(given,q); const buttons=[...document.querySelectorAll('.answer-btn')]; buttons.forEach(b=>{b.disabled=true; if(normalized(b.dataset.answer)===normalized(q.answer)) b.classList.add('correct'); if(normalized(b.dataset.answer)===normalized(given)&&!ok) b.classList.add('wrong');}); finishAnswer(ok,q); }
function finishAnswer(ok,q){
  if(ok){state.correct++;state.streak++;state.bestStreak=Math.max(state.bestStreak,state.streak); state.score+=Number(state.config.game.pointsPerCorrectAnswer)||10; document.getElementById('feedback').innerHTML=`<div class="feedback success">🎉 ${state.streak>=3?'Great streak!':'Very good!'} <strong>+${state.config.game.pointsPerCorrectAnswer} points</strong></div>`;}
  else{state.wrong++;state.streak=0;if(state.config.game.enableLives) state.lives--; document.getElementById('lives').textContent=state.lives; document.getElementById('feedback').innerHTML=`<div class="feedback error">❌ Correct answer: <strong>${escapeHTML(q.answer||q.explanation||'See the correct arrangement')}</strong></div>`;}
  document.getElementById('score').textContent=state.score; document.getElementById('streak').textContent=state.streak;
  document.getElementById('next-btn').classList.remove('hidden'); if(state.lives<=0){ document.getElementById('next-btn').textContent='See Result →'; document.getElementById('next-btn').onclick=finishGame; }
}
function bindMatch(q){
  let selectedLeft=null, selectedRight=null;
  const hint=document.getElementById('match-hint');
  document.querySelectorAll('[data-match-left]').forEach(b=>b.addEventListener('click',()=>{if(state.locked)return;selectedLeft=b.dataset.matchLeft;document.querySelectorAll('[data-match-left]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');hint.textContent='Now select its matching item.';}));
  document.querySelectorAll('[data-match-right]').forEach(b=>b.addEventListener('click',()=>{if(state.locked)return;selectedRight=b.dataset.matchRight;document.querySelectorAll('[data-match-right]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');hint.textContent='Press Check Matches.';}));
  document.getElementById('match-submit').addEventListener('click',()=>{if(!selectedLeft||!selectedRight)return; const correct=q.pairs?.every(p=>p.left===selectedLeft&&p.right===selectedRight)||q.answer?.[selectedLeft]===selectedRight; handleInteractiveResult(Boolean(correct),q);});
}
function bindArrange(q){
  const list=document.getElementById('order-list'); let dragged=null;
  list.querySelectorAll('.order-item').forEach(el=>{el.addEventListener('dragstart',()=>dragged=el);el.addEventListener('dragover',e=>e.preventDefault());el.addEventListener('drop',()=>{if(!dragged||dragged===el)return;const nodes=[...list.children];const from=nodes.indexOf(dragged),to=nodes.indexOf(el);if(from<to)list.insertBefore(dragged,el.nextSibling);else list.insertBefore(dragged,el);});});
  document.getElementById('order-submit').addEventListener('click',()=>{const order=[...list.children].map(x=>x.dataset.orderId);const expected=(q.correctOrder||q.items.map(x=>x.id)).map(String);handleInteractiveResult(JSON.stringify(order)===JSON.stringify(expected),q);});
}
function bindDragDrop(q){
  document.querySelectorAll('.drag-item').forEach(el=>el.addEventListener('dragstart',e=>e.dataTransfer.setData('text/plain',el.dataset.dragId)));
  document.querySelectorAll('.drop-zone').forEach(zone=>{zone.addEventListener('dragover',e=>e.preventDefault());zone.addEventListener('drop',e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');const item=document.querySelector(`[data-drag-id="${CSS.escape(id)}"]`);if(item){zone.appendChild(item);zone.classList.add('filled');}});});
  document.getElementById('drag-submit').addEventListener('click',()=>{const ok=(q.answerMap||[]).every(p=>document.querySelector(`[data-zone-id="${CSS.escape(p.zone)}"] [data-drag-id="${CSS.escape(p.item)}"]`));handleInteractiveResult(ok,q);});
}
function handleInteractiveResult(ok,q){if(state.locked)return;state.locked=true;clearTimer();finishAnswer(ok,q);}
function startTimer(){ clearTimer(); if(state.paused) return; state.timerId=setInterval(()=>{if(state.paused){clearTimer();return;}state.timeLeft--;document.getElementById('timer').textContent=state.timeLeft;if(state.timeLeft<=0){clearTimer();if(!state.locked) timeOut();}},1000); }
function timeOut(){ const q=state.filtered[state.index]; state.locked=true;state.wrong++;state.streak=0;if(state.config.game.enableLives)state.lives--;document.getElementById('lives').textContent=state.lives;document.getElementById('feedback').innerHTML=`<div class="feedback error">⏰ Time up! Correct answer: <strong>${escapeHTML(q.answer)}</strong></div>`;document.querySelectorAll('.answer-btn').forEach(b=>{b.disabled=true;if(normalized(b.dataset.answer)===normalized(q.answer))b.classList.add('correct');});document.getElementById('next-btn').classList.remove('hidden');if(state.lives<=0){document.getElementById('next-btn').textContent='See Result →';document.getElementById('next-btn').onclick=finishGame;}}
function nextQuestion(){ if(state.lives<=0){finishGame();return;} state.index++; if(state.index>=state.filtered.length){finishGame();return;} document.getElementById('next-btn').onclick=nextQuestion;document.getElementById('next-btn').textContent='Next Question →';renderQuestion(); }
function finishGame(){clearTimer();sessionStorage.setItem('fc-result',JSON.stringify({score:state.score,correct:state.correct,wrong:state.wrong,bestStreak:state.bestStreak,total:state.filtered.length,topicName:state.session.topicName,classNo:state.session.classNo,subject:state.session.subject}));location.href=`../pages/result.html`;}
function clearTimer(){if(state.timerId){clearInterval(state.timerId);state.timerId=null;}}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function labelForType(type){return ({mcq:'MCQ',true_false:'TRUE / FALSE',fill_blank:'FILL IN THE BLANK',one_word:'ONE WORD',choose_answer:'CHOOSE THE ANSWER',yes_no:'YES / NO'})[type]||String(type).replaceAll('_',' ').toUpperCase();}
boot();

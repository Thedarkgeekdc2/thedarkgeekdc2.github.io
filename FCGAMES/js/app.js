(() => {
'use strict';

const app=document.getElementById('app');
const state={classNo:null,className:'',subject:'',subjectName:'',topic:'',difficulty:'mixed'};
let allQuestions=[];

async function getLoader(){return import('./data/loader.js');}
async function getCatalog(){
  const m=await import('./storage/catalog-store.js');
  return m.ensureCatalogDefaults();
}
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
let audioCtx=null;
function playTone(freq,duration,type='sine',delay=0){
  try{
    audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended')audioCtx.resume();
    const start=audioCtx.currentTime+delay;
    const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
    osc.type=type;osc.frequency.value=freq;
    gain.gain.setValueAtTime(0.001,start);
    gain.gain.linearRampToValueAtTime(3.0,start+0.02);
    gain.gain.exponentialRampToValueAtTime(0.001,start+duration);
    osc.connect(gain);gain.connect(audioCtx.destination);
    osc.start(start);osc.stop(start+duration+0.02);
  }catch{}
}
function playSound(ok){
  if(ok){
    // Correct: 🎵 happy rising notes
    playTone(523,0.10,'sine');
    playTone(659,0.10,'sine',0.08);
    playTone(784,0.18,'sine',0.16);
  }else{
    // Wrong: ❌ short buzzer
    playTone(220,0.20,'sawtooth');
    playTone(160,0.28,'sawtooth',0.12);
  }
}
function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
async function loadQuestions(){
  const m=await getLoader();
  allQuestions=await m.loadAllQuestions();
  return allQuestions;
}
async function home(){
  const c=await getCatalog();

  app.innerHTML=`<section class="hero">

    <div class="class-grid">

      ${c.classes.map(x=>`
        <button
          class="class-card"
          data-class="${x.number}"
          data-name="${esc(x.name)}"
          type="button"
        >
          <span class="card-emoji">🏫</span>

          <strong>
            ${esc(x.name)}
          </strong>

          <span>
            Choose a subject to continue
          </span>
        </button>
      `).join('')}

    </div>

  </section>`;

  document
    .querySelectorAll('[data-class]')
    .forEach(b=>{
      b.onclick=()=>chooseClass(
        Number(b.dataset.class),
        b.dataset.name
      );
    });
}
async function chooseClass(n,name){
  state.classNo=n;state.className=name;
  const c=await getCatalog();
  app.innerHTML=`<section class="panel"><button class="back" id="back">← Home</button><h2>🏫 ${esc(name)}</h2><p>Select a subject.</p>
    <div class="topic-grid">${c.subjects.map(s=>`<button class="topic-card subject-card" data-sub="${esc(s.name)}"><span class="card-emoji">${String(s.name).toLowerCase()==='maths'?'🧮':'📚'}</span><strong>${esc(s.name)}</strong></button>`).join('')}</div></section>`;
  document.getElementById('back').onclick=home;
  document.querySelectorAll('[data-sub]').forEach(b=>b.onclick=()=>chooseSubject(b.dataset.sub));
}
function topicKey(t){return String(t??'').trim().toLowerCase().replace(/\s+/g,' ');}
async function chooseSubject(name){
  state.subject=String(name).toLowerCase();state.subjectName=name;
  await loadQuestions();
  const topicMap=new Map();
  allQuestions.filter(q=>q.class===state.classNo&&String(q.subject).toLowerCase()===state.subject).forEach(q=>{
    const key=topicKey(q.topic);
    if(key&&!topicMap.has(key))topicMap.set(key,String(q.topic).trim());
  });
  const topics=[...topicMap.values()];
  if(!topics.length){
    app.innerHTML=`<section class="panel"><button class="back" id="back">← Subjects</button><h2>${esc(name)}</h2><p>No questions available for this subject yet.</p><p class="muted">Create a topic and question in Admin Question Builder first.</p></section>`;
    document.getElementById('back').onclick=()=>chooseClass(state.classNo,state.className);return;
  }
  app.innerHTML=`<section class="panel"><button class="back" id="back">← Subjects</button><h2>📚 ${esc(name)}</h2><p>Select a topic.</p>
  <div class="topic-grid">${topics.map(t=>`<button class="topic-card" data-topic="${encodeURIComponent(t)}">📚<strong>${esc(t)}</strong></button>`).join('')}</div></section>`;
  document.getElementById('back').onclick=()=>chooseClass(state.classNo,state.className);
  document.querySelectorAll('[data-topic]').forEach(b=>b.onclick=()=>chooseTopic(decodeURIComponent(b.dataset.topic)));
}
function chooseTopic(topic){
  state.topic=topic;
  app.innerHTML=`<section class="panel"><button class="back" id="back">← Topics</button><h2>${esc(topic)}</h2><p>Choose difficulty.</p>
    <div class="difficulty-grid"><button data-d="easy">🟢 Easy</button><button data-d="medium">🟡 Medium</button><button data-d="challenge">🔴 Challenge</button><button data-d="mixed">🎲 Mixed</button></div></section>`;
  document.getElementById('back').onclick=()=>chooseSubject(state.subjectName);
  document.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>startGame(b.dataset.d));
}
async function startGame(diff){
  const settings=(await import('./storage/settings-store.js')).getSettings();
  state.difficulty=diff;await loadQuestions();
  const pool=allQuestions.filter(q=>q.class===state.classNo&&String(q.subject).toLowerCase()===state.subject&&topicKey(q.topic)===topicKey(state.topic)&&(diff==='mixed'||q.difficulty===diff));
  if(!pool.length){alert('No questions found for this selection.');return;}
  const requested=Number(settings.game.questionsPerGame)||10;
  const s={questions:shuffle(pool).slice(0,Math.min(requested,pool.length)),index:0,score:0,lives:settings.game.enableLives?settings.game.startingLives:999,streak:0,bestStreak:0,correct:0,answers:0,state:{...state},settings,poolSize:pool.length,requested};
  renderGame(s);
}
function renderGame(s){
  const q=s.questions[s.index];let locked=false,time=s.settings.game.questionTimeSeconds;
  app.innerHTML=`<section class="game"><div class="game-top"><span class="progress-chip">Q ${s.index+1}/${s.questions.length}</span><span class="progress-chip">⭐ <b id="score">${s.score}</b></span>${s.settings.game.enableStreak?`<span class="progress-chip">🔥 <b id="streak">${s.streak}</b></span>`:''}${s.settings.game.enableLives?`<span class="progress-chip">❤️ <b id="lives">${s.lives}</b></span>`:''}</div><div class="progress-track"><div class="progress-fill" style="width:${Math.round((s.index)/s.questions.length*100)}%"></div></div>${s.settings.game.enableTimer?`<div class="timer">⏱️ <b id="time">${s.settings.game.questionTimeSeconds}</b>s</div>`:''}<div id="question-card"></div></section>`;
  const root=document.getElementById('question-card');
  renderQuestion(root,q,finish);
  let tick=null;
  if(s.settings.game.enableTimer){
    tick=setInterval(()=>{
      if(locked){clearInterval(tick);return;}
      time--;
      const timeEl=document.getElementById('time');
      if(timeEl)timeEl.textContent=time;
      if(time<=2){document.getElementById('time')?.parentElement?.classList.add('timer-warn');}
      if(time<=0){clearInterval(tick);finish(false);}
    },1000);
  }
  function finish(ok){
    if(locked)return;locked=true;if(tick)clearInterval(tick);s.answers++;
    if(s.settings.game.enableSounds)playSound(ok);
    if(ok){
      s.correct++;
      if(s.settings.game.enableStreak){s.streak++;s.bestStreak=Math.max(s.bestStreak,s.streak);}
      s.score+=Number(s.settings.game.pointsPerCorrectAnswer)||10;
      confettiBurst(s,16);
    }else{
      if(s.settings.game.enableLives)s.lives--;
      if(s.settings.game.enableStreak)s.streak=0;
    }
    root.querySelectorAll('button,input').forEach(e=>e.disabled=true);
    root.classList.add(ok?'card-correct':'card-wrong');
    let feedbackHtml=`<div class="feedback ${ok?'ok':'bad'}">${ok?'✅ Excellent! <b>+'+(Number(s.settings.game.pointsPerCorrectAnswer)||10)+'</b>':'❌ Try again next time!'}</div>`;
    if(!ok&&s.settings.game.showAnswerAfterWrong){
      feedbackHtml=`<div class="feedback bad">❌ ${esc(correctAnswerText(q))}</div>`;
    }
    root.insertAdjacentHTML('beforeend',feedbackHtml);
    setTimeout(()=>{if((s.settings?.game?.enableLives&&s.lives<=0)||s.index>=s.questions.length-1)showResult(s);else{s.index++;renderGame(s);}},900);
  }
}
function correctAnswerText(q){
  if(q.type==='true_false')return 'The correct answer was '+(norm(q.answer)==='true'?'True':'False')+'. Check it and try the next one!';
  if(q.type==='yes_no')return 'The correct answer was '+esc(q.answer)+'. Check it and try the next one!';
  if(q.acceptedAnswers||q.answer!==undefined&&!Array.isArray(q.answer))return 'The correct answer was '+esc(String(q.answer??'')||'—')+'.';
  return 'Check the correct answer and try again.';
}
function renderQuestion(root,q,done){
  const type=q.type;
  let body=q.image?`<img class="q-image" src="${esc(q.image)}" alt="Question image" onerror="this.classList.add('img-broken')">`:'';
  const opts=getOptions(q).map(optionButton).join('');
  if(['mcq','choose_answer','odd_one_out','image_mcq','identify_picture','image_based'].includes(type))body+=`<div class="options">${opts}</div>`;
  else if(type==='true_false')body+='<div class="options"><button class="option" data-v="true">✅ True</button><button class="option" data-v="false">❌ False</button></div>';
  else if(type==='yes_no')body+='<div class="options"><button class="option" data-v="Yes">👍 Yes</button><button class="option" data-v="No">👎 No</button></div>';
  else if(type==='match')body+=matchMarkup(q);
  else if(type==='arrange_order')body+=arrangeMarkup(q);
  else if(type==='drag_drop')body+=dragMarkup(q);
  root.innerHTML=`<div class="card"><div class="question-head"><span class="type">${esc(type.replaceAll('_',' '))}</span><h2>${esc(q.question||'')}</h2></div>${body}</div>`;
  root.querySelectorAll('.option').forEach(b=>b.onclick=()=>done(compare(b.dataset.v,q.answer)));
  root.querySelector('#checkArrange')?.addEventListener('click',()=>done([...root.querySelectorAll('.sort-row')].map(x=>x.dataset.val).join('|')===(q.answer||[]).join('|')));
  setupArrange(root);
  if(type==='match')setupMatch(root,q,done);
  if(type==='drag_drop')setupDrag(root,q,done);
}
function compare(a,b){return norm(a)===norm(b);}
function norm(v){return String(v??'').trim().toLowerCase().replace(/\s+/g,' ');}
function getOptions(q){
  if(Array.isArray(q.options)&&q.options.length)return q.options;
  if(Array.isArray(q.imageOptions)&&q.imageOptions.length)return q.imageOptions;
  return [];
}
function optionValue(o){return (o&&typeof o==='object')?(o.answer??o.value??o.label??''):o;}
function optionButton(o){
  const val=optionValue(o);
  if(o&&typeof o==='object'&&o.image){
    return `<button class="option option-image" data-v="${esc(val)}"><img src="${esc(o.image)}" alt="${esc(o.label??val)}" loading="lazy" onerror="this.closest('.option-image').classList.add('img-broken')"><span>${esc(o.label??val)}</span></button>`;
  }
  return `<button class="option" data-v="${esc(val)}">${esc(val)}</button>`;
}
function arrangeMarkup(q){return `<div class="sort-help">Tap ↑ / ↓ to reorder, or drag the cards.</div><div class="sort-items" id="sortItems">${shuffle(q.items||[]).map(x=>`<div class="sort-row" draggable="true" tabindex="0" data-val="${esc(x)}"><button class="sort-item" type="button">${esc(x)}</button><button class="move-up" type="button" aria-label="Move up">↑</button><button class="move-down" type="button" aria-label="Move down">↓</button></div>`).join('')}</div><button id="checkArrange" class="primary">Check Order</button>`;}
function matchMarkup(q){return `<div class="match-grid"><div>${(q.pairs||[]).map(p=>`<button class="match-left" data-left="${esc(p.left)}">${esc(p.left)}</button>`).join('')}</div><div>${shuffle((q.pairs||[]).map(p=>p.right)).map(r=>`<button class="match-right" data-right="${esc(r)}">${esc(r)}</button>`).join('')}</div></div><button id="checkMatch" class="primary">Check Matching</button>`;}
function dragMarkup(q){
  const items=q.pairs||q.targets||[];
  const drags=items.map(p=>`<span class="drag" draggable="true" tabindex="0" data-v="${esc(p.drag||p.label)}">${esc(p.drag||p.label)}</span>`).join('');
  const drops=items.map(p=>{
    const label=esc(p.target||p.label);
    const hasImage=!!p.image;
    return `<div class="drop${hasImage?' picture-drop':''}" data-target="${label}">${hasImage?`<img src="${esc(p.image)}" alt="${label}" onerror="this.style.display='none'">`:''}<span class="drop-label">${label}</span></div>`;
  }).join('');
  return `<div class="drag-help">Drag a tile onto its box, or tap a tile then tap a box. Tap a filled box to take it back.</div><div class="drag-area"><div class="drags">${drags}</div><div class="targets">${drops}</div></div><button id="checkDrag" class="primary">Check Placements</button>`;
}
function setupArrange(root){
  const list=root.querySelector('#sortItems');if(!list)return;let dragged=null;
  const select=r=>{list.querySelectorAll('.sort-row').forEach(x=>x.classList.remove('selected-row'));r.classList.add('selected-row');};
  const rows=()=>[...list.querySelectorAll('.sort-row')];
  rows().forEach(r=>{
    r.querySelector('.sort-item').onclick=()=>select(r);
    r.querySelector('.move-up').onclick=()=>{const rs=rows(),i=rs.indexOf(r);if(i>0)list.insertBefore(r,rs[i-1]);select(r);}
    r.querySelector('.move-down').onclick=()=>{const rs=rows(),i=rs.indexOf(r);if(i<rs.length-1)list.insertBefore(rs[i+1],r);select(r);}
    r.addEventListener('dragstart',()=>{dragged=r;r.classList.add('dragging');});
    r.addEventListener('dragend',()=>{r.classList.remove('dragging');dragged=null;});
    r.addEventListener('dragover',e=>e.preventDefault());
    r.addEventListener('drop',e=>{e.preventDefault();if(!dragged||dragged===r)return;const rs=rows(),di=rs.indexOf(dragged),ri=rs.indexOf(r);if(di<ri)list.insertBefore(dragged,r.nextSibling);else list.insertBefore(dragged,r);select(dragged);});
  });
}
function setupMatch(root,q,done){
  let current=null,map={};root.querySelectorAll('.match-left').forEach(b=>b.onclick=()=>{current=b.dataset.left;root.querySelectorAll('.match-left').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');});
  root.querySelectorAll('.match-right').forEach(b=>b.onclick=()=>{if(current){map[current]=b.dataset.right;b.classList.add('selected');current=null;}});
  root.querySelector('#checkMatch').onclick=()=>done((q.pairs||[]).every(p=>map[p.left]===p.right));
}
function setupDrag(root,q,done){
  let selected=null,dragged=null;
  const drags=[...root.querySelectorAll('.drag')],drops=[...root.querySelectorAll('.drop')];
  const findDragByValue=v=>drags.find(d=>d.dataset.v===v);
  const clearTarget=t=>{
    const prevVal=t.dataset.placed;
    if(prevVal){const prevDrag=findDragByValue(prevVal);prevDrag?.classList.remove('used');}
    delete t.dataset.placed;
    t.querySelector('.placed')?.remove();
  };
  const place=(d,t)=>{
    if(!d||!t||d.classList.contains('used'))return;
    clearTarget(t);
    t.dataset.placed=d.dataset.v;
    const s=document.createElement('span');s.className='placed';s.textContent='✓ '+d.dataset.v;t.appendChild(s);
    d.classList.add('used');
    d.classList.remove('touch-selected');
    if(selected===d)selected=null;
  };
  drags.forEach(d=>{
    d.onclick=()=>{
      if(d.classList.contains('used'))return;
      drags.forEach(x=>x.classList.remove('touch-selected'));
      d.classList.add('touch-selected');selected=d;
    };
    d.ondragstart=e=>{if(d.classList.contains('used')){e.preventDefault();return;}dragged=d;e.dataTransfer?.setData('text/plain',d.dataset.v);};
    d.ondragend=()=>dragged=null;
  });
  drops.forEach(t=>{
    t.ondragover=e=>e.preventDefault();
    t.ondrop=e=>{e.preventDefault();place(dragged||findDragByValue(e.dataTransfer?.getData('text/plain')),t);dragged=null;};
    t.onclick=()=>{
      if(t.dataset.placed){clearTarget(t);return;}
      if(selected){place(selected,t);}
    };
  });
  root.querySelector('#checkDrag').onclick=()=>{
    const ok=q.pairs
      ?q.pairs.every(p=>drops.some(d=>d.dataset.target===p.target&&d.dataset.placed===p.drag))
      :(q.targets||[]).every(t=>drops.some(d=>d.dataset.target===t.label&&d.dataset.placed===t.label));
    done(ok);
  };
}
function confettiEnabled(s){
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return false;
  return s.settings?.theme?.confetti!==false && s.settings?.theme?.animations!==false;
}
function confettiBurst(s,count){
  if(!confettiEnabled(s))return;
  const colors=['#ff6b6b','#ffd166','#06d6a0','#4cc9f0','#9b5de5','#ff8fab'];
  const layer=document.createElement('div');
  layer.className='confetti-layer';
  for(let i=0;i<count;i++){
    const p=document.createElement('span');
    p.className='confetti-piece';
    p.style.setProperty('--x',(Math.random()*100)+'%');
    p.style.setProperty('--delay',(Math.random()*0.25)+'s');
    p.style.setProperty('--rot',(Math.random()*360)+'deg');
    p.style.setProperty('--drift',(Math.random()*80-40)+'px');
    p.style.background=colors[i%colors.length];
    layer.appendChild(p);
  }
  document.body.appendChild(layer);
  setTimeout(()=>layer.remove(),1500);
}
function showResult(s){
  const acc=s.answers?Math.round(s.correct/s.answers*100):0;
  const praise=acc>=90?'Outstanding work! 🌟':acc>=70?'Great job! 👏':acc>=40?'Nice effort — keep practicing! 💪':'Keep going, you\u2019ll get there! 🌱';
  app.innerHTML=`<section class="result"><div class="trophy">🏆</div><h1>Game Complete!</h1><p class="result-praise">${esc(praise)}</p><div class="result-grid"><div><b>${s.score}</b><span>Score</span></div><div><b>${s.correct}/${s.answers}</b><span>Correct</span></div><div><b>${acc}%</b><span>Accuracy</span></div><div><b>${s.bestStreak}</b><span>Best Streak</span></div></div><div class="result-actions"><button id="again" class="primary">🔄 Play Again</button><button id="home">🏠 Home</button></div></section>`;
  document.getElementById('again').onclick=()=>startGame(s.state.difficulty);
  document.getElementById('home').onclick=home;
  confettiBurst(s,acc>=70?42:22);
}
function showError(e){console.error(e);app.innerHTML=`<section class="panel"><h2>Something went wrong</h2><p>${esc(e.message||e)}</p><button class="primary" onclick="location.reload()">Retry</button></section>`;}
window.FlashcardApp={chooseClass,home};
home().catch(showError);
})();


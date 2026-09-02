export function renderQuestion(root,q,done){
  const h = `<div class="question-head"><span class="type">${q.type.replaceAll('_',' ')}</span><h2>${q.question}</h2></div>`;
  let body='';
  const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const buttonOptions = opts => opts.map(o=>`<button class="option" data-value="${esc(o)}">${esc(o)}</button>`).join('');
  if(q.image) body += `<img class="q-image" src="${q.image}" alt="Question image">`;
  if(q.type==='mcq'||q.type==='choose_answer'||q.type==='image_mcq'||q.type==='identify_picture') body += `<div class="options">${buttonOptions(q.options)}</div>`;
  else if(q.type==='true_false') body += `<div class="options"><button class="option" data-value="true">True</button><button class="option" data-value="false">False</button></div>`;
  else if(q.type==='yes_no') body += `<div class="options"><button class="option" data-value="Yes">Yes</button><button class="option" data-value="No">No</button></div>`;
  else if(q.type==='fill_blank'||q.type==='one_word') body += `<div class="input-row"><input id="answer" autocomplete="off" placeholder="Type your answer"><button id="submit">Submit</button></div>`;
  else if(q.type==='odd_one_out') body += `<div class="options">${buttonOptions(q.options)}</div>`;
  else if(q.type==='arrange_order') {
    body += `<div class="sort-items" id="sortItems">${shuffle([...q.items]).map((x,i)=>`<button class="sort-item" draggable="true" data-val="${esc(x)}">${esc(x)}</button>`).join('')}</div><button id="checkArrange" class="primary">Check Order</button>`;
  } else if(q.type==='match') {
    body += `<div class="match-grid"><div>${q.pairs.map(p=>`<button class="match-left" data-left="${esc(p.left)}">${esc(p.left)}</button>`).join('')}</div><div>${shuffle(q.pairs.map(p=>p.right)).map(r=>`<button class="match-right" data-right="${esc(r)}">${esc(r)}</button>`).join('')}</div></div><button id="checkMatch" class="primary">Check Matching</button><div id="matchStatus"></div>`;
  } else if(q.type==='drag_drop') {
    if(q.pairs) body += `<div class="drag-area"><div class="drags">${q.pairs.map(p=>`<span class="drag" draggable="true" data-v="${esc(p.drag)}">${esc(p.drag)}</span>`).join('')}</div><div class="targets">${q.pairs.map(p=>`<div class="drop" data-target="${esc(p.target)}">${esc(p.target)}</div>`).join('')}</div></div>`;
    else if(q.targets) body += `<div class="drag-area"><div class="drags">${q.targets.map(t=>`<span class="drag" draggable="true" data-v="${esc(t.label)}">${esc(t.label)}</span>`).join('')}</div><div class="targets">${q.targets.map(t=>`<div class="drop picture-drop" data-target="${esc(t.label)}"><img src="${t.image}" alt="${esc(t.label)}"><span>${esc(t.label)}</span></div>`).join('')}</div></div>`;
    body += `<button id="checkDrag" class="primary">Check Placements</button>`;
  }
  root.innerHTML = `<div class="card">${h}${body}</div>`;
  const normal = root.querySelectorAll('.option');
  normal.forEach(b=>b.onclick=()=>done(String(b.dataset.value)===String(q.answer)));
  const submit = root.querySelector('#submit');
  if(submit) submit.onclick=()=>done((q.acceptedAnswers||[String(q.answer)]).some(a=>norm(root.querySelector('#answer').value)===norm(a)));
  root.querySelector('#checkArrange')?.addEventListener('click',()=>done([...root.querySelectorAll('.sort-item')].map(x=>x.dataset.val).join('|')===q.answer.join('|')));
  if(q.type==='match') setupMatch(root,q,done);
  if(q.type==='drag_drop') setupDrag(root,q,done);
  setupSort(root);
}
function norm(s){return String(s).trim().toLowerCase().replace(/\s+/g,' ')}
function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function setupSort(root){
  const items=[...root.querySelectorAll('.sort-item')]; let dragged;
  items.forEach(el=>el.addEventListener('dragstart',()=>dragged=el));
  items.forEach(el=>el.addEventListener('dragover',e=>{e.preventDefault();}));
  items.forEach(el=>el.addEventListener('drop',e=>{e.preventDefault(); if(dragged&&dragged!==el){const parent=el.parentNode, nodes=[...parent.children], di=nodes.indexOf(dragged), ti=nodes.indexOf(el); parent.insertBefore(dragged, di<ti?el:el); if(di>ti) parent.insertBefore(el,dragged.nextSibling);}}));
}
function setupMatch(root,q,done){
  let current=null, map={};
  const left=root.querySelectorAll('.match-left'), right=root.querySelectorAll('.match-right');
  left.forEach(b=>b.onclick=()=>{current=b.dataset.left; left.forEach(x=>x.classList.remove('selected')); b.classList.add('selected')});
  right.forEach(b=>b.onclick=()=>{if(current){map[current]=b.dataset.right;b.classList.add('selected'); current=null;}});
  root.querySelector('#checkMatch').onclick=()=>done(q.pairs.every(p=>map[p.left]===p.right));
}
function setupDrag(root,q,done){
  let dragged=null; const drags=root.querySelectorAll('.drag'), drops=root.querySelectorAll('.drop');
  drags.forEach(d=>d.addEventListener('dragstart',()=>dragged=d));
  drops.forEach(drop=>{
    drop.addEventListener('dragover',e=>e.preventDefault());
    drop.addEventListener('drop',e=>{e.preventDefault(); if(dragged){drop.dataset.placed=dragged.dataset.v; drop.innerHTML=drop.innerHTML.split('<span class="placed">')[0] + `<span class="placed">✓ ${dragged.dataset.v}</span>`; dragged.classList.add('used');}});
  });
  root.querySelector('#checkDrag').onclick=()=>q.pairs?q.pairs.every(p=>[...root.querySelectorAll('.drop')].some(d=>d.dataset.target===p.target&&d.dataset.placed===p.drag)):q.targets.every(t=>[...root.querySelectorAll('.drop')].some(d=>d.dataset.target===t.label&&d.dataset.placed===t.label));
}

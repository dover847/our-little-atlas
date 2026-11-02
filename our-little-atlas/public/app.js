const $=s=>document.querySelector(s);let state=null,activeId=null,rotation=0,spinning=false,editing=false,wheelIds=[];
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const who=()=>$('#who').value;
const toast=s=>{const t=$('#toast');t.textContent=s;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2700)};
async function api(route,data){const r=await fetch('/api/'+route,{method:data?'POST':'GET',headers:{'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});const j=await r.json();if(!r.ok)throw Error(j.error||'Something went wrong');return j}
async function refresh(){try{const latest=await api('state');const previous=state?.revision;state=latest;if(previous!==state.revision){updateCategories();renderWheel();renderActivities();renderEntries();renderIdeas();renderWeather();renderUnderstanding();if(activeId!==null&&!editing)fillNotes(activeId)}}catch(e){if(e.message.includes('unlock')){ $('#app').hidden=true;$('#login').hidden=false }}}
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();try{await api('login',{password:$('#password').value});$('#login').hidden=true;$('#app').hidden=false;await refresh()}catch(e){$('#loginError').textContent=e.message}});
const tabs=document.querySelectorAll('.tabs button');tabs.forEach(b=>b.onclick=()=>{tabs.forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.panel').forEach(x=>x.classList.toggle('active',x.id===b.dataset.tab))});
function updateCategories(){if(!state)return;for(const selector of ['#wheelCategory','#filter','#topicCategory']){const el=$(selector),old=el.value;const first=selector==='#topicCategory'?['Our inventions']:(selector==='#filter'?['all','favorites']:['all']);const cats=[...new Set(state.activities.map(a=>a.category))];const options=selector==='#topicCategory'?[...new Set([...first,...cats])]:[...first,...cats];el.innerHTML='';for(const value of options){const label=value==='all'?(selector==='#filter'?'All chapters':'Anything goes'):value==='favorites'?'Our favorites ♡':value;el.add(new Option(label,value))}el.value=options.includes(old)?old:options[0]}}
function wheelChoices(){return state?.activities.filter(a=>$('#wheelCategory').value==='all'||a.category===$('#wheelCategory').value)||[]}
function paintWheel(choices){
 const disc=$('#wheelDisc');if(!choices.length)return;
 wheelIds=choices.map(a=>a.id);
 const n=choices.length,colors=['#d9bd8d','#6c8784','#233c45','#b1a185','#47616b','#bd9b75'];
 disc.style.background='conic-gradient(from 0deg,'+choices.map((a,i)=>colors[i%colors.length]+' '+(i*360/n)+'deg '+((i+1)*360/n)+'deg').join(',')+')';
 disc.querySelectorAll('.wheel-label').forEach(el=>el.remove());
 const shown=n<=24?choices:choices.filter((_,i)=>i%Math.ceil(n/24)===0);
 for(const a of shown){const i=choices.indexOf(a),angle=(i+.5)*360/n,el=document.createElement('span');el.className='wheel-label';el.textContent=n>24?String(i+1):a.title;el.title=a.title;el.style.transform='translate(-50%,-50%) rotate('+angle+'deg) translateY(calc(var(--wheel-size) * -0.32)) rotate('+(-angle)+'deg)';disc.append(el)}
 disc.setAttribute('aria-label',n+' possible activities');
}
function renderWheel(){if(!state)return;const choices=wheelChoices();if(!spinning&&wheelIds.join(',')!==choices.map(a=>a.id).join(','))paintWheel(choices);const a=state.activities.find(a=>a.id===state.selected);if(a&&!spinning){$('#result').innerHTML=`<span class="eyebrow">Our latest adventure · ${escapeHTML(a.category)}</span><h3>${escapeHTML(a.title)}</h3><p>${escapeHTML(a.description)}</p><button id="openResult">Open our notes ↗</button>`;$('#openResult').onclick=()=>openNotes(a.id)}}
$('#wheelCategory').addEventListener('change',()=>{if(!spinning)paintWheel(wheelChoices())});
$('#spin').onclick=async()=>{
 if(spinning||!state)return;
 const choices=wheelChoices(),ids=choices.map(a=>a.id);if(!ids.length)return;
 spinning=true;$('#spin').disabled=true;
 const button=$('#spin'),messages=['Consulting the stars…','Following the possibilities…','Almost decided…','One more little turn…'];
 try{
  paintWheel(choices);
  const outcome=await api('spin',{who:who(),ids});
  const index=ids.indexOf(outcome.selected);if(index<0)throw Error('The selected activity is missing');
  const slice=360/ids.length,target=(360-(index+.5)*slice)%360;
  const current=((rotation%360)+360)%360;
  const offset=(target-current+360)%360;
  rotation+=2160+offset;
  $('#wheelDisc').style.transform=`rotate(${rotation}deg)`;
  $('#result').innerHTML='<span class="eyebrow">The wheel is turning…</span><h3>Something wonderful is on its way ✦</h3>';
  for(let i=0;i<4;i++){button.textContent=messages[i];await new Promise(resolve=>setTimeout(resolve,2050))}
  spinning=false;button.disabled=false;button.textContent='Tempt fate again ✦';await refresh();renderWheel();
  const picked=state?.activities.find(a=>a.id===outcome.selected);if(picked)toast('The wheel chose: '+picked.title);
 }catch(e){spinning=false;button.disabled=false;button.textContent='Spin the wheel ✦';toast(e.message)}
};
function renderActivities(){if(!state)return;const f=$('#filter');const query=$('#search').value.toLowerCase(),filter=f.value;const list=state.activities.filter(a=>(filter==='all'||filter==='favorites'&&state.favorites.includes(a.id)||filter===a.category)&&(a.title+' '+a.description).toLowerCase().includes(query));$('#activities').innerHTML=list.map(a=>`<article class="activity"><span class="eyebrow">${escapeHTML(a.category)} · ${String(a.id).padStart(2,'0')}</span><h3>${escapeHTML(a.title)}</h3><p>${escapeHTML(a.description)}</p><div class="actions"><button data-open="${a.id}">Open our notes ↗</button><button data-fav="${a.id}" class="${state.favorites.includes(a.id)?'loved':''}" aria-label="Toggle favorite">${state.favorites.includes(a.id)?'♥':'♡'}</button></div></article>`).join('')||'<p>No matching adventures yet.</p>'}
$('#search').oninput=renderActivities;$('#filter').onchange=renderActivities;
$('#activities').onclick=async e=>{const o=e.target.closest('[data-open]'),f=e.target.closest('[data-fav]');if(o)openNotes(Number(o.dataset.open));if(f){try{await api('favorite',{id:Number(f.dataset.fav)});await refresh()}catch(err){toast(err.message)}}};
function fillNotes(id){const n=state.notes[id]||{};$('#noteDanny').value=n.Danny||'';$('#noteMia').value=n.Mia||''}
function openNotes(id){activeId=id;const a=state.activities.find(x=>x.id===id);$('#dialogCategory').textContent=a.category+' · '+String(id).padStart(2,'0');$('#dialogTitle').textContent=a.title;$('#dialogDesc').textContent=a.description;fillNotes(id);$('#noteDialog').showModal()}
$('#noteDialog').addEventListener('close',()=>{activeId=null;editing=false});['#noteDanny','#noteMia'].forEach(id=>$(id).addEventListener('input',()=>editing=true));
for(const person of ['Danny','Mia'])$('#save'+person).onclick=async()=>{try{await api('note',{id:activeId,who:person,text:$('#note'+person).value});editing=false;await refresh();toast(person+"'s note saved") }catch(e){toast(e.message)}};
function renderEntries(){if(!state)return;const filter=$('#journalFilter').value;$('#entries').innerHTML=(state.journal||[]).filter(x=>filter==='all'||(x.type||'Memory')===filter).map(x=>`<article class="entry"><small>${escapeHTML(x.who)} · ${escapeHTML(x.type||'Memory')} · ${new Date(x.at).toLocaleDateString()}${x.mood?' · '+escapeHTML(x.mood):''}</small>${x.title?'<h3>'+escapeHTML(x.title)+'</h3>':''}<p>${escapeHTML(x.text)}</p></article>`).join('')||'<p class="muted">Nothing written here yet. The first page is yours.</p>'}
$('#journalFilter').onchange=renderEntries;
const weatherEmojis=['😊','🥰','😍','😘','😌','😇','🤗','🫶','❤️','💕','💖','✨','🌸','🌞','🌈','🥹','🥲','😢','😭','😔','😞','😩','😫','🥺','😳','😅','😂','🤣','😆','😏','😎','🤔','🧐','😶','😐','🙃','😬','😑','😴','🥱','😵‍💫','😤','😠','😡','🤯','😱','😨','😰','😓','🤒','🤧','🤢','😷','🤪','😜','😋','😝','🤭','🫣','🫠','💤','💔','💗','💭','☁️','🌧️','⛈️','🌙','🍀','🌻','🐱','🐰','🐼','🙈','🙉','🙊','👍','👏','🙏','💪','👀','👋','🤝','💐','🎉','😚','☺️','😙','😗','🤩','😒','🙄','😮‍💨','😪','😮','😯','😲','🤐','🤫','🫢','🤥','🤨','😕','🙁','☹️','😣','😖','😟','😦','😧','😮‍💨','🫨','😈','👻','💀','🤡','👽','🧡','💛','💚','💙','💜','🤍','🩷','🩵','🩶','🖤','💞','💓','💘','💝','💟','💌','🫂','🌹','🌷','🌺','🌼','🌿','🌱','⭐','🌟','☀️','🌤️','🌦️','🌫️','❄️','🌊','🔥','🍵','☕','🍓','🍑','🍬','🎀','🧸','🎁','🎵','🎶','🕊️','🐣','🐻','🐶','🐸','🐧','🐯','🦋','💃','🧘','🙋','🙇','🙅','🙆','🤦','🤷','👌','✌️','🤞','🤟','🤙','🫰','🤲','✊','👊','🤜','🤛','💅','🫵','💯','❣️','‼️','❓','❗'];
const chineseWeatherExpressions=[
 ['🤦','捂脸','facepalm embarrassed helpless'],['🤭','偷笑','secret laugh snicker'],['🤣','笑哭','laugh crying'],['🥹','破涕为笑','tears to smile moved'],['😏','坏笑','mischievous smile'],['🙄','白眼','eye roll'],['😒','鄙视','disdain'],['😌','悠闲','relaxed peaceful'],['🥰','喜欢','affection fondness'],['😘','飞吻','blowing kiss'],['🫶','比心','finger heart love'],['🫰','比心','finger heart'],['🥺','委屈','aggrieved pout'],['😭','大哭','crying'],['😢','流泪','tears'],['😔','难过','sad'],['😮‍💨','叹气','sigh'],['😤','生气','annoyed'],['😡','发怒','angry'],['😳','害羞','shy blushing'],['🤗','抱抱','hug'],['🫂','拥抱','embrace'],['🥱','困','sleepy'],['😴','睡觉','sleeping'],['🤔','疑问','question thinking'],['😶','无语','speechless'],['😅','尴尬','awkward'],['🫠','融化','melting overwhelmed'],['🤪','调皮','playful'],['😜','吐舌','tongue teasing'],['🤫','嘘','shush'],['🫣','偷偷看','peeking'],['👀','吃瓜','watching drama gossip'],['🍉','吃瓜','watching gossip'],['💪','加油','cheering encouragement'],['🙏','拜托','please request'],['👍','赞','approval'],['👏','鼓掌','applause'],['🎉','庆祝','celebrating'],['💐','送花','flowers'],['❤️','爱你','love you'],['💗','心动','heart flutter'],['💌','想你','missing you'],['🐱','撒娇','cute coquettish'],['🥰','甜蜜','sweet affectionate'],['🌙','晚安','good night'],['☀️','早安','good morning'],['☁️','低气压','low mood'],['🌧️','心情不好','bad mood rainy'],['🌈','雨过天晴','hope after rain'],['😮','惊讶','surprised'],['😱','震惊','shocked'],['🫡','收到','understood acknowledged'],['🙇','谢谢','thank you'],['🥲','苦笑','bitter smile'],['🤨','怀疑','skeptical'],['😵‍💫','晕','dizzy'],['🫢','惊讶','gasp'],['💤','摆烂','giving up tired'],['🧸','求安慰','need comfort'],['🥺','求抱抱','want a hug'],['🤍','安心','reassured']
];
function updateWeatherEmojiSelection(){const selected=$('#weatherEmoji').value.trim();document.querySelectorAll('#weatherEmojiPalette button').forEach(b=>{const active=b.dataset.emoji===selected;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active))});const match=chineseWeatherExpressions.find(x=>x[0]===selected);$('#weatherEmojiPreviewIcon').textContent=selected||'✨';$('#weatherEmojiPreviewLabel').textContent=selected?(match?match[1]+' · '+match[2]:'Your selected expression'):'Choose a feeling to preview it here';$('#weatherEmojiClear').disabled=!selected}
function renderWeatherEmojiPalette(){
 const q=$('#weatherEmojiSearch').value.trim().toLocaleLowerCase();
 const items=[...weatherEmojis.map(e=>({emoji:e,label:'',search:e,group:'Everyday emojis'})),...chineseWeatherExpressions.map(([emoji,label,english])=>({emoji,label,search:emoji+' '+label+' '+english,group:'中文表情 · Chinese expressions'}))].filter(x=>!q||x.search.toLocaleLowerCase().includes(q));
 const palette=$('#weatherEmojiPalette');palette.replaceChildren();
 for(const group of ['中文表情 · Chinese expressions','Everyday emojis']){
  const matches=items.filter(x=>x.group===group);if(!matches.length)continue;
  const heading=document.createElement('div');heading.className='emoji-group-heading';heading.textContent=group;palette.append(heading);
  for(const item of matches){const button=document.createElement('button');button.type='button';button.dataset.emoji=item.emoji;button.title=item.label||item.emoji;button.setAttribute('aria-label',item.label||item.emoji);button.setAttribute('aria-pressed','false');const emoji=document.createElement('span');emoji.textContent=item.emoji;button.append(emoji);if(item.label){const label=document.createElement('small');label.textContent=item.label;button.append(label)}palette.append(button)}
 }
 if(!items.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='No matching expression. You can type your own below.';palette.append(empty)}
 updateWeatherEmojiSelection();
}
$('#weatherEmojiSearch').addEventListener('input',renderWeatherEmojiPalette);
$('#weatherEmojiPalette').addEventListener('click',e=>{const b=e.target.closest('button[data-emoji]');if(!b)return;$('#weatherEmoji').value=b.dataset.emoji;updateWeatherEmojiSelection()});
$('#weatherEmoji').addEventListener('input',updateWeatherEmojiSelection);
$('#weatherEmojiClear').addEventListener('click',()=>{$('#weatherEmoji').value='';updateWeatherEmojiSelection()});
renderWeatherEmojiPalette();
function renderWeather(){if(!state)return;const now=Date.now();$('#weatherCards').innerHTML=['Danny','Mia'].map(person=>{const w=state.weather?.[person],active=w&&(!w.expiresAt||Date.parse(w.expiresAt)>now);return `<article class="weather-card"><div class="weather-swatch" style="background:${active&&/^#[0-9a-fA-F]{6}$/.test(w.color)?w.color:'#52656a'}"></div><h3>${person}'s weather</h3>${active&&w.emoji?'<div class="weather-emoji" aria-label="Mood emoji">'+escapeHTML(w.emoji)+'</div>':''}<p>${active?escapeHTML(w.label||'A color without a label'):'Not currently shared'}</p>${active&&w.note?'<p class="weather-note">'+escapeHTML(w.note)+'</p>':''}</article>`}).join('')}
$('#weatherForm').onsubmit=async e=>{e.preventDefault();try{await api('weather',{who:who(),color:$('#weatherColor').value,emoji:$('#weatherEmoji').value.trim(),label:$('#weatherLabel').value,note:$('#weatherNote').value,duration:$('#weatherDuration').value});await refresh();toast('Your weather has been shared')}catch(err){toast(err.message)}};

function renderUnderstanding(){
 if(!state)return;
 const esc=escapeHTML;
 $('#mirrorEntries').innerHTML=(state.mirrors||[]).map(x=>{
  const ready=Boolean(x.interpretation&&x.intention),author=who()===x.who,kind=author?'intention':'interpretation';
  const answer=!x[kind]?`<form class="inline-reply" data-mirror="${esc(x.id)}" data-kind="${kind}"><label>${author?'What I intended':'What I understood'}</label><textarea name="answer" maxlength="2000" required></textarea><button class="small">Share perspective</button></form>`:'';
  const reveal=ready?`<div class="perspectives"><p><strong>Interpretation:</strong> ${esc(x.interpretation.text)}</p><p><strong>Intention:</strong> ${esc(x.intention.text)}</p></div>${x.reflection?'<p><strong>Shared insight:</strong> '+esc(x.reflection.text)+'</p>':`<form class="inline-reply" data-mirror="${esc(x.id)}" data-kind="reflection"><label>Optional insight</label><textarea name="answer" maxlength="2000" required></textarea><button class="small">Save insight</button></form>`}`:'<p class="muted">Both perspectives will appear once they are shared.</p>';
  return `<article class="entry"><small>${esc(x.who)} · ${new Date(x.at).toLocaleDateString()}</small><p>${esc(x.expression)}</p>${answer}${reveal}</article>`;
 }).join('')||'<p class="muted">No mirrors yet.</p>';
 $('#clarityEntries').innerHTML=(state.clarity||[]).map(x=>`<article class="entry"><small>${esc(x.who)}</small><p>${esc(x.message)}</p>${(x.replies||[]).map(r=>`<p class="bridge-reply"><strong>${esc(r.who)}:</strong> ${esc(r.message)}</p>`).join('')}<form class="inline-reply" data-clarity="${esc(x.id)}"><label>Reply when ready</label><textarea name="message" maxlength="2000" required></textarea><button class="small">Reply</button></form></article>`).join('')||'<p class="muted">No bridges yet.</p>';
 $('#assumptionEntries').innerHTML=(state.assumptions||[]).map(x=>`<article class="entry"><small>${esc(x.who)} · ${Number(x.intensity)} / 10</small><p><strong>Observed:</strong> ${esc(x.observation)}</p><p><strong>Interpreted:</strong> ${esc(x.interpretation)}</p>${x.alternatives?'<p><strong>Alternatives:</strong> '+esc(x.alternatives)+'</p>':''}${x.unknowns?'<p><strong>Unknowns:</strong> '+esc(x.unknowns)+'</p>':''}${x.question?'<p><strong>Question:</strong> '+esc(x.question)+'</p>':''}</article>`).join('')||'<p class="muted">No reflections yet.</p>';
}
$('#who').onchange=renderUnderstanding;
$('#assumptionIntensity').oninput=()=>{$('#intensityValue').textContent=$('#assumptionIntensity').value};
$('#mirrorForm').onsubmit=async e=>{e.preventDefault();try{await api('mirror',{who:who(),expression:$('#mirrorExpression').value});$('#mirrorExpression').value='';await refresh();toast('Mirror opened')}catch(err){toast(err.message)}};
$('#clarityForm').onsubmit=async e=>{e.preventDefault();try{await api('clarity',{who:who(),message:$('#clarityMessage').value});$('#clarityMessage').value='';await refresh();toast('Bridge shared')}catch(err){toast(err.message)}};
$('#assumptionForm').onsubmit=async e=>{e.preventDefault();try{await api('assumption',{who:who(),observation:$('#assumptionObservation').value,interpretation:$('#assumptionInterpretation').value,alternatives:$('#assumptionAlternatives').value,unknowns:$('#assumptionUnknowns').value,question:$('#assumptionQuestion').value,intensity:Number($('#assumptionIntensity').value)});e.target.reset();$('#intensityValue').textContent='5';await refresh();toast('Reflection saved')}catch(err){toast(err.message)}};
$('#mirrorEntries').onsubmit=async e=>{const f=e.target.closest('[data-mirror]');if(!f)return;e.preventDefault();try{await api('mirror-answer',{who:who(),id:f.dataset.mirror,kind:f.dataset.kind,answer:f.elements.answer.value});await refresh();toast('Perspective saved')}catch(err){toast(err.message)}};
$('#clarityEntries').onsubmit=async e=>{const f=e.target.closest('[data-clarity]');if(!f)return;e.preventDefault();try{await api('clarity-reply',{who:who(),id:f.dataset.clarity,message:f.elements.message.value});await refresh();toast('Reply saved')}catch(err){toast(err.message)}};
function renderIdeas(){if(!state)return;$('#ideaEntries').innerHTML=state.ideas.map(x=>`<article class="entry"><small>${escapeHTML(x.who)} · ${new Date(x.at).toLocaleDateString()}</small><h3>${escapeHTML(x.title)}</h3><p>${escapeHTML(x.text)}</p></article>`).join('')||'<p class="muted">Your next wonderful idea belongs here.</p>'}
$('#journalForm').onsubmit=async e=>{e.preventDefault();try{await api('journal',{who:who(),text:$('#journalText').value,type:$('#journalType').value,title:$('#journalTitle').value,mood:$('#journalMood').value});$('#journalText').value='';$('#journalTitle').value='';$('#journalMood').value='';await refresh();toast('Your page was saved')}catch(err){toast(err.message)}};
$('#topicForm').onsubmit=async e=>{e.preventDefault();try{await api('topic',{who:who(),title:$('#topicTitle').value,category:$('#topicCategory').value,description:$('#topicDescription').value});$('#topicTitle').value='';$('#topicDescription').value='';await refresh();toast('Your new adventure is on the wheel!')}catch(err){toast(err.message)}};
$('#ideaForm').onsubmit=async e=>{e.preventDefault();try{await api('idea',{who:who(),title:$('#ideaTitle').value,text:$('#ideaText').value});$('#ideaTitle').value='';$('#ideaText').value='';await refresh();toast('Your idea is in the atlas')}catch(err){toast(err.message)}};
refresh();setInterval(()=>{if(!document.hidden&&!spinning){refresh();renderWeather()}},4000);

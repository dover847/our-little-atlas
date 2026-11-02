// Our Little Atlas — no third-party dependencies. Node 20+.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const PORT=process.env.PORT||3000, PASSWORD=process.env.ATLAS_PASSWORD, SECRET=process.env.ATLAS_SECRET||PASSWORD;
if(!PASSWORD||PASSWORD.length<12){console.error('Set ATLAS_PASSWORD to a private password of at least 12 characters.');process.exit(1)}
const activities=require('./activities.json'), DATA=process.env.DATA_FILE||path.join(__dirname,'atlas-data.json');
let state={revision:0,selected:null,spins:[],notes:{},favorites:[],ideas:[],journal:[],customActivities:[],weather:{},capsules:[],mirrors:[],clarity:[],assumptions:[]};
try{state={...state,...JSON.parse(fs.readFileSync(DATA,'utf8'))}}catch{}
const visibleCapsules=()=>Array.isArray(state.capsules)?state.capsules.map(x=>{const opened=Date.now()>=Date.parse(x.openAt);return opened?x:{id:x.id,who:x.who,recipient:x.recipient,mode:x.mode,openAt:x.openAt,at:x.at,sealed:true}}):[];
const allActivities=()=>[...activities,...(Array.isArray(state.customActivities)?state.customActivities:[])];
const save=()=>{const temp=DATA+'.tmp';fs.writeFileSync(temp,JSON.stringify(state,null,2));fs.renameSync(temp,DATA)};
const hash=x=>crypto.createHmac('sha256',SECRET).update(x).digest('hex');
const good=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&crypto.timingSafeEqual(x,y)};
const cookie=req=>(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('atlas='))?.slice(6);
const authorized=req=>good(cookie(req),hash('atlas-access'));
const send=(res,status,obj)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj))};
const body=req=>new Promise((resolve,reject)=>{let s='';req.on('data',b=>{s+=b;if(s.length>300000){reject(Error('Request too large'));req.destroy()}});req.on('end',()=>{try{resolve(JSON.parse(s||'{}'))}catch{reject(Error('Invalid JSON'))}})});
const clean=(s,n=3000)=>String(s??'').slice(0,n);
const validPhoto=value=>{
 if(!value)return '';
 if(typeof value!=='string'||value.length>190000)return null;
 const m=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
 if(!m)return null;
 const bytes=Buffer.from(m[2],'base64');
 if(bytes.length>135000||bytes.length<12||bytes.toString('base64')!==m[2])return null;
 const type=m[1];
 const valid=type==='jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:type==='png'?bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')):bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
 return valid?value:null;
};
const mutate=fn=>{fn();state.revision++;save()};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{
 try{
 const u=new URL(req.url,'http://localhost');
 if(req.method==='POST'&&u.pathname==='/api/login'){const b=await body(req);if(!good(b.password,PASSWORD))return send(res,401,{error:'Incorrect password'});res.setHeader('Set-Cookie',`atlas=${hash('atlas-access')}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${process.env.NODE_ENV==='production'?'; Secure':''}`);return send(res,200,{ok:true})}
 if(u.pathname.startsWith('/api/')){
 if(!authorized(req))return send(res,401,{error:'Please unlock the atlas'});
 if(req.method==='GET'&&u.pathname==='/api/state')return send(res,200,{...state,capsules:visibleCapsules(),activities:allActivities()});
 if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
 const b=await body(req),who=['Danny','Mia'].includes(b.who)?b.who:'Danny';
 if(u.pathname==='/api/spin'){const ids=Array.isArray(b.ids)?b.ids.map(Number).filter(x=>allActivities().some(a=>a.id===x)):allActivities().map(a=>a.id);if(!ids.length)return send(res,400,{error:'No activities selected'});const id=ids[crypto.randomInt(ids.length)];mutate(()=>{state.selected=id;state.spins.unshift({id,who,at:new Date().toISOString()});state.spins=state.spins.slice(0,100)});return send(res,200,{selected:id,revision:state.revision})}
 if(u.pathname==='/api/note'){const id=Number(b.id);if(!allActivities().some(a=>a.id===id))return send(res,400,{error:'Invalid activity'});mutate(()=>{state.notes[id]??={};state.notes[id][who]=clean(b.text,10000)});return send(res,200,{ok:true})}
 if(u.pathname==='/api/favorite'){const id=Number(b.id);if(!allActivities().some(a=>a.id===id))return send(res,400,{error:'Invalid activity'});mutate(()=>{state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id]});return send(res,200,{ok:true})}
 if(u.pathname==='/api/topic'){
  const title=clean(b.title,100).trim(),description=clean(b.description,1500).trim(),category=clean(b.category,60).trim()||'Our inventions';
  if(!title||!description)return send(res,400,{error:'Please add a title and description'});
  if((state.customActivities||[]).length>=500)return send(res,400,{error:'Custom topic limit reached'});
  let topic;
  mutate(()=>{state.customActivities??=[];const id=Math.max(999,...state.customActivities.map(a=>a.id))+1;topic={id,title,description,category,createdBy:who,createdAt:new Date().toISOString()};state.customActivities.push(topic)});
  return send(res,200,{ok:true,topic});
 }
 if(u.pathname==='/api/idea'){if(!clean(b.title,100).trim())return send(res,400,{error:'Give your idea a title'});mutate(()=>state.ideas.unshift({id:crypto.randomUUID(),who,title:clean(b.title,100),text:clean(b.text,3000),at:new Date().toISOString()}));return send(res,200,{ok:true})}
 if(u.pathname==='/api/journal'){
  if(!clean(b.text,5000).trim())return send(res,400,{error:'Write something first'});
  const types=['Memory','Letter','Reflection','Poem','Question','Gratitude','Interpretation'];
  const type=types.includes(b.type)?b.type:'Memory';
  mutate(()=>state.journal.unshift({id:crypto.randomUUID(),who,type,title:clean(b.title,120).trim(),mood:clean(b.mood,60).trim(),text:clean(b.text,5000),at:new Date().toISOString(),activity:Number(b.activity)||null}));
  return send(res,200,{ok:true});
 }
 if(u.pathname==='/api/assumption'){
  const observation=clean(b.observation,1200).trim(),interpretation=clean(b.interpretation,1200).trim();
  if(!observation||!interpretation)return send(res,400,{error:'Add an observation and interpretation'});
  const intensity=Number(b.intensity);
  if(!Number.isInteger(intensity)||intensity<1||intensity>10)return send(res,400,{error:'Intensity must be between 1 and 10'});
  mutate(()=>{state.assumptions??=[];state.assumptions.unshift({id:crypto.randomUUID(),who,observation,interpretation,alternatives:clean(b.alternatives,1200),unknowns:clean(b.unknowns,1200),question:clean(b.question,1200),intensity,at:new Date().toISOString()})});
  return send(res,200,{ok:true});
 }
 if(u.pathname==='/api/clarity'){
  const message=clean(b.message,2000).trim();
  if(!message)return send(res,400,{error:'Write a gentle clarification first'});
  mutate(()=>{state.clarity??=[];state.clarity.unshift({id:crypto.randomUUID(),who,message,at:new Date().toISOString(),replies:[]})});
  return send(res,200,{ok:true});
 }
 if(u.pathname==='/api/clarity-reply'){
  const item=(state.clarity||[]).find(x=>x.id===b.id),message=clean(b.message,2000).trim();
  if(!item||!message)return send(res,400,{error:'Choose a message and write a reply'});
  mutate(()=>{item.replies??=[];item.replies.push({id:crypto.randomUUID(),who,message,at:new Date().toISOString()})});
  return send(res,200,{ok:true});
 }
 if(u.pathname==='/api/mirror'){
  const expression=clean(b.expression,2000).trim();
  if(!expression)return send(res,400,{error:'Share an expression first'});
  mutate(()=>{state.mirrors??=[];state.mirrors.unshift({id:crypto.randomUUID(),who,expression,at:new Date().toISOString(),interpretation:null,intention:null,reflection:null})});
  return send(res,200,{ok:true});
 }
 if(u.pathname==='/api/mirror-answer'){
  const item=(state.mirrors||[]).find(x=>x.id===b.id),answer=clean(b.answer,2000).trim();
  if(!item||!answer)return send(res,400,{error:'Select an expression and write an answer'});
  const kind=clean(b.kind,30);
  if(kind==='interpretation'&&who===item.who)return send(res,400,{error:'The other person offers the interpretation'});
  if(kind==='intention'&&who!==item.who)return send(res,400,{error:'The author offers the intention'});
  if(kind==='reflection'&&(!item.interpretation||!item.intention))return send(res,400,{error:'Wait for both perspectives first'});
  if(!['interpretation','intention','reflection'].includes(kind))return send(res,400,{error:'Invalid answer type'});
  if(item[kind])return send(res,409,{error:'This perspective has already been shared'});
  mutate(()=>{item[kind]={who,text:answer,at:new Date().toISOString()}});
  return send(res,200,{ok:true});
 }
 if(u.pathname==='/api/capsule'){
  const title=clean(b.title,120).trim(),message=clean(b.message,4000).trim(),photo=validPhoto(b.photo);
  const mode=b.mode==='surprise'?'surprise':'together';
  const recipient=mode==='surprise'?(who==='Danny'?'Mia':'Danny'):'Both';
  const openTime=Date.parse(b.openAt);
  if(!title||!message)return send(res,400,{error:'Add a title and a message'});
  if(photo===null)return send(res,400,{error:'Photo must be a small valid JPEG, PNG or WebP image'});
  if(!Number.isFinite(openTime)||openTime<=Date.now()+60000||openTime>Date.now()+20*365.25*86400000)return send(res,400,{error:'Choose an opening date in the future (up to 20 years)'});
  if((state.capsules||[]).length>=200)return send(res,400,{error:'Time capsule limit reached'});
  mutate(()=>{state.capsules??=[];state.capsules.unshift({id:crypto.randomUUID(),who,recipient,mode,title,message,photo,openAt:new Date(openTime).toISOString(),at:new Date().toISOString()})});
  return send(res,200,{ok:true});
 }
 if(u.pathname==='/api/weather'){
  const color=clean(b.color,7);
  if(!/^#[0-9a-fA-F]{6}$/.test(color))return send(res,400,{error:'Choose a valid color'});
  const duration=['2','8','24','until'].includes(String(b.duration))?String(b.duration):'until';
  const at=new Date().toISOString();
  const expiresAt=duration==='until'?null:new Date(Date.now()+Number(duration)*3600000).toISOString();
  mutate(()=>{state.weather??={};state.weather[who]={color,emoji:clean(b.emoji,16).trim(),label:clean(b.label,60).trim(),note:clean(b.note,500).trim(),at,expiresAt}});
  return send(res,200,{ok:true});
 }
 return send(res,404,{error:'Not found'});
 }
 const p=u.pathname==='/'?'/index.html':u.pathname;
 if(!['/index.html','/style.css','/app.js'].includes(p)){res.writeHead(404);return res.end('Not found')}
 const file=path.join(__dirname,'public',p);res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"});fs.createReadStream(file).pipe(res);
 }catch(e){console.error(e);if(!res.headersSent)send(res,500,{error:'Something went wrong'})}
}).listen(PORT,()=>console.log(`Our Little Atlas running on port ${PORT}`));

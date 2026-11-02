// Our Little Atlas — no third-party dependencies. Node 20+.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const PORT=process.env.PORT||3000, PASSWORD=process.env.ATLAS_PASSWORD, SECRET=process.env.ATLAS_SECRET||PASSWORD;
if(!PASSWORD||PASSWORD.length<12){console.error('Set ATLAS_PASSWORD to a private password of at least 12 characters.');process.exit(1)}
const activities=require('./activities.json'), DATA=process.env.DATA_FILE||path.join(__dirname,'atlas-data.json');
let state={revision:0,selected:null,spins:[],notes:{},favorites:[],ideas:[],journal:[],customActivities:[]};
try{state={...state,...JSON.parse(fs.readFileSync(DATA,'utf8'))}}catch{}
const allActivities=()=>[...activities,...(Array.isArray(state.customActivities)?state.customActivities:[])];
const save=()=>{const temp=DATA+'.tmp';fs.writeFileSync(temp,JSON.stringify(state,null,2));fs.renameSync(temp,DATA)};
const hash=x=>crypto.createHmac('sha256',SECRET).update(x).digest('hex');
const good=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&crypto.timingSafeEqual(x,y)};
const cookie=req=>(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('atlas='))?.slice(6);
const authorized=req=>good(cookie(req),hash('atlas-access'));
const send=(res,status,obj)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj))};
const body=req=>new Promise((resolve,reject)=>{let s='';req.on('data',b=>{s+=b;if(s.length>300000){reject(Error('Request too large'));req.destroy()}});req.on('end',()=>{try{resolve(JSON.parse(s||'{}'))}catch{reject(Error('Invalid JSON'))}})});
const clean=(s,n=3000)=>String(s??'').slice(0,n);
const mutate=fn=>{fn();state.revision++;save()};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{
 try{
 const u=new URL(req.url,'http://localhost');
 if(req.method==='POST'&&u.pathname==='/api/login'){const b=await body(req);if(!good(b.password,PASSWORD))return send(res,401,{error:'Incorrect password'});res.setHeader('Set-Cookie',`atlas=${hash('atlas-access')}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${process.env.NODE_ENV==='production'?'; Secure':''}`);return send(res,200,{ok:true})}
 if(u.pathname.startsWith('/api/')){
 if(!authorized(req))return send(res,401,{error:'Please unlock the atlas'});
 if(req.method==='GET'&&u.pathname==='/api/state')return send(res,200,{...state,activities:allActivities()});
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
 if(u.pathname==='/api/journal'){if(!clean(b.text).trim())return send(res,400,{error:'Write something first'});mutate(()=>state.journal.unshift({id:crypto.randomUUID(),who,text:clean(b.text,5000),at:new Date().toISOString(),activity:Number(b.activity)||null}));return send(res,200,{ok:true})}
 return send(res,404,{error:'Not found'});
 }
 const p=u.pathname==='/'?'/index.html':u.pathname;
 if(!['/index.html','/style.css','/app.js'].includes(p)){res.writeHead(404);return res.end('Not found')}
 const file=path.join(__dirname,'public',p);res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"});fs.createReadStream(file).pipe(res);
 }catch(e){console.error(e);if(!res.headersSent)send(res,500,{error:'Something went wrong'})}
}).listen(PORT,()=>console.log(`Our Little Atlas running on port ${PORT}`));

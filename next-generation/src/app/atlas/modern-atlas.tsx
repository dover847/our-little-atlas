"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
 ArrowLeft, Bell, BookOpen, Camera, Check, ChevronRight, CloudSun, Compass,
 Feather, Heart, Images, Leaf, Lightbulb, Map, Menu, MessageCircleHeart,
 NotebookPen, Orbit, Palette, PenLine, Plus, Search, Settings2, Sparkles,
 WandSparkles, X
} from "lucide-react";
import { SharedThemeSync } from "@/components/shared-theme-sync";
type Activity={id:number;title:string;category:string;description:string};
type AtlasEntry={id:string;who:string;at:string;[key:string]:any};
type AtlasState={
 activities:Activity[];viewer:"Danny"|"Mia";revision:number;
 selected:number|null;favorites:number[];notes:Record<string,Record<string,string>>;
 journal:AtlasEntry[];weather:Record<string,any>;capsules:AtlasEntry[];
 ideas:AtlasEntry[];mirrors:AtlasEntry[];clarity:AtlasEntry[];assumptions:AtlasEntry[];
 spins:{id:number;who:string;at:string}[];
};
type NavTab="library"|"journal"|"weather"|"capsules"|"memories"|"understanding"|"ideas"|"notes";
const sections:{id:NavTab;name:string;icon:typeof BookOpen;hint:string}[]=[
 {id:"library",name:"Our Atlas",icon:Compass,hint:"Activities & notes"},
 {id:"journal",name:"Our Journal",icon:BookOpen,hint:"Words and replies"},
 {id:"weather",name:"Emotional Weather",icon:CloudSun,hint:"Our present feelings"},
 {id:"capsules",name:"Time Capsules",icon:Camera,hint:"Messages for later"},
 {id:"memories",name:"Memory Gallery",icon:Images,hint:"What time has given us"},
 {id:"understanding",name:"Understanding",icon:Heart,hint:"Clarity & recognition"},
 {id:"ideas",name:"Our Ideas",icon:Lightbulb,hint:"Possibilities to explore"},
 {id:"notes",name:"Shared Writing",icon:Feather,hint:"Our private studio"},
];
function formatDate(value:unknown){
 const date=new Date(String(value||""));
 return Number.isNaN(date.valueOf())?"":date.toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
}
async function capsulePhoto(file:File):Promise<string>{
 if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw Error("Please choose a JPG, PNG or WebP photo.");
 if(file.size>20_000_000)throw Error("This photograph is too large.");
 const image=await createImageBitmap(file);
 const maxSide=600,scale=Math.min(1,maxSide/Math.max(image.width,image.height));
 const canvas=document.createElement("canvas");
 canvas.width=Math.max(1,Math.round(image.width*scale));
 canvas.height=Math.max(1,Math.round(image.height*scale));
 const context=canvas.getContext("2d");
 if(!context){image.close();throw Error("Your browser cannot prepare photographs.");}
 context.drawImage(image,0,0,canvas.width,canvas.height);image.close();
 for(const quality of [.75,.55,.38,.25]){
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
  if(blob&&blob.size<125000){
   return await new Promise<string>((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result));
    reader.onerror=()=>reject(Error("Could not read that photo."));
    reader.readAsDataURL(blob);
   });
  }
 }
 throw Error("Choose a smaller image for the capsule.");
}

export function ModernAtlas({spaceId,initialTab,initialActivity}:{
 spaceId:string;initialTab:string;initialActivity:number|null;
}){
 const [tab,setTab]=useState<NavTab>(initialTab as NavTab);
 const [data,setData]=useState<AtlasState|null>(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [search,setSearch]=useState("");
 const [category,setCategory]=useState("all");
 const [showCount,setShowCount]=useState(24);
 const [chosen,setChosen]=useState<number|null>(initialActivity);
 const [notesDraft,setNotesDraft]=useState("");
 const [understandingTab,setUnderstandingTab]=useState<"mirror"|"clarity"|"assumptions">("mirror");
 const [answerDrafts,setAnswerDrafts]=useState<Record<string,string>>({});
 const [moodEmoji,setMoodEmoji]=useState("✨");
 const [journalType,setJournalType]=useState("Memory");
 useEffect(()=>{setTab(initialTab as NavTab);},[initialTab]);
 useEffect(()=>{if(initialActivity)setChosen(initialActivity);},[initialActivity]);
 async function refresh(){
  try{
   const response=await fetch("/api/legacy/state",{cache:"no-store",credentials:"same-origin"});
   if(!response.ok)throw Error(response.status===401?"Please sign in again":"Unable to connect to your shared Atlas.");
   const incoming=await response.json() as AtlasState;
   if(!Array.isArray(incoming.activities))throw Error("Your Atlas could not load.");
   setData(incoming);
  }catch(e){setMessage(e instanceof Error?e.message:"Your shared Atlas is temporarily unavailable.");}
  finally{setLoading(false);}
 }
 useEffect(()=>{
  void refresh();
  const interval=window.setInterval(()=>{if(!document.hidden&&!busy)void refresh();},15000);
  const focused=()=>{if(!document.hidden&&!busy)void refresh()};
  window.addEventListener("focus",focused);
  return()=>{window.clearInterval(interval);window.removeEventListener("focus",focused)};
 },[busy]);
 const activities=data?.activities||[];
 const categories=useMemo(()=>[...new Set(activities.map(a=>a.category))].sort(),[activities]);
 const visible=useMemo(()=>activities.filter(a=>
  (category==="all"||a.category===category)&&
  (a.title+" "+a.description+" "+a.category).toLowerCase().includes(search.toLowerCase().trim())
 ),[activities,category,search]);
 const selected=activities.find(a=>a.id===chosen);
 async function perform(action:string,body:Record<string,unknown>,form?:HTMLFormElement){
  if(busy)return false;
  setBusy(true);setMessage("");
  try{
   const response=await fetch("/api/legacy/"+action,{
    method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)
   });
   const result=await response.json() as {error?:string};
   if(!response.ok)throw Error(result.error||"The Atlas couldn't save that change.");
   if(form)form.reset();
   await refresh();
   setMessage("Saved to our shared Atlas ♡");
   return true;
  }catch(e){setMessage(e instanceof Error?e.message:"Could not save your changes.");return false;}
  finally{setBusy(false);}
 }
 async function handleForm(e:FormEvent<HTMLFormElement>,action:string,extra:Record<string,unknown>={}){
  e.preventDefault();
  if(busy)return;
  const form=e.currentTarget;
  const formData=new FormData(form);
  const fields:Record<string,unknown>={...extra};
  for(const [key,value] of formData.entries()){
   if(value instanceof File)continue;
   fields[key]=value;
  }
  if(action==="capsule"){
   const photo=formData.get("photoUpload");
   if(photo instanceof File&&photo.size){
    setBusy(true);
    try{fields.photo=await capsulePhoto(photo);}
    catch(error){setMessage(error instanceof Error?error.message:"Unable to prepare the capsule photograph.");setBusy(false);return;}
    setBusy(false);
   }
  }
  await perform(action,fields,form);
 }
 function openActivity(a:Activity){
  setChosen(a.id);setNotesDraft(data?.notes?.[String(a.id)]?.[data.viewer]||"");
 }
 function closeActivity(){setChosen(null);setNotesDraft("");}
 function reply(entry:AtlasEntry,action:"journal-comment"|"clarity-reply"|"mirror-answer",kind?:string){
  const key=entry.id+(kind||"");
  const value=answerDrafts[key]||"";
  if(!value.trim())return;
  const body=action==="journal-comment"?{id:entry.id,text:value}:
   action==="clarity-reply"?{id:entry.id,message:value}:
   {id:entry.id,kind,answer:value};
  void perform(action,body).then(ok=>{if(ok)setAnswerDrafts(current=>({...current,[key]:""}))});
 }
 function replyBox(entry:AtlasEntry,action:"journal-comment"|"clarity-reply"|"mirror-answer",kind?:string){
  const key=entry.id+(kind||"");
  return <div className="atlas-inline-reply">
    <input aria-label="Write a reply" value={answerDrafts[key]||""}
      maxLength={action==="journal-comment"?1200:2000}
      onChange={e=>setAnswerDrafts(old=>({...old,[key]:e.target.value}))}
      placeholder={action==="mirror-answer"?"Offer your perspective…":"Leave a thoughtful reply…"}/>
    <button disabled={busy||!(answerDrafts[key]||"").trim()} onClick={()=>reply(entry,action,kind)}>Send</button>
  </div>;
 }
 function exportMemories(){
  if(!data)return;
  const exportable={
   exportedAt:new Date().toISOString(),
   writtenMemories:(data.journal||[]).filter(m=>m.type==="Memory").map(m=>({
    id:m.id,who:m.who,at:m.at,title:m.title,text:m.text,mood:m.mood
   })),
   openedTimeCapsules:(data.capsules||[]).filter(c=>!c.sealed).map(c=>({
    id:c.id,who:c.who,at:c.at,title:c.title,message:c.message,openAt:c.openAt,
    hadPhotograph:!!c.photo
   })),
  };
  const blob=new Blob([JSON.stringify(exportable,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;link.download="our-little-atlas-visible-memories.json";
  link.click();
  URL.revokeObjectURL(url);
 }
 const activeWeather=(person:string)=>{
  const weather=data?.weather?.[person];
  if(!weather)return null;
  if(weather.expiresAt&&Date.parse(weather.expiresAt)<Date.now())return null;
  return weather;
 };
 const inner=()=>{
 if(tab==="notes")return <div className="atlas-feature-panel">
  <div className="atlas-feature-heading"><Feather/><div><h2>Shared writing & notifications</h2><p>Our longer thoughts have their own space, with revisions and comments.</p></div></div>
  <Link className="atlas-action-link" href={"/atlas/writing"}>Open our shared writing studio <ChevronRight size={16}/></Link>
  <Link className="atlas-action-link secondary" href={"/atlas/writing#activity"}>See our activity and notifications <ChevronRight size={16}/></Link>
 </div>;
 if(tab==="library")return <>
  <div className="atlas-feature-panel">
   <div className="atlas-feature-heading"><Compass/><div><h2>An atlas of possibilities</h2><p>Choose an activity, discover our notes, or add it to our favorites.</p></div></div>
   <div className="atlas-filterbar">
    <label className="atlas-search"><Search size={17}/><input value={search} onChange={e=>{setSearch(e.target.value);setShowCount(24)}} placeholder="Find an adventure…" aria-label="Search activities"/></label>
    <select aria-label="Filter activity category" value={category} onChange={e=>{setCategory(e.target.value);setShowCount(24)}}>
     <option value="all">Every category</option>{categories.map(c=><option key={c}>{c}</option>)}
    </select>
   </div>
   <p className="atlas-count">{visible.length} shared adventures · <Link href="/wheel">Let the wheel choose <Orbit size={13}/></Link></p>
   <div className="atlas-activity-grid">{visible.slice(0,showCount).map(a=><article key={a.id} className="atlas-activity-card">
      <span className="atlas-item-type">{a.category}</span><h3>{a.title}</h3><p>{a.description}</p>
      <div className="atlas-item-actions"><button onClick={()=>openActivity(a)}>Open our notes <ChevronRight size={15}/></button>
       <button type="button" disabled={busy} aria-label={(data?.favorites||[]).includes(a.id)?"Remove favorite":"Add favorite"}
        onClick={()=>void perform("favorite",{id:a.id})}>
        <Heart size={19} fill={(data?.favorites||[]).includes(a.id)?"currentColor":"none"}/></button>
      </div>
    </article>)}</div>
   {visible.length>showCount&&<button className="atlas-load-more" onClick={()=>setShowCount(n=>n+24)}>Show more adventures</button>}
  </div>
  {selected&&<div className="atlas-sheet-backdrop" onClick={closeActivity}>
   <section className="atlas-activity-sheet" role="dialog" aria-modal="true" aria-label={"Activity notes for "+selected.title} onClick={e=>e.stopPropagation()}>
    <button className="atlas-sheet-close" onClick={closeActivity} aria-label="Close notes"><X size={19}/></button>
    <span className="atlas-item-type">{selected.category}</span><h2>{selected.title}</h2><p>{selected.description}</p>
    <div className="atlas-notes-pair">{(["Danny","Mia"] as const).map(person=><div key={person} className="atlas-person-note">
     <strong>{person}'s notes {data?.viewer===person?"· Yours":""}</strong>
     {data?.viewer===person?<textarea value={notesDraft} onChange={e=>setNotesDraft(e.target.value)} maxLength={10000} rows={5} aria-label="Your activity notes"/>:
      <p>{data?.notes?.[String(selected.id)]?.[person]||"No notes here yet."}</p>}
    </div>)}</div>
    <button className="atlas-submit" disabled={busy} onClick={()=>void perform("note",{id:selected.id,text:notesDraft})}>Save my notes ♡</button>
   </section></div>}
 </>;
 if(tab==="journal")return <>
  <div className="atlas-feature-panel">
   <div className="atlas-feature-heading"><BookOpen/><div><h2>Our journal</h2><p>Letters, moments, reflections, questions—kept in one place.</p></div></div>
   <form className="atlas-entry-form" onSubmit={e=>void handleForm(e,"journal",{type:journalType})}>
    <div className="atlas-form-row">
     <label>Kind of page<select value={journalType} onChange={e=>setJournalType(e.target.value)}>
      {["Memory","Letter","Reflection","Poem","Question","Gratitude","Interpretation"].map(t=><option key={t}>{t}</option>)}
     </select></label>
     <label>Mood <input name="mood" maxLength={60} placeholder="Thoughtful, grateful…"/></label>
    </div>
    <label>Title<input name="title" maxLength={120} placeholder="A moment worth keeping"/></label>
    <label>Your words<textarea name="text" rows={5} maxLength={5000} required placeholder="What shall we remember?"/></label>
    <button className="atlas-submit" disabled={busy}>Save this page <Heart size={16}/></button>
   </form>
  </div>
  <div className="atlas-section-title"><h2>Our pages</h2><span>{(data?.journal||[]).length} entries</span></div>
  <div className="atlas-entry-stack">{(data?.journal||[]).slice(0,100).map(entry=><article className="atlas-story-card" key={entry.id}>
   <span className="atlas-item-type">{String(entry.type||"Memory")}</span>
   <small>{entry.who} · {formatDate(entry.at)}{entry.mood?" · "+entry.mood:""}</small>
   <h3>{entry.title||"An untitled thought"}</h3>
   <p className="atlas-story-text">{entry.text}</p>
   {(entry.comments||[]).map((c:AtlasEntry)=><p key={c.id} className="atlas-story-comment"><strong>{c.who}</strong> {c.text}</p>)}
   {replyBox(entry,"journal-comment")}
  </article>)}</div>
  {!(data?.journal||[]).length&&<p className="atlas-empty">Our first page is waiting to be written.</p>}
 </>;
 if(tab==="weather")return <>
  <div className="atlas-feature-panel">
   <div className="atlas-feature-heading"><CloudSun/><div><h2>Our emotional weather</h2><p>Two different skies, understood without assumptions.</p></div></div>
   <div className="atlas-weather-grid">{(["Danny","Mia"] as const).map(person=>{
    const weather=activeWeather(person);
    return <div className="atlas-weather-card" key={person} style={{borderColor:weather?.color||"#e7dbe0"}}>
     <strong>{person}'s sky</strong>
     <div className="atlas-weather-emoji">{weather?.emoji||"☁️"}</div>
     <h3>{weather?.label||"Not currently shared"}</h3>
     <p>{weather?.note||"No explanation required."}</p>
     {weather&&<small>Updated {formatDate(weather.at)}{weather.expiresAt?" · temporary":""}</small>}
    </div>;
   })}</div>
   <form className="atlas-entry-form" onSubmit={e=>void handleForm(e,"weather",{emoji:moodEmoji})}>
    <h3>Share your own weather</h3>
    <div className="atlas-mood-options">{["☀️","🌤️","☁️","🌧️","🌈","🌙","✨","❤️","🥹","🥰","🤔","😴","😤","🫶"].map(emoji=>
     <button type="button" key={emoji} className={emoji===moodEmoji?"chosen":""} onClick={()=>setMoodEmoji(emoji)}>{emoji}</button>)}</div>
    <div className="atlas-mood-words"><label>Or write your own emoji or expression
     <input value={moodEmoji} onChange={e=>setMoodEmoji(e.target.value)} maxLength={16} aria-label="Your own emoji or Chinese expression" placeholder="✨ / 想你 / 抱抱"/>
    </label><div>{["想你","抱抱","撒娇","开心","心动"].map(word=><button key={word} type="button" onClick={()=>setMoodEmoji(word)}>{word}</button>)}</div></div>
    <div className="atlas-form-row"><label>Color<input name="color" type="color" defaultValue="#b8c8bd" required/></label>
     <label>Keep this weather for<select name="duration"><option value="until">Until I change it</option><option value="2">2 hours</option><option value="8">8 hours</option><option value="24">24 hours</option></select></label>
    </div>
    <label>Feeling<input name="label" maxLength={60} placeholder="Quietly hopeful"/></label>
    <label>A few words (optional)<textarea name="note" rows={3} maxLength={500} placeholder="Something about your sky today…"/></label>
    <button disabled={busy} className="atlas-submit">Share my weather <Heart size={16}/></button>
   </form>
  </div>
 </>;
 if(tab==="capsules")return <>
  <div className="atlas-feature-panel">
   <div className="atlas-feature-heading"><Camera/><div><h2>Letters to our future selves</h2><p>Keep a thought sealed until its day arrives.</p></div></div>
   <form className="atlas-entry-form" onSubmit={e=>void handleForm(e,"capsule")}>
    <div className="atlas-form-row"><label>How to open<select name="mode"><option value="together">Open together</option><option value="surprise">A surprise for the other</option></select></label>
      <label>Open on<input name="openAt" type="datetime-local" required/></label></div>
    <label>Title<input name="title" required maxLength={120} placeholder="A gift to the future"/></label>
    <label>Your message<textarea name="message" rows={5} required maxLength={4000} placeholder="Something worth rediscovering…"/></label>
    <label>Optional photo<input name="photoUpload" type="file" accept="image/jpeg,image/png,image/webp"/></label>
    <small className="atlas-field-help">Photo uploads are compressed before sealing. Unopened contents stay hidden in the app.</small>
    <button disabled={busy} className="atlas-submit">Seal this time capsule <Heart size={16}/></button>
   </form>
  </div>
  <div className="atlas-section-title"><h2>Our time capsules</h2><span>{(data?.capsules||[]).length} capsules</span></div>
  <div className="atlas-entry-stack">{(data?.capsules||[]).map(item=><article className="atlas-story-card" key={item.id}>
    <span className="atlas-item-type">{item.sealed?"Sealed until "+formatDate(item.openAt):"Open and ready"}</span>
    <small>{item.who} · {String(item.mode)==="surprise"?"A surprise for "+item.recipient:"Open together"}</small>
    <h3>{item.sealed?"A little secret for later":item.title}</h3>
    {!item.sealed&&<><p className="atlas-story-text">{item.message}</p>
      {typeof item.photo==="string"&&/^https:\/\//.test(item.photo)&&<img className="atlas-capsule-image" src={item.photo} alt="Opened time capsule photograph"/>}</>}
    {item.sealed&&<p>We'll discover its contents when the time arrives.</p>}
   </article>)}</div>
  {!(data?.capsules||[]).length&&<p className="atlas-empty">The future has room for our first letter.</p>}
 </>;
 if(tab==="memories"){
  const photos=(data?.capsules||[]).filter(c=>!c.sealed && typeof c.photo==="string" && /^https:\/\//.test(c.photo));
  const memories=(data?.journal||[]).filter(c=>c.type==="Memory");
  return <div className="atlas-feature-panel">
    <div className="atlas-feature-heading"><Images/><div><h2>Our memory gallery</h2><p>Already-opened photographs and our written memories.</p></div></div>
    <button type="button" className="atlas-load-more" onClick={exportMemories}>Export opened memories as JSON</button>
    <p className="atlas-field-help">The export includes visible memories only. Keep the file private. Signed photo links aren't included because they expire.</p>
    <div className="atlas-memory-grid">{photos.map(c=><article key={c.id} className="atlas-memory-tile">
     <img src={String(c.photo)} alt={"A memory: "+c.title}/><div><strong>{c.title}</strong><small>{formatDate(c.at)}</small></div>
    </article>)}</div>
    <div className="atlas-section-title"><h2>Memories in words</h2><span>{memories.length}</span></div>
    <div className="atlas-entry-stack">{memories.map(m=><article className="atlas-story-card" key={m.id}>
      <small>{m.who} · {formatDate(m.at)}</small><h3>{m.title||"A little memory"}</h3><p className="atlas-story-text">{m.text}</p>
    </article>)}</div>
    {!photos.length&&!memories.length&&<p className="atlas-empty">Our shared memories will appear here as we create them.</p>}
  </div>;
 }
 if(tab==="ideas")return <div className="atlas-feature-panel">
  <div className="atlas-feature-heading"><Lightbulb/><div><h2>Our next possibilities</h2><p>Each new adventure becomes part of our shared wheel.</p></div></div>
  <form className="atlas-entry-form" onSubmit={e=>void handleForm(e,"topic")}>
    <h3>Add an activity to our wheel</h3>
    <label>Name<input name="title" maxLength={100} required placeholder="A tiny adventure…"/></label>
    <label>Category<select name="category"><option>Our inventions</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
    <label>What shall we do?<textarea name="description" maxLength={1500} rows={3} required/></label>
    <button className="atlas-submit" disabled={busy}>Add to our shared wheel <Plus size={17}/></button>
  </form>
  <form className="atlas-entry-form" onSubmit={e=>void handleForm(e,"idea")}>
    <h3>Save an idea</h3>
    <label>Title<input name="title" required maxLength={100}/></label>
    <label>Our idea<textarea name="text" rows={3} maxLength={3000}/></label>
    <button disabled={busy} className="atlas-submit">Keep this idea <Heart size={16}/></button>
  </form>
  <div className="atlas-section-title"><h2>Our collected ideas</h2><span>{(data?.ideas||[]).length}</span></div>
  <div className="atlas-entry-stack">{(data?.ideas||[]).map(i=><article className="atlas-story-card" key={i.id}>
    <small>{i.who} · {formatDate(i.at)}</small><h3>{i.title}</h3><p className="atlas-story-text">{i.text}</p>
  </article>)}</div>
 </div>;
 if(tab==="understanding")return <div className="atlas-feature-panel">
  <div className="atlas-feature-heading"><Heart/><div><h2>Understanding studio</h2><p>Space for your different perspectives and thoughtful questions.</p></div></div>
  <div className="atlas-segmented">
   {([{id:"mirror",name:"Mirror"},{id:"clarity",name:"Clarity Bridge"},{id:"assumptions",name:"Assumptions"}] as const).map(p=>
   <button key={p.id} className={understandingTab===p.id?"chosen":""} onClick={()=>setUnderstandingTab(p.id)}>{p.name}</button>)}
  </div>
  {understandingTab==="mirror"&&<>
   <form className="atlas-entry-form" onSubmit={e=>void handleForm(e,"mirror")}>
    <h3>Interpretation Mirror</h3><p>Share what you expressed, then learn how it was understood.</p>
    <label>My expression<textarea name="expression" maxLength={2000} required rows={3}/></label>
    <button disabled={busy} className="atlas-submit">Open a mirror <Heart size={16}/></button>
   </form>
   <div className="atlas-entry-stack">{(data?.mirrors||[]).map(entry=><article className="atlas-story-card" key={entry.id}>
    <small>{entry.who} · {formatDate(entry.at)}</small><h3>{entry.expression}</h3>
    {(["interpretation","intention","reflection"] as const).map(kind=>{
     const answer=entry[kind];
     const canReply=!answer&&(kind==="interpretation"?entry.who!==data?.viewer:kind==="intention"?entry.who===data?.viewer:!!(entry.interpretation&&entry.intention));
     return <div className="atlas-understanding-answer" key={kind}>
      <strong>{kind.charAt(0).toUpperCase()+kind.slice(1)}</strong>
      {answer?<p>{answer.who}: {answer.text}</p>:canReply?replyBox(entry,"mirror-answer",kind):<p>Awaiting the next perspective.</p>}
     </div>;
    })}
   </article>)}</div>
  </>}
  {understandingTab==="clarity"&&<>
   <form className="atlas-entry-form" onSubmit={e=>void handleForm(e,"clarity")}>
    <h3>Clarity Bridge</h3><p>Ask a question without requiring an immediate answer.</p>
    <label>What would you like to clarify?<textarea name="message" required maxLength={2000} rows={3}/></label>
    <button className="atlas-submit" disabled={busy}>Share the question <Heart size={16}/></button>
   </form>
   <div className="atlas-entry-stack">{(data?.clarity||[]).map(entry=><article className="atlas-story-card" key={entry.id}>
    <small>{entry.who} · {formatDate(entry.at)}</small><p className="atlas-story-text">{entry.message}</p>
    {(entry.replies||[]).map((r:AtlasEntry)=><p className="atlas-story-comment" key={r.id}><strong>{r.who}</strong> {r.message}</p>)}
    {replyBox(entry,"clarity-reply")}
   </article>)}</div>
  </>}
  {understandingTab==="assumptions"&&<>
   <form className="atlas-entry-form" onSubmit={e=>void handleForm(e,"assumption")}>
    <h3>Assumption Detector</h3>
    <label>What did you observe?<textarea name="observation" maxLength={1200} required rows={2}/></label>
    <label>How did you interpret it?<textarea name="interpretation" maxLength={1200} required rows={2}/></label>
    <label>Other possibilities<textarea name="alternatives" maxLength={1200} rows={2}/></label>
    <label>What remains unknown?<textarea name="unknowns" maxLength={1200} rows={2}/></label>
    <label>A question worth asking<textarea name="question" maxLength={1200} rows={2}/></label>
    <label>Intensity (1–10)<input type="number" name="intensity" defaultValue="5" min="1" max="10"/></label>
    <button disabled={busy} className="atlas-submit">Save a reflection <Heart size={16}/></button>
   </form>
   <div className="atlas-entry-stack">{(data?.assumptions||[]).map(a=><article className="atlas-story-card" key={a.id}>
    <small>{a.who} · {formatDate(a.at)} · Intensity {a.intensity}/10</small>
    <h3>{a.observation}</h3><p className="atlas-story-text">{a.interpretation}</p>
    {a.alternatives&&<p><strong>Another possibility:</strong> {a.alternatives}</p>}
    {a.unknowns&&<p><strong>Still unknown:</strong> {a.unknowns}</p>}
    {a.question&&<p><strong>Our question:</strong> {a.question}</p>}
   </article>)}</div>
  </>}
 </div>;
 return null;
 };
 const current=sections.find(x=>x.id===tab)||sections[0];
 return <div className="atlas-modern-app">
  <SharedThemeSync/>
  <header className="atlas-modern-header">
   <Link href="/home" className="atlas-modern-back" aria-label="Back to our home"><ArrowLeft size={19}/></Link>
   <div className="atlas-modern-brand"><strong>Our Little Atlas ✧</strong><small>OUR SHARED WORLD</small></div>
   <div className="atlas-modern-header-tools">
    <Link href={"/atlas/writing#activity"} aria-label="Notifications"><Bell size={19}/></Link>
    <Link href="/appearance" aria-label="Choose our colors"><Settings2 size={19}/></Link>
   </div>
  </header>
  <div className="atlas-modern-hero"><div className="atlas-modern-overline"><Sparkles size={14}/> A PLACE FOR OUR WORLDS</div><h1>{current.name}<span> ♡</span></h1><p>{current.hint} · From Jerusalem to Shenzhen, and everywhere our minds go.</p></div>
  <nav className="atlas-modern-tabs" aria-label="All Atlas features">
   {sections.map(({id,name,icon:Icon})=><Link key={id} className={id===tab?"selected":""} href={"/atlas?tab="+id}>
    <Icon size={17}/>{name}</Link>)}
  </nav>
  <main className="atlas-modern-main">
   {message&&<div className="atlas-alert" role="status">{message}<button onClick={()=>setMessage("")} aria-label="Dismiss notice"><X size={15}/></button></div>}
   {loading&&!data?<div className="atlas-loading"><Orbit size={26}/> Opening our shared world…</div>:inner()}
   <div className="atlas-modern-footnote">Made for two curious minds · Every saved change belongs to our shared Atlas.</div>
  </main>
  <nav className="atlas-modern-bottom" aria-label="App navigation">
   <Link href="/home"><Map size={19}/>Home</Link>
   <Link href="/wheel"><Orbit size={19}/>Wheel</Link>
   <Link className="selected" href="/atlas"><Compass size={19}/>Atlas</Link>
   <Link href="/atlas/writing"><Feather size={19}/>Writing</Link>
   <Link href="/appearance"><Palette size={19}/>Settings</Link>
  </nav>
 </div>;
}

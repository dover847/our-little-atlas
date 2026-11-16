"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell, BookOpen, Camera, Check, ChefHat, ChevronRight, Compass, Heart,
  Images, Leaf, Menu, MessageCircleHeart, Music2, NotebookPen, Orbit,
  Palette, Settings2, Sparkles, WandSparkles, Mountain, Flower2
} from "lucide-react";
import { PresencePulse } from "@/components/presence-pulse";
import { SharedThemeSync } from "@/components/shared-theme-sync";
import { ProfilePair } from "@/components/profile-pair";

type Activity = {id:number;title:string;description:string;category:string};
type Spin = {id:number;who:string;at:string};
type AtlasState = {activities:Activity[];spins:Spin[];selected:number|null;viewer:string;revision:number};
const chapters = [
 {label:"Surprise Me",icon:Sparkles},
 {label:"Cook Together",icon:ChefHat},
 {label:"Photo Quest",icon:Camera},
 {label:"Explore",icon:Mountain},
 {label:"Read & Share",icon:BookOpen},
 {label:"Music Session",icon:Music2},
 {label:"Grow Something",icon:Leaf},
 {label:"Deep Talk",icon:MessageCircleHeart},
];
const colors=["#c77c95","#e5ac75","#80b8a7","#82a8c8","#9a8bad","#80a58a","#d3b26b","#ba7891"];
function chapterOf(a:Activity){
 const t=(a.title+" "+a.category).toLowerCase();
 if(/cook|food|meal|recipe|bake|kitchen|taste|tea|coffee/.test(t))return 1;
 if(/photo|picture|camera|capture|image|portrait/.test(t))return 2;
 if(/explor|walk|travel|adventur|place|city|visit|outside|hike/.test(t))return 3;
 if(/read|book|story|poem|letter|literat/.test(t))return 4;
 if(/music|song|dance|rhythm|listen|sing|playlist/.test(t))return 5;
 if(/grow|plant|garden|learn|reflect|create|draw|build|art|invent|design/.test(t))return 6;
 if(/talk|ask|question|discuss|convers|connect|heart|feeling|emotion|understand|relationship/.test(t))return 7;
 return 0;
}
const byId=(items:Activity[],id:number)=>items.find(a=>a.id===id);
export function SharedWheel({spaceId}:{spaceId:string}){
 const [atlas,setAtlas]=useState<AtlasState|null>(null);
 const [category,setCategory]=useState("all");
 const [result,setResult]=useState<Activity|null>(null);
 const [spinning,setSpinning]=useState(false);
 const [angle,setAngle]=useState(0);
 const [status,setStatus]=useState("Opening your shared activities…");
 const [error,setError]=useState("");
 const angleRef=useRef(0);
 const spinningRef=useRef(false);
 const spinTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const currentResultId=useRef<number|null>(null);
 async function refresh(){
  try{
   const response=await fetch("/api/legacy/state",{cache:"no-store",credentials:"same-origin"});
   if(!response.ok){
     if(response.status===401){setError("Please sign in again to use the shared wheel.");return;}
     throw Error("Your shared activities couldn't be loaded.");
   }
   const data=await response.json() as AtlasState;
   if(!Array.isArray(data.activities))throw Error("Your activity collection is unavailable.");
   setAtlas(data);
   if(!spinningRef.current && data.spins?.[0]){
      const recent=byId(data.activities,data.spins[0].id);
      if(recent && currentResultId.current!==recent.id){
        setResult(recent);
        currentResultId.current=recent.id;
        setStatus("Latest shared spin · "+data.spins[0].who);
      }
   } else if(!data.spins?.length){
     setStatus("Our next little adventure begins here.");
   }
   setError("");
  }catch(e){setError(e instanceof Error?e.message:"Atlas is temporarily unavailable.");}
 }
 useEffect(()=>{
  void refresh();
  const id=window.setInterval(()=>{if(!document.hidden&&!spinningRef.current)void refresh();},12000);
  const focus=()=>{if(!document.hidden&&!spinningRef.current)void refresh()};
  window.addEventListener("focus",focus);
  return ()=>{window.clearInterval(id);window.removeEventListener("focus",focus);if(spinTimer.current)clearTimeout(spinTimer.current)};
 },[]);
 const categories=useMemo(()=>[...new Set((atlas?.activities||[]).map(a=>a.category))].sort(),[atlas]);
 const candidates=useMemo(()=>atlas?.activities.filter(a=>category==="all"||a.category===category)||[],[atlas,category]);
 async function spin(){
  if(!candidates.length||spinningRef.current)return;
  spinningRef.current=true;
  setSpinning(true);setResult(null);setError("");
  setStatus("The possibilities are moving…");
  try{
   const res=await fetch("/api/legacy/spin",{
    method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ids:candidates.map(a=>a.id)}),
   });
   const data=await res.json() as {selected?:number;error?:string};
   if(!res.ok||typeof data.selected!=="number")throw Error(data.error||"That spin could not be saved.");
   const selected=byId(candidates,data.selected);
   if(!selected)throw Error("Your activity selection changed. Please spin again.");
   const index=chapterOf(selected);
   const target=(360-(index*45)%360)%360;
   const next=Math.ceil((angleRef.current+4320)/360)*360+target;
   angleRef.current=next;setAngle(next);
   const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
   spinTimer.current=setTimeout(()=>{
    setResult(selected);
    currentResultId.current=selected.id;
    setStatus("Chosen for us · "+selected.category);
    setSpinning(false);spinningRef.current=false;
    void refresh();
   },reduced?100:10400);
  }catch(e){
   setError(e instanceof Error?e.message:"The wheel couldn't spin.");
   setSpinning(false);spinningRef.current=false;
  }
 }
 const spinHistory=(atlas?.spins||[]).slice(0,3);
 return (
 <div className="atlas-wheel-app">
  <SharedThemeSync/>
  <div className="wheel-skyline" aria-hidden="true">
    <div className="wheel-stars">✧ ✦ ✧</div>
    <div className="wheel-bay"/>
    <div className="wheel-buildings"><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/></div>
    <div className="wheel-blossoms wheel-blossoms-left"><i>✿</i><i>✿</i><i>✿</i></div>
    <div className="wheel-blossoms wheel-blossoms-right"><i>✿</i><i>✿</i><i>✿</i></div>
  </div>
  <header className="wheel-topbar">
   <Link href="/home" aria-label="Map home" className="wheel-top-button"><Menu size={20}/></Link>
   <div className="wheel-brand"><span className="wheel-star">✧</span><strong>Our Little Atlas</strong><small>A SHARED SPACE FOR OUR WORLDS</small></div>
   <div className="wheel-top-tools">
     <Link href={"/space/"+spaceId} aria-label="Notifications" className="wheel-top-button"><Bell size={19}/></Link>
     <Link href="/appearance" aria-label="Change color themes and backgrounds" className="wheel-top-button"><Settings2 size={19}/></Link>
   </div>
  </header>
  <main className="wheel-main">
   <ProfilePair/>
   <div className="wheel-connected"><PresencePulse spaceId={spaceId}/></div>
   <div className="wheel-location"><Compass size={14}/> Jerusalem <Heart size={13} fill="currentColor"/> Shenzhen, China</div>
   <div className="wheel-picker">
    <label htmlFor="wheel-chapter-category">What shall we discover together?</label>
    <select id="wheel-chapter-category" value={category} disabled={spinning||!atlas} onChange={e=>setCategory(e.target.value)}>
     <option value="all">All our adventures</option>
     {categories.map(c=><option key={c} value={c}>{c}</option>)}
    </select>
   </div>
   <div className="wheel-stage" aria-label="Interactive eight-chapter shared activity wheel">
    <span className="wheel-pointer" aria-hidden="true">▼</span>
    <div className="wheel-plate" style={{transform:"rotate("+angle+"deg)"}}>
     <div className="wheel-chapters">
      {chapters.map(({label,icon:Icon},index)=>{
       const rad=index*Math.PI/4-Math.PI/2;
       const x=50+34*Math.cos(rad),y=50+34*Math.sin(rad);
       return <div key={label} className="wheel-chapter" style={{left:x+"%",top:y+"%",transform:"translate(-50%,-50%) rotate("+(-angle)+"deg)"}}>
         <Icon size={22} strokeWidth={1.65}/><span>{label}</span>
       </div>;
      })}
     </div>
    </div>
    <button className="wheel-spin-button" type="button" disabled={!atlas||spinning||candidates.length===0} onClick={()=>void spin()}>
     {spinning?<><Orbit size={24} className="wheel-spin-icon"/>Spinning…</>:<><Heart size={23}/>Spin<br/>Together</>}
    </button>
   </div>
   <div className="wheel-spin-status" role="status" aria-live="polite">{error||status}</div>
   {result&&<div className="wheel-result" role="status">
    <span>✦ OUR NEXT ADVENTURE</span>
    <h2>{result.title}</h2>
    <p>{result.description}</p>
    <Link href={"/atlas?tab=library&activity="+selected.id}>Open in our Atlas <ChevronRight size={17}/></Link>
   </div>}
   <div className="wheel-shortcuts">
    <Link href="/atlas?tab=library"><NotebookPen size={24}/><span>Shared<br/>Notes</span></Link>
    <Link href="/atlas?tab=journal"><BookOpen size={24}/><span>Journals</span></Link>
    <Link href="/atlas?tab=weather"><Flower2 size={24}/><span>Emotional<br/>Weather</span></Link>
    <Link href="/atlas?tab=capsules"><Images size={24}/><span>Time<br/>Capsule</span></Link>
   </div>
   <section className="wheel-today">
    <div className="wheel-section-title"><h2>Today in Our Atlas ♡</h2><Link href="/atlas">See all <ChevronRight size={14}/></Link></div>
    {spinHistory.length?
      <div className="wheel-history">{spinHistory.map((item,index)=>{
       const selected=byId(atlas?.activities||[],item.id);
       return <div key={item.at+"-"+index} className="wheel-history-row"><span className="wheel-history-mark">{index===0?<Check size={16}/>:<Heart size={15}/>}</span><div><strong>{selected?.title||"A shared adventure"}</strong><small>{item.who} · {new Date(item.at).toLocaleString([], {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</small></div></div>;
      })}</div>:
      <div className="wheel-empty">Your first spin will become part of our shared history.</div>}
   </section>
   <Link href="/appearance" className="wheel-customize"><Palette size={16}/> Make our world ours · Change colors and photo</Link>
  </main>
  <nav className="wheel-bottom" aria-label="Wheel home navigation">
   <Link href="/home"><Compass size={20}/>Home</Link>
   <Link href="/atlas?tab=library"><Orbit size={20}/>Atlas</Link>
   <Link href="/wheel" className="selected"><Heart size={20}/>Wheel</Link>
   <Link href="/atlas?tab=journal"><BookOpen size={20}/>Journal</Link>
   <Link href="/atlas?tab=memories"><Images size={20}/>Gallery</Link>
   <Link href={"/space/"+spaceId}><Menu size={20}/>Us</Link>
  </nav>
 </div>
 );
}

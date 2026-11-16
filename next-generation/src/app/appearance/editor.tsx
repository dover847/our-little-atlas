"use client";
import { ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Camera, ChevronRight, Heart, ImagePlus, Palette, RefreshCcw, SlidersHorizontal, Trash2 } from "lucide-react";
import { SharedThemeSync } from "@/components/shared-theme-sync";
import "./appearance.css";

type SharedLook = {
  sharedTheme:string;accentColor:string;backgroundUrl:string|null;
  updatedBy:string;updatedAt:string;backgroundBytes:number;
};
const presets = [
  {id:"original",name:"Classic cream",desc:"Clean and timeless",color:"#f3d6be",accent:"#c99477"},
  {id:"rose",name:"Rose garden",desc:"Soft pink and blossom",color:"#efd0d9",accent:"#ca829c"},
  {id:"forest",name:"Forest",desc:"Fresh, quiet greens",color:"#b9d4bf",accent:"#729d82"},
  {id:"ocean",name:"Coastal blue",desc:"Shenzhen sea tones",color:"#b5d7e4",accent:"#6094b3"},
  {id:"violet",name:"Violet evening",desc:"Gentle starlight",color:"#cbc3e8",accent:"#9881c5"},
  {id:"sunrise",name:"Golden sunrise",desc:"Warm sunshine",color:"#f7d6a6",accent:"#cf9a53"},
  {id:"twilight",name:"Twilight",desc:"Blue-hour calm",color:"#aebcd9",accent:"#7989b4"},
] as const;

async function shrinkPhoto(file:File):Promise<File>{
 if(file.size<=1100000)return file;
 const bitmap=await createImageBitmap(file);
 const max=1700,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement("canvas");
 canvas.width=Math.round(bitmap.width*scale);
 canvas.height=Math.round(bitmap.height*scale);
 const context=canvas.getContext("2d");
 if(!context){bitmap.close();throw Error("Photo editing is not supported by this browser.");}
 context.drawImage(bitmap,0,0,canvas.width,canvas.height);
 bitmap.close();
 let blob:Blob|null=null;
 for(const quality of [.82,.68,.54,.4]){
  blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
  if(blob&&blob.size<=1150000)break;
 }
 if(!blob||blob.size>1200000)throw Error("This photograph is too large to upload; choose a smaller one.");
 return new File([blob],"our-shared-background.jpg",{type:"image/jpeg"});
}

export function AppearanceEditor(){
 const [theme,setTheme]=useState("original");
 const [accent,setAccent]=useState("#c99477");
 const [background,setBackground]=useState<string|null>(null);
 const [upload,setUpload]=useState<File|null>(null);
 const [preview,setPreview]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState("");
 const [updatedBy,setUpdatedBy]=useState("");
 const [changedAt,setChangedAt]=useState("");
 async function load(){
  try{
   const r=await fetch("/api/atmosphere",{cache:"no-store",credentials:"same-origin"});
   if(!r.ok)throw Error("Unable to load shared appearance settings.");
   const value=await r.json() as SharedLook;
   setTheme(value.sharedTheme);
   setAccent(value.accentColor);
   setBackground(value.backgroundUrl);
   setUpdatedBy(value.updatedBy);
   setChangedAt(value.updatedAt);
  }catch(e){setMessage(e instanceof Error?e.message:"Unable to load appearance");}
  finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[]);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);
 function changeFile(event:ChangeEvent<HTMLInputElement>){
   const file=event.target.files?.[0]||null;
   setUpload(file);
   setPreview(file?URL.createObjectURL(file):null);
   setMessage("");
 }
 async function apply(removePhoto=false){
  if(busy)return;
  setBusy(true);setMessage("");
  let savedTheme=false;
  try{
   const res=await fetch("/api/atmosphere",{
    method:"PATCH",headers:{"Content-Type":"application/json"},credentials:"same-origin",
    body:JSON.stringify({theme,accent,removePhoto}),
   });
   const result=await res.json();
   if(!res.ok)throw Error(result.error||"Could not save our shared colors.");
   savedTheme=true;
   let current=result as SharedLook;
   if(!removePhoto&&upload){
    const file=await shrinkPhoto(upload);
    const form=new FormData();
    form.append("photo",file);
    const photo=await fetch("/api/atmosphere",{method:"POST",credentials:"same-origin",body:form});
    const response=await photo.json();
    if(!photo.ok)throw Error(response.error||"The photograph could not be saved.");
    current=response as SharedLook;
   }
   setUpload(null);setPreview(null);
   setBackground(current.backgroundUrl);
   setUpdatedBy(current.updatedBy);
   setChangedAt(current.updatedAt);
   setMessage(removePhoto?"Shared photograph removed for both of you.":"Saved for both of you. The other phone will update automatically.");
   window.dispatchEvent(new Event("atlas-theme-changed"));
  }catch(e){
   setMessage((savedTheme?"Colors were saved, but the photo was not uploaded. ":"")+
    (e instanceof Error?e.message:"Something went wrong."));
  }finally{setBusy(false);}
 }
 const selected=presets.find(p=>p.id===theme)||presets[0];
 return (
  <div className="atlas-appearance-app">
   <SharedThemeSync/>
   <header className="app-settings-bar">
    <Link href="/home" aria-label="Return to Atlas home"><ArrowLeft size={19}/></Link>
    <span>Our Little Atlas</span>
    <Link href="/wheel" aria-label="Open our wheel"><Heart size={20}/></Link>
   </header>
   <main className="app-settings-main">
    <div className="app-settings-eyebrow"><Palette size={15}/> A SHARED LOOK FOR OUR WORLD</div>
    <h1>Make it feel<br/><em>like us.</em></h1>
    <p className="app-settings-lede">Choose the colors and photographs of our little world. Whatever you or Mia saves here becomes the setting on both phones until one of you changes it again.</p>
    <section className="app-preview" style={{"--preview-color":accent,"--preview-tint":selected.color} as React.CSSProperties}>
     <div className="app-preview-back" style={{backgroundImage: preview?"url("+JSON.stringify(preview)+")":background?"url("+JSON.stringify(background)+")":"none"}}/>
     <div className="app-preview-heading">Our Little Atlas <span>✧</span></div>
     <div className="app-preview-orb"><span>♡</span> A world of our own</div>
     <div className="app-preview-row"><i/><i/><i/></div>
     <div className="app-preview-footer"><span>Preview of our shared atmosphere</span><span>{selected.name}</span></div>
    </section>
    <section className="app-option-section">
     <div className="app-option-title"><div><h2>Color themes</h2><p>Seven moods, one shared home</p></div><SlidersHorizontal size={20}/></div>
     <div className="app-color-grid" role="radiogroup" aria-label="Choose a shared color theme">
      {presets.map(p=><button key={p.id} type="button" role="radio" aria-checked={theme===p.id}
       className={"app-color-preset"+(theme===p.id?" chosen":"")}
       onClick={()=>{setTheme(p.id);setAccent(p.accent);}}>
        <span className="app-color-swatch" style={{background:p.color}}><span style={{background:p.accent}}/></span>
        <strong>{p.name}</strong>
        {theme===p.id&&<Check size={15}/>}
      </button>)}
     </div>
     <label className="app-accent-row" htmlFor="atlas-accent-picker">
      <span><strong>Personalize the accent</strong><small>Choose any color you like</small></span>
      <input id="atlas-accent-picker" type="color" value={accent} onChange={e=>setAccent(e.target.value)}/>
     </label>
    </section>
    <section className="app-option-section">
     <div className="app-option-title"><div><h2>Background photo</h2><p>Visible on both phones</p></div><Camera size={20}/></div>
     <label className="app-upload" htmlFor="atlas-upload-background">
      <ImagePlus size={26}/>
      <span>{upload?upload.name:"Choose a photo from your phone"}</span>
      <small>JPG, PNG, or WebP · large pictures are compressed first</small>
      <input id="atlas-upload-background" type="file" accept="image/jpeg,image/png,image/webp" onChange={changeFile}/>
     </label>
     {background&&<button className="app-remove-photo" type="button" onClick={()=>void apply(true)} disabled={busy}><Trash2 size={16}/> Remove current shared photo</button>}
    </section>
    <div className="app-shared-note"><Heart size={18}/><div><strong>One shared appearance</strong><p>The most recent saved choice wins. Your notes, memories, and wheel activities stay untouched.</p>{updatedBy&&<small>Last changed by {updatedBy}{changedAt?" · "+new Date(changedAt).toLocaleDateString():""}</small>}</div></div>
    {message&&<p className="app-settings-message" role="status">{message}</p>}
    <button className="app-save" disabled={busy||loading} onClick={()=>void apply(false)}>
      {busy?"Saving your shared look…":loading?"Loading shared settings…":"Apply for both of us ✦"} <ChevronRight size={19}/>
    </button>
    <div className="app-settings-bottom"><Link href="/home">Map home</Link><span>·</span><Link href="/wheel">Spinning wheel</Link></div>
   </main>
  </div>
 );
}

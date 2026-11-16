"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, RefreshCw } from "lucide-react";

type Profile={userId:string;name:string;role:string;isMe:boolean;photoUrl:string|null;updatedAt:string|null};
async function preparePortrait(file:File){
 if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw Error("Choose a JPG, PNG or WebP image.");
 if(file.size>20_000_000)throw Error("This photo is too large. Choose a smaller photo.");
 const bitmap=await createImageBitmap(file);
 const canvas=document.createElement("canvas");
 canvas.width=640;canvas.height=640;
 const ctx=canvas.getContext("2d");
 if(!ctx){bitmap.close();throw Error("This device cannot edit the image.");}
 const side=Math.min(bitmap.width,bitmap.height);
 const sx=(bitmap.width-side)/2,sy=(bitmap.height-side)/2;
 ctx.drawImage(bitmap,sx,sy,side,side,0,0,640,640);
 bitmap.close();
 const photo=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",.86));
 if(!photo)throw Error("Could not prepare the picture.");
 if(photo.size>1_200_000)throw Error("Photo compression failed; choose a smaller picture.");
 return new File([photo],"atlas-portrait.jpg",{type:"image/jpeg"});
}

export function ProfilePair(){
 const [profiles,setProfiles]=useState<Profile[]>([]);
 const [message,setMessage]=useState("");
 const [uploading,setUploading]=useState(false);
 const input=useRef<HTMLInputElement>(null);
 const busy=useRef(false);
 async function load(){
  if(busy.current)return;
  busy.current=true;
  try{
   const r=await fetch("/api/profile-photos",{cache:"no-store",credentials:"same-origin"});
   if(!r.ok)throw Error("Profile photos could not load.");
   const d=await r.json() as {profiles:Profile[]};
   if(Array.isArray(d.profiles))setProfiles(d.profiles);
  }catch{setMessage("Photos will appear when your connection returns.");}
  finally{busy.current=false;}
 }
 useEffect(()=>{
  void load();
  const id=window.setInterval(()=>{if(!document.hidden)void load();},25000);
  const focus=()=>{if(!document.hidden)void load();};
  window.addEventListener("focus",focus);
  return()=>{window.clearInterval(id);window.removeEventListener("focus",focus);};
 },[]);
 async function choose(e:React.ChangeEvent<HTMLInputElement>){
  const f=e.target.files?.[0];
  if(!f)return;
  setUploading(true);setMessage("");
  try{
   const photo=await preparePortrait(f);
   const data=new FormData();data.append("photo",photo);
   const response=await fetch("/api/profile-photos",{method:"POST",credentials:"same-origin",body:data});
   const result=await response.json() as {error?:string};
   if(!response.ok)throw Error(result.error||"Photo could not be uploaded.");
   setMessage("Your portrait is updated for both of you ♡");
   await load();
  }catch(error){setMessage(error instanceof Error?error.message:"Could not use that photo");}
  finally{setUploading(false);if(input.current)input.current.value="";}
 }
 const own=profiles.find(p=>p.role==="owner");
 const other=profiles.find(p=>p.role!=="owner");
 const list=[own||{userId:"owner",name:"Danny",role:"owner",isMe:false,photoUrl:null,updatedAt:null},other||{userId:"companion",name:"Mia",role:"companion",isMe:false,photoUrl:null,updatedAt:null}];
 return <>
  <div className="wheel-people">
   {list.map((profile,index)=><div key={profile.userId} className="wheel-person">
    {profile.isMe?
      <button type="button" className="wheel-person-upload" aria-label={"Change your "+profile.name+" profile photo"} onClick={()=>input.current?.click()} disabled={uploading}>
       <span className={"wheel-person-photo"+(index===1?" mia":"")}>
        {profile.photoUrl?<img src={profile.photoUrl} alt={profile.name+" portrait"}/>:profile.name[0]}
       </span>
       <span className="wheel-upload-badge">{uploading?<RefreshCw size={11}/>:<Camera size={11}/>}</span>
      </button>:
      <div className={"wheel-person-photo"+(index===1?" mia":"")}>
       {profile.photoUrl?<img src={profile.photoUrl} alt={profile.name+" portrait"}/>:profile.name[0]}
      </div>}
     <span className="wheel-person-name">{profile.name}</span>
    </div>).reduce<React.ReactNode[]>((acc,item,index)=>{
     if(index)acc.push(<div className="wheel-bond" key="bond" aria-hidden="true">♡</div>);
     acc.push(item);return acc;
    },[])}
  </div>
  <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" style={{display:"none"}} onChange={choose} aria-label="Select your profile picture"/>
  <div className="wheel-photo-help" role="status">{message||"Tap your own portrait to change it · visible to both"}</div>
 </>;
}

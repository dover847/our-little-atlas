"use client";
import { useEffect, useState } from "react";

type Profile = { userId:string;name:string;role:string;photoUrl:string|null };
export function SharedProfileMini(){
 const [profiles,setProfiles]=useState<Profile[]>([]);
 useEffect(()=>{
  let mounted=true;
  async function refresh(){
   if(document.hidden)return;
   try{
    const response=await fetch("/api/profile-photos",{credentials:"same-origin",cache:"no-store"});
    if(!response.ok)return;
    const result=await response.json() as {profiles?:Profile[]};
    if(mounted&&Array.isArray(result.profiles))setProfiles(result.profiles);
   }catch{ /* The initials remain available offline. */ }
  }
  void refresh();
  const timer=window.setInterval(()=>{void refresh()},30000);
  window.addEventListener("focus",refresh);
  return()=>{mounted=false;window.clearInterval(timer);window.removeEventListener("focus",refresh)};
 },[]);
 const owner=profiles.find(p=>p.role==="owner");
 const companion=profiles.find(p=>p.role!=="owner");
 const list=[owner,companion];
 return <div className="ala-profile-pair" aria-label="Our two portraits">
  {list.map((person,index)=><div className="ala-profile-slot" key={person?.userId||index} title={person?.name||((index===0)?"Danny":"Mia")}>
    {person?.photoUrl?<img src={person.photoUrl} alt={person.name+" profile photograph"}/>:
      <span>{(person?.name||((index===0)?"Danny":"Mia")).slice(0,1).toUpperCase()}</span>}
  </div>).reduce<React.ReactNode[]>((acc,item,index)=>{
    if(index)acc.push(<span className="ala-between-heart" key="heart" aria-hidden="true">♡</span>);
    acc.push(item);
    return acc;
  },[])}
 </div>;
}

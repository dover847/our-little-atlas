"use client";

import { useEffect, useState } from "react";

type SharedLook={
  sharedTheme:string;
  backgroundPath:string|null;
  backgroundUrl:string|null;
  accentColor:string;
  updatedBy:string;
};
export function SharedAtmosphereBackground() {
  const [caption,setCaption]=useState("Our shared atmosphere");
  useEffect(()=>{
    const frame=document.querySelector<HTMLElement>(".private-world, .auth-page");
    if(!frame)return;
    let path:string|null|undefined=undefined;
    let controller:AbortController|null=null;
    let active=true;
    async function sync() {
      if(!active||document.hidden)return;
      controller?.abort();
      controller=new AbortController();
      try{
        const r=await fetch("/api/atmosphere",{
          cache:"no-store",credentials:"same-origin",signal:controller.signal,
        });
        if(!r.ok)return;
        const data=await r.json() as SharedLook;
        if(!active)return;
        frame!.dataset.sharedAtmosphere=data.sharedTheme;
        if(/^#[a-fA-F0-9]{6}$/.test(data.accentColor))
          frame!.style.setProperty("--atlas-shared-accent",data.accentColor);
        if(path!==data.backgroundPath){
          path=data.backgroundPath;
          const image=data.backgroundPath&&data.backgroundUrl
            ? "url("+JSON.stringify(data.backgroundUrl)+")" : "none";
          frame!.style.setProperty("--atlas-shared-image",image);
        }
        setCaption(data.updatedBy?
          "Our atmosphere · last changed by "+data.updatedBy:
          "Our shared atmosphere");
      }catch(error){
        if(error instanceof DOMException&&error.name==="AbortError")return;
      }
    }
    void sync();
    const id=window.setInterval(()=>{void sync()},9000);
    const focus=()=>{void sync()};
    document.addEventListener("visibilitychange",focus);
    window.addEventListener("focus",focus);
    return ()=>{
      active=false; controller?.abort();window.clearInterval(id);
      document.removeEventListener("visibilitychange",focus);
      window.removeEventListener("focus",focus);
    };
  },[]);
  return <p className="shared-atmosphere-caption" aria-live="polite">{caption} · Change it together in <a href="/full-atlas">Full Atlas</a></p>;
}

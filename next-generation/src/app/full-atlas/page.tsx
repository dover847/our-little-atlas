import { redirect } from "next/navigation";
// Old home-screen shortcuts and existing bookmarks now enter the unified app.
// The original legacy code remains archived at /classic/index.html as a fallback.
export const dynamic = "force-dynamic";
const allowed=new Set(["wheel","library","journal","weather","capsules","memories","understanding","ideas"]);
export default async function FullAtlas({searchParams}:{searchParams:Promise<{tab?:string}>}){
 const {tab}=await searchParams;
 if(tab==="wheel")redirect("/wheel");
 redirect("/atlas?tab="+(allowed.has(tab||"")?tab:"library"));
}

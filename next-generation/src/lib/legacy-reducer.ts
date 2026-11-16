import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import originalActivities from "@/data/legacy-activities.json";

export type AtlasPerson = "Danny" | "Mia";
export type LegacyArchive = Record<string, any>;

export const blankLegacy: LegacyArchive = {
  revision: 0, selected: null, spins: [], notes: {}, favorites: [],
  ideas: [], journal: [], customActivities: [], weather: {}, capsules: [],
  mirrors: [], clarity: [], assumptions: [],
};
const max = (value: unknown, n = 3000) => String(value ?? "").slice(0,n);
const nonempty = (value: unknown,n = 3000) => max(value,n).trim();
const list = (state: LegacyArchive, field: string): any[] =>
  Array.isArray(state[field]) ? state[field] : (state[field] = []);
const allowed = (state:LegacyArchive) => [...originalActivities,...list(state,"customActivities")];
function fail(message: string): never { throw new Error(message); }
const iso=()=>new Date().toISOString();

export function displayedLegacy(state: LegacyArchive, viewer: AtlasPerson): LegacyArchive {
  const now = Date.now();
  return {
    ...state,
    viewer,
    activities: allowed(state),
    capsules: list(state,"capsules").map((entry) =>
      Date.parse(entry.openAt) <= now ? entry : {
        id: entry.id, who: entry.who, recipient: entry.recipient,
        mode: entry.mode, openAt: entry.openAt, at: entry.at, sealed: true,
      }),
  };
}

function validPhoto(input: unknown): string | null {
  if (!input) return "";
  if (typeof input !== "string" || input.length > 190000) return null;
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(input);
  if (!m) return null;
  const image = Buffer.from(m[2],"base64");
  if (image.length > 135000 || image.length < 12 ||
      image.toString("base64") !== m[2]) return null;
  const valid = m[1] === "jpeg" ?
      image[0] === 255 && image[1] === 216 && image[2] === 255 :
      m[1] === "png" ?
      image.subarray(0,8).equals(Buffer.from("89504e470d0a1a0a","hex")) :
      image.subarray(0,4).toString() === "RIFF" &&
      image.subarray(8,12).toString() === "WEBP";
  return valid ? input : null;
}

export function updateLegacy(
  source: LegacyArchive, action: string, body: Record<string,unknown>,
  who: AtlasPerson,
): { state: LegacyArchive; result: Record<string,unknown>; category: string } {
  const state: LegacyArchive = structuredClone(source);
  const activities = allowed(state);
  const knownId=(x:unknown) => {
    const id=Number(x);
    if (!Number.isInteger(id) || !activities.some(a=>a.id===id)) fail("Invalid activity");
    return id;
  };
  const newEntry=(other:Record<string,unknown>) => ({id:randomUUID(),who,...other,at:iso()});
  let result: Record<string,unknown> = {ok:true};
  let category="shared update";
  switch(action) {
    case "spin": {
      const valid = Array.isArray(body.ids)
        ? body.ids.map(Number).filter(n=>activities.some(a=>a.id===n))
        : activities.map(a=>a.id);
      if (!valid.length) fail("No activities selected");
      const id=valid[randomInt(valid.length)];
      state.selected=id;
      list(state,"spins").unshift({id,who,at:iso()});
      state.spins=state.spins.slice(0,100);
      result={selected:id};category="the activity wheel";break;
    }
    case "note": {
      const id=knownId(body.id);
      state.notes ||= {};
      const notes=state.notes[String(id)] ||= {};
      // Identity comes from the signed-in account, never the name selector.
      notes[who]=max(body.text,10000);
      category="activity notes";break;
    }
    case "favorite": {
      const id=knownId(body.id);
      const favorites=list(state,"favorites");
      state.favorites=favorites.includes(id) ? favorites.filter(x=>x!==id) : [...favorites,id];
      category="shared favorites";break;
    }
    case "topic": {
      const title=nonempty(body.title,100),description=nonempty(body.description,1500);
      const cat=nonempty(body.category,60)||"Our inventions";
      if(!title||!description)fail("Please add a title and description");
      const items=list(state,"customActivities");
      if(items.length>=500)fail("Custom topic limit reached");
      const id=Math.max(999,...items.map(x=>Number(x.id)||0))+1;
      const topic={id,title,description,category:cat,createdBy:who,createdAt:iso()};
      items.push(topic);result={ok:true,topic};category="custom activities";break;
    }
    case "idea": {
      const title=nonempty(body.title,100);
      if(!title)fail("Give your idea a title");
      list(state,"ideas").unshift(newEntry({title,text:max(body.text,3000)}));
      category="new ideas";break;
    }
    case "journal": {
      const text=nonempty(body.text,5000);
      if(!text)fail("Write something first");
      const types=["Memory","Letter","Reflection","Poem","Question","Gratitude","Interpretation"];
      const type=types.includes(String(body.type))?body.type:"Memory";
      const activity=Number(body.activity);
      list(state,"journal").unshift(newEntry({
        type,title:nonempty(body.title,120),mood:nonempty(body.mood,60),
        text,activity:Number.isInteger(activity)&&activity>0?activity:null,
      }));
      category="the shared journal";break;
    }
    case "assumption": {
      const observation=nonempty(body.observation,1200);
      const interpretation=nonempty(body.interpretation,1200);
      const intensity=Number(body.intensity);
      if(!observation||!interpretation)fail("Add an observation and interpretation");
      if(!Number.isInteger(intensity)||intensity<1||intensity>10)fail("Intensity must be between 1 and 10");
      list(state,"assumptions").unshift(newEntry({
        observation,interpretation,
        alternatives:max(body.alternatives,1200),
        unknowns:max(body.unknowns,1200),
        question:max(body.question,1200),intensity,
      }));
      category="assumption reflections";break;
    }
    case "clarity": {
      const message=nonempty(body.message,2000);
      if(!message)fail("Write a gentle clarification first");
      list(state,"clarity").unshift(newEntry({message,replies:[]}));
      category="the clarity bridge";break;
    }
    case "clarity-reply": {
      const item=list(state,"clarity").find(x=>x.id===body.id);
      const message=nonempty(body.message,2000);
      if(!item||!message)fail("Choose a message and write a reply");
      item.replies ||= [];
      item.replies.push(newEntry({message}));
      category="the clarity bridge";break;
    }
    case "mirror": {
      const expression=nonempty(body.expression,2000);
      if(!expression)fail("Share an expression first");
      list(state,"mirrors").unshift(newEntry({
        expression,interpretation:null,intention:null,reflection:null,
      }));
      category="the interpretation mirror";break;
    }
    case "mirror-answer": {
      const item=list(state,"mirrors").find(x=>x.id===body.id);
      const answer=nonempty(body.answer,2000),kind=max(body.kind,30);
      if(!item||!answer)fail("Select an expression and write an answer");
      if(!["interpretation","intention","reflection"].includes(kind))fail("Invalid answer type");
      if(kind==="interpretation"&&who===item.who)fail("The other person offers the interpretation");
      if(kind==="intention"&&who!==item.who)fail("The author offers the intention");
      if(kind==="reflection"&&(!item.interpretation||!item.intention))fail("Wait for both perspectives first");
      if(item[kind])fail("This perspective has already been shared");
      item[kind]={who,text:answer,at:iso()};
      category="the interpretation mirror";break;
    }
    case "capsule": {
      const title=nonempty(body.title,120),message=nonempty(body.message,4000);
      const photo=validPhoto(body.photo);
      const mode=body.mode==="surprise"?"surprise":"together";
      const recipient=mode==="surprise"?(who==="Danny"?"Mia":"Danny"):"Both";
      const openTime=Date.parse(String(body.openAt||""));
      if(!title||!message)fail("Add a title and a message");
      if(photo===null)fail("Photo must be a small valid JPEG, PNG or WebP image");
      if(!Number.isFinite(openTime)||openTime<=Date.now()+60000 ||
         openTime>Date.now()+20*365.25*86400000)fail("Choose an opening date in the future (up to 20 years)");
      const items=list(state,"capsules");
      if(items.length>=200)fail("Time capsule limit reached");
      const photoBytes=items.reduce((sum:number,x:any)=>sum+(typeof x.photo==="string"?x.photo.length:0),0);
      if(photo&&photoBytes+photo.length>5000000)fail("Test photo storage is full");
      items.unshift(newEntry({recipient,mode,title,message,photo,openAt:new Date(openTime).toISOString()}));
      category="time capsules";break;
    }
    case "weather": {
      const color=max(body.color,7);
      if(!/^#[0-9a-fA-F]{6}$/.test(color))fail("Choose a valid color");
      const duration=["2","8","24","until"].includes(String(body.duration)) ?
        String(body.duration):"until";
      const at=iso();
      const expiresAt=duration==="until"?null:new Date(Date.now()+Number(duration)*3600000).toISOString();
      state.weather ||= {};
      state.weather[who]={
        color,emoji:nonempty(body.emoji,16),label:nonempty(body.label,60),
        note:nonempty(body.note,500),at,expiresAt,
      };
      category="emotional weather";break;
    }
    default: fail("Unknown Atlas action");
  }
  state.revision=Number(source.revision||0)+1;
  return {state,result,category};
}

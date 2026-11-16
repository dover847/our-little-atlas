import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, BookOpen, CalendarHeart, CloudSun, Compass, Heart, Images, Leaf, Map, Menu, NotebookPen, Settings2, Camera, ChevronRight, Orbit } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PresencePulse } from "@/components/presence-pulse";
import "./home.css";

export const dynamic = "force-dynamic";

const tiles = [
  { title: "Our Notes", icon: NotebookPen, tab: "library", color: "rose" },
  { title: "Emotional Weather", icon: CloudSun, tab: "weather", color: "lilac" },
  { title: "Activity Spinner", icon: Orbit, tab: "wheel", color: "peach" },
  { title: "Our Plans", icon: CalendarHeart, tab: "ideas", color: "butter" },
  { title: "Photo Time Capsule", icon: Camera, tab: "capsules", color: "mint" },
  { title: "Growth & Insights", icon: Leaf, tab: "understanding", color: "sage" },
  { title: "Memory Gallery", icon: Images, tab: "memories", color: "blue" },
  { title: "Our Adventures", icon: Compass, tab: "library", color: "violet" },
] as const;

export default async function AtlasHome() {
  const client = await createClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) redirect("/sign-in");
  const { data: membership, error: memberError } = await client
    .from("space_memberships").select("space_id")
    .eq("user_id", user.id).limit(1).maybeSingle();
  if (memberError || !membership) redirect("/space");
  const spaceId = membership.space_id as string;
  const [writing, events] = await Promise.all([
    client.from("writing_entries")
      .select("id,title,kind,updated_at")
      .eq("space_id", spaceId).eq("visibility", "shared")
      .order("updated_at", { ascending: false }).limit(1),
    client.from("atlas_legacy_activity")
      .select("id,category,created_at")
      .eq("space_id", spaceId).order("created_at", { ascending: false }).limit(1),
  ]);
  const latestEntry = writing.error ? null : writing.data?.[0];
  const latestEvent = events.error ? null : events.data?.[0];
  const showingWriting = !!latestEntry && (!latestEvent ||
    Date.parse(latestEntry.updated_at) >= Date.parse(latestEvent.created_at));
  const recentTitle = showingWriting
    ? (latestEntry?.title?.trim() || "A page in our shared writing")
    : latestEvent ? latestEvent.category : "A little room for our next discovery";
  const recentDetail = showingWriting ? "From our shared writing" :
    latestEvent ? "A shared Atlas update" : "Your shared activities will appear here";
  const recentHref = showingWriting ? "/space/" + spaceId : "/full-atlas";

  return (
    <div className="ala-shell">
      <div className="ala-petals" aria-hidden="true"><span>✿</span><span>✿</span><span>✿</span></div>
      <header className="ala-header">
        <Link href={"/space/" + spaceId} className="ala-menu" aria-label="Open your shared space"><Menu size={21} /></Link>
        <div className="ala-brand"><span>Our Little Atlas</span><Compass size={19} aria-hidden="true" /></div>
        <Link href={"/space/" + spaceId} className="ala-bell" aria-label="Open notifications"><Bell size={20}/><span /></Link>
      </header>
      <main>
        <section className="ala-journey" id="journey" aria-label="Our journey between Jerusalem and Shenzhen">
          <div className="ala-map">
            <img
              className="ala-world"
              src="/maps/jerusalem-shenzhen.svg"
              width={1024}
              height={480}
              alt=""
              decoding="async"
              fetchPriority="high"
            />
            <span className="ala-map-attribution">Map geography: Natural Earth</span>
            <div className="ala-city ala-city-left"><div className="ala-city-scene">✧</div><span>Jerusalem ♡</span></div>
            <div className="ala-city ala-city-right"><div className="ala-city-scene ala-shenzhen">✦</div><span>Shenzhen ♡</span></div>
            <div className="ala-note">A world of little discoveries <Heart size={11} fill="currentColor"/></div>
          </div>
          <div className="ala-map-caption">
            <span className="ala-globe">✧</span>
            <div><h1>Our Shared Journey <span>♡</span></h1><p>NOTES · FEELINGS · PLANS · IDEAS · ADVENTURES</p></div>
          </div>
        </section>

        <section className="ala-presence-card" aria-label="Our online status">
          <div className="ala-profile-pair" aria-hidden="true"><span>D</span><span>♡</span><span>M</span></div>
          <div className="ala-status-copy"><strong>Our shared rhythm ♡</strong><PresencePulse spaceId={spaceId}/></div>
          <Link href={"/space/" + spaceId} className="ala-presence-more" aria-label="Open our shared writing and notifications"><ChevronRight size={20}/></Link>
        </section>

        <section className="ala-features" aria-label="Our shared Atlas features">
          <div className="ala-feature-grid">
            {tiles.map(({title,icon:Icon,tab,color})=>(
              <Link key={title} href={"/full-atlas?tab=" + tab} className={"ala-tile ala-" + color}>
                <Icon size={26} strokeWidth={1.6} aria-hidden="true"/><span>{title}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="ala-mood">
          <div className="ala-moon" aria-hidden="true">☽</div>
          <div><h2>Our Current Mood ♡</h2><p>Two little weather systems, one shared sky.</p></div>
          <Link href="/full-atlas?tab=weather" className="ala-mood-button">See our weather <ChevronRight size={15}/></Link>
        </section>

        <section className="ala-recent">
          <div className="ala-section-header"><h2>Recently Together</h2><Link href={"/space/" + spaceId}>See all <ChevronRight size={15}/></Link></div>
          <Link className="ala-recent-card" href={recentHref}>
            <div className="ala-recent-symbol"><BookOpen size={26} strokeWidth={1.3}/></div>
            <div><strong>{recentTitle}</strong><p>{recentDetail}</p></div>
            <ChevronRight size={17}/>
          </Link>
        </section>
        <p className="ala-quote">“A little world for our big curiosity.” ♡</p>
        <div className="ala-personalize"><Link href="/full-atlas"><Settings2 size={15}/> Customize our shared backgrounds inside the Atlas</Link></div>
      </main>
      <nav className="ala-bottom" aria-label="Mobile app navigation">
        <Link className="ala-selected" href="/home"><span>⌂</span>Home</Link>
        <Link href="/full-atlas?tab=journal"><BookOpen size={20}/>Journal</Link>
        <Link href="#journey"><Map size={20}/>Map</Link>
        <Link href="/full-atlas?tab=memories"><Images size={20}/>Gallery</Link>
        <Link href="/full-atlas?tab=wheel"><Orbit size={20}/>Wheel</Link>
        <Link href={"/space/" + spaceId}><Menu size={20}/>More</Link>
      </nav>
    </div>
  );
}

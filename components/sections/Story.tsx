import type { ArticlePreview, KnightsHomeData } from "@/data/knights";

function Index({ children }: { children: React.ReactNode }) {
  return <span className="chapter-index">{children}</span>;
}

function formatDate(value: string | null) {
  if (!value) return "FIELD REPORT";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "FIELD REPORT"
    : new Intl.DateTimeFormat("en", { month: "short", year: "numeric" })
        .format(date)
        .toUpperCase();
}

function ArticleList({ items, kind }: { items: ArticlePreview[]; kind: string }) {
  if (!items.length) {
    return (
      <div className="content-note" data-reveal>
        <span>{kind} / 00</span>
        <strong>{kind === "WRITEUP" ? "The first dispatch is in review." : "Notes from the field are being prepared."}</strong>
        <p>Published KN1GHTS work will appear here after editorial review.</p>
      </div>
    );
  }

  return (
    <div className="journal-list">
      {items.map((item, index) => (
        <article key={item.id} data-reveal>
          <span>0{index + 1} / {item.category ?? kind}</span>
          <div>
            <h3>{item.title}</h3>
            {item.excerpt ? <p>{item.excerpt}</p> : null}
          </div>
          <time>{formatDate(item.publishedAt)}</time>
        </article>
      ))}
    </div>
  );
}

export function Story({ data }: { data: KnightsHomeData }) {
  const featuredUpdate = data.updates[0];

  return (
    <div id="story" className="story">
      <section id="home" className="chapter hero" data-chapter>
        <div className="hero-type" data-reveal>
          <span className="hero-kicker">COMPETITIVE CYBERSECURITY · INDIA</span>
          <h1>KN<span>1</span>GHTS</h1>
          <p className="hero-manifesto">OFFENSE. DEFENSE. RESEARCH.</p>
        </div>
        <p className="hero-copy" data-reveal>
          Competitive cybersecurity. Offensive research. CTFs.
        </p>
        <div className="hero-meta"><span>KN1GHTS COLLECTIVE</span><span>INDIA / ONLINE</span></div>
        <a className="hero-scroll" href="#updates"><span /> SCROLL TO EXPLORE</a>
      </section>

      <section id="updates" className="chapter updates-chapter" data-chapter>
        <div className="chapter-copy align-left" data-reveal>
          <Index>01 / LATEST FROM KN1GHTS</Index>
          <h2>PROGRESS<br />IN PUBLIC.</h2>
          <p>Competition results, team updates, and work worth sharing.</p>
        </div>
        {featuredUpdate ? (
          <article className="update-feature" data-reveal>
            <span className="update-label">{featuredUpdate.postType.replaceAll("_", " ")} / {formatDate(featuredUpdate.publishedAt)}</span>
            <h3>{featuredUpdate.title}</h3>
            <p>{featuredUpdate.excerpt ?? featuredUpdate.event?.summary ?? "A new update from the KN1GHTS team."}</p>
            {featuredUpdate.event?.sourceUrl ? (
              <a href={featuredUpdate.event.sourceUrl} target="_blank" rel="noreferrer">
                View public result <b aria-hidden="true">↗</b>
              </a>
            ) : null}
          </article>
        ) : null}
        <span className="telemetry telemetry-a" aria-hidden="true"><span>FEED</span><b>LIVE / PUBLIC</b></span>
      </section>

      <section id="approach" className="chapter approach-chapter" data-chapter>
        <div className="approach-copy" data-reveal>
          <Index>02 / WHAT DRIVES US</Index>
          <h2>PRESSURE REVEALS<br />THE <em>PATTERN.</em></h2>
          <h2>CURIOSITY FINDS<br />THE <em>BREAK.</em></h2>
          <p>A team forged through competition, focused on understanding how systems fail—and how to make them stronger.</p>
        </div>
        <div className="code-rail" aria-hidden="true"><span>OBSERVE / QUESTION / TEST</span><span>UNDERSTAND THE FAILURE</span><span>BUILD WHAT COMES NEXT</span></div>
      </section>

      <section id="disciplines" className="chapter arsenal" data-chapter>
        <div className="chapter-copy align-center" data-reveal>
          <Index>03 / HOW WE WORK</Index>
          <h2>COMPETE.<br />RESEARCH.<br />BUILD.</h2>
        </div>
        <div className="disciplines" data-reveal>
          {[
            ["COMPETE", "CTFs across web, pwn, crypto, forensics, and OSINT."],
            ["RESEARCH", "Technical investigation, offensive experiments, and clear field notes."],
            ["BUILD", "Purposeful tools and challenge infrastructure for the security community."],
          ].map(([name, summary], index) => (
            <article key={name}>
              <span>0{index + 1}</span>
              <strong>{name}</strong>
              <p>{summary}</p>
              <b aria-hidden="true">↗</b>
            </article>
          ))}
        </div>
      </section>

      <section id="results" className="chapter results-chapter" data-chapter>
        <div className="chapter-copy align-left" data-reveal>
          <Index>04 / SELECTED RESULTS</Index>
          <h2>PROOF,<br />NOT PROMISES.</h2>
          <p>Publicly shared competition results from the KN1GHTS team.</p>
        </div>
        <div className="results-list">
          {data.events.map((event, index) => (
            <article key={event.id} data-reveal>
              <span>0{index + 1} / {event.placement ? `#${event.placement}` : "RESULT"}</span>
              <div>
                <h3>{event.name}</h3>
                {event.summary ? <p>{event.summary}</p> : null}
              </div>
              {event.sourceUrl ? <a href={event.sourceUrl} target="_blank" rel="noreferrer" aria-label={`View public source for ${event.name}`}>↗</a> : null}
            </article>
          ))}
        </div>
      </section>

      <section id="writeups" className="chapter writeups" data-chapter>
        <div className="writeup-head" data-reveal>
          <Index>05 / TECHNICAL WRITEUPS</Index>
          <h2>NOTES FROM<br />THE BREACH.</h2>
          <p>Methods, lessons, and challenge solutions from the team.</p>
        </div>
        <div className="writeup-track-wrap">
          <div className="writeup-track" data-track>
            {data.writeups.length ? data.writeups.map((item, index) => (
              <article key={item.id}>
                <span>0{index + 1} / {item.category ?? "WRITEUP"}</span>
                <strong>{item.title}</strong>
                <em>{item.excerpt ?? "KN1GHTS technical field note"}</em>
              </article>
            )) : (
              <article className="writeup-empty">
                <span>EDITORIAL / IN REVIEW</span>
                <strong>THE FIRST<br />DISPATCH IS<br />IN REVIEW.</strong>
                <em>Published writeups will appear here.</em>
              </article>
            )}
          </div>
        </div>
      </section>

      <section id="projects" className="chapter projects-chapter" data-chapter>
        <div className="chapter-copy align-right" data-reveal>
          <Index>06 / OPEN SOURCE</Index>
          <h2>TOOLS FOR<br />THE NEXT<br />CHALLENGE.</h2>
          <p>Small, useful tools built to make security work more effective.</p>
        </div>
        {data.projects.length ? (
          <div className="project-list">
            {data.projects.slice(0, 4).map((project, index) => (
              <a key={project.id} href={project.repositoryUrl} target="_blank" rel="noreferrer" data-reveal>
                <span>0{index + 1} / {project.technologies[0] ?? "OPEN SOURCE"}</span>
                <strong>{project.name}</strong>
                <p>{project.description}</p>
                <b aria-hidden="true">↗</b>
              </a>
            ))}
          </div>
        ) : (
          <a className="project-note" href="https://github.com/Kn1ghts-org" target="_blank" rel="noreferrer" data-reveal>
            <span>GITHUB / KN1GHTS-ORG</span>
            <strong>Explore the<br />organization <b aria-hidden="true">↗</b></strong>
            <p>New projects will be featured here as they are published.</p>
          </a>
        )}
      </section>

      <section id="team" className="chapter team-chapter" data-chapter>
        <div className="team-intro" data-reveal>
          <Index>07 / THE TEAM</Index>
          <h2>BUILT IN<br />THE ARENA.</h2>
          <p>Competitors, researchers, and builders, working the problem together.</p>
        </div>
        <div className="team-grid">
          {data.members.map((member, index) => (
            <article className="team-card" key={member.id} data-cursor="PROFILE" data-reveal>
              {member.avatarUrl ? <img src={member.avatarUrl} alt={`${member.name}, KN1GHTS team member`} /> : <div className="portrait-placeholder" aria-hidden="true">KN1</div>}
              <div className="portrait-scan" aria-hidden="true" />
              <span>OPERATOR / 0{index + 1}</span>
              <h3>{member.handle || member.name}</h3>
              <p>{member.specialties[0] ?? "KN1GHTS"}</p>
              <em>{member.specialties.slice(1).join(" · ") || "Competitive cybersecurity"}</em>
            </article>
          ))}
        </div>
      </section>

      <section id="journal" className="chapter journal-chapter" data-chapter>
        <div className="chapter-copy align-left" data-reveal>
          <Index>08 / FROM THE FIELD</Index>
          <h2>THINGS<br />WORTH<br />SHARING.</h2>
          <p>Research notes, lessons learned, and ideas the team wants to leave better documented.</p>
        </div>
        <ArticleList items={data.blogPosts} kind="JOURNAL" />
      </section>

      <section id="recruitment" className="chapter recruitment-chapter" data-chapter>
        <div className="recruitment-copy" data-reveal>
          <Index>09 / RECRUITMENT STATUS</Index>
          <h2>THE GATE<br />IS CLOSED.<br /><em>FOR NOW.</em></h2>
          <p>KN1GHTS is not currently accepting applications. Follow the team’s public updates for the next recruitment campaign.</p>
          <a className="network-cta" href="https://www.linkedin.com/company/kn1ghts/" target="_blank" rel="noreferrer"><span>FOLLOW KN1GHTS</span><b>↗</b></a>
        </div>
        <div className="recruitment-mark" aria-hidden="true">KN</div>
      </section>

      <section id="contact" className="chapter finale" data-chapter>
        <div className="final-copy" data-reveal>
          <span>OPEN CHANNEL</span>
          <h2>KN1GHTS</h2>
          <p>Have a challenge, event, or research idea worth pursuing?</p>
          <a className="network-cta magnetic" href="https://www.linkedin.com/company/kn1ghts/" target="_blank" rel="noreferrer" data-cursor="ENTER"><span>START A CONVERSATION</span><b>↗</b></a>
        </div>
        <footer>
          <a href="https://github.com/Kn1ghts-org" target="_blank" rel="noreferrer">GITHUB</a>
          <a href="https://www.linkedin.com/company/kn1ghts/" target="_blank" rel="noreferrer">LINKEDIN</a>
          <a href="#team">THE TEAM</a>
          <span>© 2026 KN1GHTS</span>
        </footer>
      </section>
    </div>
  );
}

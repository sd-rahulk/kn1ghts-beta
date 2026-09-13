import { achievements, team, writeups } from "@/data/content";

function Index({ children }: { children: React.ReactNode }) {
  return <span className="chapter-index">{children}</span>;
}

export function Story() {
  return <div id="story" className="story">
    <section className="chapter hero" data-chapter>
      <div className="hero-type" data-reveal><h1>KN1GHTS.</h1><p className="hero-manifesto">OFFENSE. DEFENSE. RESEARCH.</p></div>
      <p className="hero-copy" data-reveal>Built through competition. Sharpened through failure. Proven under pressure.</p>
      <div className="hero-meta"><span>CTF COLLECTIVE</span><span>EST. 2021</span></div>
    </section>

    <section className="chapter recon" data-chapter>
      <div className="chapter-copy align-left" data-reveal><Index>01 / RECON</Index><h2>EVERY SYSTEM<br />SAYS SOMETHING.</h2><p>You just have to know where to listen.</p></div>
      <div className="telemetry telemetry-a" aria-hidden="true"><span>10.0.4.21</span><b>443 / TLS</b></div>
      <div className="telemetry telemetry-b" aria-hidden="true"><span>172.17.0.3</span><b>22 / SSH</b></div>
      <div className="telemetry telemetry-c" aria-hidden="true"><span>NODE_084</span><b>API / LIVE</b></div>
    </section>

    <section className="chapter analyze" data-chapter>
      <div className="code-rail" aria-hidden="true"><span>0x00401AF8&nbsp;&nbsp; PUSH RBP</span><span>0x00401AFC&nbsp;&nbsp; MOV RBP,RSP</span><span>0x00401B04&nbsp;&nbsp; CALL 0xFF31</span><span>ANOMALY DETECTED</span></div>
      <div className="chapter-copy align-right" data-reveal><Index>02 / ANALYZE</Index><h2>THE SURFACE<br />IS NEVER THE<br />WHOLE STORY.</h2><p>Read the bytes. Trace the branch. Find what the system tried to hide.</p></div>
    </section>

    <section className="chapter exploit" data-chapter>
      <div className="chapter-copy align-left" data-reveal><Index>03 / EXPLOIT</Index><h2>ONE MISTAKE<br />IS ENOUGH.</h2><p>Turn the weakness into access.</p></div>
      <div className="exploit-status"><span>RING 06</span><span>ACCESS GRANTED</span></div>
    </section>

    <section className="chapter proof" data-chapter>
      <div className="flag-readout" data-reveal><span>DECRYPTED CORE</span><strong>FLAG&#123;FOUND&#125;</strong></div>
      <div className="proof-title" data-reveal><Index>04 / PROOF</Index><h2>PROOF,<br />NOT PROMISES.</h2></div>
      <div className="stats">
        <article data-reveal><strong>146</strong><span>CTFS PLAYED</span></article>
        <article data-reveal><strong>2,847</strong><span>FLAGS CAPTURED</span></article>
        <article data-reveal><strong>12</strong><span>GLOBAL PODIUMS</span></article>
      </div>
      <div className="achievement-list">
        {achievements.map((item) => <div key={item.event}><span>{item.year}</span><strong>{item.event}</strong><em>{item.result}</em></div>)}
      </div>
    </section>

    <section className="chapter arsenal" data-chapter>
      <div className="chapter-copy align-center" data-reveal><Index>05 / THE ARSENAL</Index><h2>DIFFERENT PROBLEMS.<br />SAME OBSESSION.</h2></div>
      <div className="disciplines" data-reveal>
        {[["WEB", "Burp · Caido · Nuclei"], ["PWN", "GDB · pwntools · QEMU"], ["REVERSE", "Ghidra · IDA · Frida"], ["CRYPTO", "Sage · Z3 · Pari"]].map(([name, tools], index) => <button key={name} data-cursor="VIEW"><span>0{index + 1}</span><strong>{name}</strong><em>{tools}</em></button>)}
      </div>
    </section>

    <section className="chapter team-chapter" data-chapter>
      <div className="team-intro" data-reveal><Index>06 / OPERATORS</Index><h2>BUILT IN<br />THE ARENA.</h2><p>No spectators. No shortcuts. Only the next problem.</p></div>
      <div className="team-grid">
        {team.map((member, index) => <article className="team-card" key={member.handle} data-cursor="PROFILE" data-reveal>
          <img src={member.image} alt={`${member.handle}, ${member.role}`} />
          <div className="portrait-scan" aria-hidden="true" />
          <span>OPERATOR / 0{index + 1}</span><h3>{member.handle}</h3><p>{member.role}</p><em>{member.spec}</em>
        </article>)}
      </div>
    </section>

    <section className="chapter writeups" data-chapter>
      <div className="writeup-head" data-reveal><Index>07 / WRITEUPS</Index><h2>NOTES FROM<br />THE BREACH.</h2></div>
      <div className="writeup-track-wrap"><div className="writeup-track" data-track>
        {writeups.map((item, index) => <a href="#finale" key={item.title} data-cursor="READ"><span>0{index + 1} / {item.cat}</span><strong>{item.title}</strong><em>{item.diff} · {item.points} PTS</em></a>)}
      </div></div>
    </section>

    <section id="finale" className="chapter finale" data-chapter>
      <div className="final-copy" data-reveal>
        <span>SIGNAL COMPLETE</span><h2>KN1GHTS</h2><p>SEE YOU ON THE SCOREBOARD.</p>
        <a className="network-cta magnetic" href="mailto:signal@kn1ghts.team" data-cursor="ENTER"><span>ENTER THE NETWORK</span><b>↗</b></a>
      </div>
      <footer><a href="#">GITHUB</a><a href="#">CTFTIME</a><a href="#">DISCORD</a><span>© 2026 KN1GHTS</span></footer>
    </section>
  </div>;
}

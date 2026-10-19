// Rising sparks: the reference's exact particle colours, with ember in place of its purple.
const SPARK_COLORS = ["rgba(255, 0, 110, 0.6)", "rgba(0, 217, 255, 0.6)", "rgba(255, 122, 61, 0.6)", "rgba(6, 255, 165, 0.4)"];

// Deterministic pseudo-random values, so the server and browser render identical sparks.
function seeded(index: number, salt: number) {
  const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const sparks = Array.from({ length: 30 }, (_, i) => {
  const size = 2 + seeded(i, 2) * 4;
  const color = SPARK_COLORS[Math.floor(seeded(i, 3) * SPARK_COLORS.length)];
  return {
    left: `${(seeded(i, 1) * 100).toFixed(2)}%`,
    width: `${size.toFixed(2)}px`,
    height: `${size.toFixed(2)}px`,
    backgroundColor: color,
    boxShadow: `0 0 ${(size * 2).toFixed(2)}px ${color}`,
    // Negative delay: each spark starts partway up, so the page opens with sparks already in flight.
    animationDelay: `-${(seeded(i, 4) * 25).toFixed(2)}s`,
    animationDuration: `${(15 + seeded(i, 5) * 10).toFixed(2)}s`,
  };
});

export function Background() {
  return <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
    <div className="absolute inset-0 cyber-grid opacity-30" />
    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-magenta/10 rounded-full blur-3xl animate-pulse" />
    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan/10 rounded-full blur-3xl animate-pulse delay-1000" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-ember/5 rounded-full blur-3xl" />
    {sparks.map((style, i) => <div key={i} className="spark" style={style} />)}
    <div className="absolute inset-0 pointer-events-none opacity-5">
      <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.03) 2px, rgba(255, 255, 255, 0.03) 4px)" }} />
    </div>
  </div>;
}

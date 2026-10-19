export function Background() {
  return <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
    <div className="absolute inset-0 cyber-grid opacity-30" />
    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-vapor-pink/10 rounded-full blur-3xl animate-pulse" />
    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-vapor-cyan/10 rounded-full blur-3xl animate-pulse delay-1000" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-vapor-purple/5 rounded-full blur-3xl" />
    <div className="absolute inset-0 pointer-events-none opacity-5">
      <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.03) 2px, rgba(255, 255, 255, 0.03) 4px)" }} />
    </div>
  </div>;
}

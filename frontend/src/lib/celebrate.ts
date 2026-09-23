export async function celebrate(kind: "task" | "day" = "task") {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (document.documentElement.classList.contains("reduce-motion")) return;

  const { default: confetti } = await import("canvas-confetti");
  const colors = ["#163B50", "#2FAFA3", "#E9A93B", "#F7FBFA"];

  confetti({
    particleCount: kind === "day" ? 72 : 40,
    spread: kind === "day" ? 86 : 58,
    startVelocity: kind === "day" ? 38 : 30,
    ticks: 130,
    gravity: 0.92,
    scalar: 0.86,
    origin: { y: 0.72 },
    colors,
  });

  if (kind === "day") {
    window.setTimeout(() => confetti({ particleCount: 26, angle: 60, spread: 52, origin: { x: 0, y: 0.66 }, colors }), 170);
    window.setTimeout(() => confetti({ particleCount: 26, angle: 120, spread: 52, origin: { x: 1, y: 0.66 }, colors }), 230);
  }
}

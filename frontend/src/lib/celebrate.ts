export async function celebrate(kind: "task" | "day" = "task") {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (document.documentElement.classList.contains("reduce-motion")) return;

  const { default: confetti } = await import("canvas-confetti");
  const colors = ["#163B50", "#2FAFA3", "#E9A93B", "#F7FBFA"];

  confetti({
    particleCount: kind === "day" ? 150 : 85,
    spread: kind === "day" ? 105 : 72,
    startVelocity: kind === "day" ? 48 : 38,
    ticks: 190,
    gravity: 0.92,
    scalar: 0.86,
    origin: { y: 0.72 },
    colors,
  });

  if (kind === "day") {
    window.setTimeout(() => confetti({ particleCount: 70, angle: 60, spread: 62, origin: { x: 0, y: 0.66 }, colors }), 170);
    window.setTimeout(() => confetti({ particleCount: 70, angle: 120, spread: 62, origin: { x: 1, y: 0.66 }, colors }), 230);
  }
}

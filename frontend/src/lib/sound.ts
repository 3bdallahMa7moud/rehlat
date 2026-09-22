export type JourneySound = "toggle" | "start" | "pause" | "success" | "celebration" | "warning";

type Note = {
  frequency: number;
  offset: number;
  duration: number;
  volume: number;
  type?: OscillatorType;
  endFrequency?: number;
};

let audioContext: AudioContext | null = null;

const patterns: Record<JourneySound, Note[]> = {
  toggle: [{ frequency: 520, offset: 0, duration: 0.08, volume: 0.025 }],
  start: [
    { frequency: 330, offset: 0, duration: 0.11, volume: 0.035 },
    { frequency: 494, offset: 0.075, duration: 0.15, volume: 0.04, type: "triangle" },
  ],
  pause: [
    { frequency: 440, offset: 0, duration: 0.1, volume: 0.03 },
    { frequency: 294, offset: 0.07, duration: 0.16, volume: 0.035, type: "triangle" },
  ],
  success: [
    { frequency: 392, offset: 0, duration: 0.12, volume: 0.035 },
    { frequency: 523, offset: 0.08, duration: 0.15, volume: 0.04 },
    { frequency: 659, offset: 0.17, duration: 0.22, volume: 0.045, type: "triangle" },
  ],
  celebration: [
    { frequency: 392, offset: 0, duration: 0.13, volume: 0.035 },
    { frequency: 523, offset: 0.08, duration: 0.16, volume: 0.04, type: "triangle" },
    { frequency: 659, offset: 0.17, duration: 0.2, volume: 0.045, type: "triangle" },
    { frequency: 784, offset: 0.28, duration: 0.34, volume: 0.05 },
    { frequency: 523, offset: 0.3, duration: 0.32, volume: 0.02 },
  ],
  warning: [
    { frequency: 247, offset: 0, duration: 0.13, volume: 0.035, type: "triangle" },
    { frequency: 196, offset: 0.1, duration: 0.18, volume: 0.035, type: "triangle", endFrequency: 185 },
  ],
};

function getAudioContext() {
  if (audioContext?.state === "closed") audioContext = null;
  audioContext ??= new AudioContext({ latencyHint: "interactive" });
  return audioContext;
}

function schedulePattern(context: AudioContext, sound: JourneySound) {
  const startAt = context.currentTime + 0.012;

  patterns[sound].forEach((note) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const noteStart = startAt + note.offset;
    const noteEnd = noteStart + note.duration;

    oscillator.type = note.type ?? "sine";
    oscillator.frequency.setValueAtTime(note.frequency, noteStart);
    if (note.endFrequency) oscillator.frequency.exponentialRampToValueAtTime(note.endFrequency, noteEnd);

    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(note.volume, noteStart + Math.min(0.018, note.duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteEnd + 0.02);
  });
}

export function playJourneySound(sound: JourneySound, enabled = true) {
  if (!enabled || typeof window === undefined) return;

  try {
    const context = getAudioContext();
    if (context.state === "suspended") {
      void context.resume().then(() => schedulePattern(context, sound)).catch(() => undefined);
      return;
    }
    schedulePattern(context, sound);
  } catch {
    // Audio is an enhancement; unsupported or blocked audio must never interrupt an action.
  }
}

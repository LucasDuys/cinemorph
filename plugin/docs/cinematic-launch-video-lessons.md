# Cinematic launch-video lessons

Hard-won principles from shipping the Stacklink 30-second launch video at `C:/dev/stacklink-pitch-roundone/launch-app`. Every item here corresponds to a real bug or wrong-feel iteration we hit; the goal is that the next launch-video output gets these right the first time.

---

## 1. Master clock + phase boundaries

A cinematic 30-second launch video is driven by **one master RAF clock** updating a single `elapsedMs` state value. All scenes read from this clock. Do not give scenes their own timers.

Phases (PHASES table) define the visible content windows. Each phase has its own beat content. Phase boundaries are the only places where SFX whooshes belong (see SFX section).

```ts
export const PHASES = {
  hook:       { id: 'hook',       startMs:     0, endMs:  2500 },
  quote:      { id: 'quote',      startMs:  2500, endMs:  6500 },
  today:      { id: 'today',      startMs:  6500, endMs: 11500 },
  onboarding: { id: 'onboarding', startMs: 11500, endMs: 17000 },
  agents:     { id: 'agents',     startMs: 17000, endMs: 22500 },
  sovereign:  { id: 'sovereign',  startMs: 22500, endMs: 26000 },
  manifesto:  { id: 'manifesto',  startMs: 26000, endMs: 30000 }
} as const;

export const TOTAL_MS = 30000;
export const SMEAR_MS = 350; // cross-fade between phases
```

`SMEAR_MS = 350` produces a soft cross-fade between phases (motion-blur smear cut feel).

## 2. AE Inertial Overshoot (`aeBounce`)

Dan Ebberts' classic After Effects bounce expression ported to TS. Use this for "lands with weight" elements (logo pop, cylinder land, tile bloom).

```ts
export function aeBounce(t: number, freq = 3, decay = 5): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const w = freq * Math.PI * 2;
  const ring = Math.sin(t * w) / Math.exp(decay * t) / w;
  return 1 + 4 * ring;
}
```

Defaults give the iOS-settle feel. Overshoot peaks around `t = 0.2`, settles by `t = 0.6`.

## 3. SFX placement: scene transitions vs internal animation

This was the single most reworked thing in the build. Get this right or every iteration is wasted.

- **Scene transition** = the entire visual context shifts (logo center → search hyper-zoom; camera pulls back from closeup → wide reveal; substrate → onboarding panel; output card → agent constellation). These are the ONLY places that get whoosh SFX.
- **Internal animation event** = something pops or moves within an already-established scene (a pill bounces in, the logo bounces, a tile lands). These get POP / BLIP, not whoosh.

A whoosh on an internal event feels weirdly random because the user's eye doesn't perceive a "cut." A POP on a scene transition feels weak because the visual demands a sweep.

Whooshes lead the visual impact by **300–500ms**. The pre-impact sweep + the new scene's snap reads as one cinematic cut.

## 4. SFX file gotchas

- Free SFX whoosh files often contain **multiple stuttered whooshes back-to-back**. Always run silence-detect before using:
  ```bash
  ffmpeg -i whoosh.mp3 -af "silencedetect=noise=-30dB:duration=0.05" -f null -
  ```
  If you see multiple `silence_start`/`silence_end` pairs inside, trim to a single clean swoosh.
- Files often have **lead-in silence** at the head. For typing audio specifically, schedule the cue **150–200ms BEFORE** the visual starts to mask this.
- Long whoosh files (`whoosh-pull-back` style at 5+ seconds) **always need `stopAtMs`** or they bleed into the next scene.
- Heavy-feeling whooshes have too much sub-bass thump. Filter with a **200Hz high-pass + loudnorm** to broadcast standard:
  ```bash
  ffmpeg -i src.mp3 -af "highpass=f=200,loudnorm=I=-16:TP=-2:LRA=8" -b:a 192k out.mp3
  ```
- Better: trim a short (~600–700ms) self-contained whoosh with built-in fades and **drop `stopAtMs` entirely**. Each cue plays its full natural decay instead of getting hard-cut.

## 5. ffmpeg seek-mode trap (silent output)

When trimming a music bed or SFX, place `-ss` **BEFORE `-i`** (input-seek mode). Putting `-ss` after `-i` (output-seek) interacts badly with the `afade` filter and can produce **silent output** that passes ffprobe duration checks.

```bash
# CORRECT (input-seek)
ffmpeg -y -ss 30 -t 30 -i input.mp3 -af "afade=t=in:st=0:d=0.6,afade=t=out:st=29:d=1.0" -b:a 192k out.mp3

# WRONG (output-seek with afade → can produce silence)
ffmpeg -y -i input.mp3 -ss 30 -t 30 -af "afade=t=in:st=0:d=0.6" -b:a 192k out.mp3
```

Always verify with `ffmpeg -i out.mp3 -af volumedetect -f null -` after trimming. If `mean_volume` is anywhere near `-90 dB`, the cut is silent.

## 6. Audio bus race condition (CRITICAL)

When multiple SFX cues share the same source file via a pooled audio element, the naive `stopAtMs` check re-fires every frame after its trigger time. The first time a later cue restarts the same audio element, the previous cue's pause check trips on `!a.paused` and kills it instantly. This is a hard-to-debug cascade because only the first cue with that src plays.

**Fix:** track stopped cues in a Set. Each cue's stop runs exactly once.

```ts
const playedSfxRef = useRef<Set<number>>(new Set());
const stoppedSfxRef = useRef<Set<number>>(new Set());

useEffect(() => {
  if (!config.sfx) return;
  const pool = sfxPoolRef.current;
  for (let i = 0; i < config.sfx.length; i++) {
    const cue = config.sfx[i]!;
    const a = pool.get(cue.src);
    if (elapsedMs >= cue.atMs && !playedSfxRef.current.has(i)) {
      playedSfxRef.current.add(i);
      if (a) {
        a.currentTime = 0;
        a.volume = cue.volume ?? 0.6;
        a.play().catch(() => {});
      }
    }
    if (
      cue.stopAtMs !== undefined &&
      elapsedMs >= cue.stopAtMs &&
      playedSfxRef.current.has(i) &&
      !stoppedSfxRef.current.has(i)
    ) {
      stoppedSfxRef.current.add(i);
      if (a && !a.paused) {
        a.pause();
        a.currentTime = 0;
      }
    }
  }
}, [elapsedMs, config.sfx]);

// Also clear stoppedSfxRef when the clock rewinds.
```

## 7. Browser autoplay policy

`audio.play()` rejects with no user gesture. Cold reload yields no audio at all unless you handle this.

**Pattern:**
1. Render a transparent canvas-wide click area with a single 64px play icon when `started === false`. No backdrop blur, no copy. Minimal interruption.
2. On click, set `started = true` and unlock. The audio bus should be paused via `paused || !started`.
3. **Pre-warm SFX pool** on first interaction: play+pause each pool element while muted. This satisfies the autoplay policy for the audio elements. Listen on `pointermove`, `click`, `keydown`, `touchstart` with `{ once: true }`.

## 8. Volume hierarchy

Keep the mix predictable by using these volume bands:

| Layer            | Volume     | Notes                                            |
|------------------|------------|--------------------------------------------------|
| Music bed        | 0.20–0.25  | Base. Feels cinematic during silent intro/outro. |
| Ducked music     | 0.05–0.08  | Under VO. Voice always on top.                   |
| VO               | 0.85–0.95  | Lead element across the middle.                  |
| Whoosh (light)   | 0.30–0.40  | Transitions. Perceptible, not focal.             |
| POP (focal)      | 0.70–0.80  | Logo, cylinder, agent first-tile.                |
| BLIP (subtle)    | 0.30–0.45  | Tile-bloom waves. Tapered loudest-first.         |
| Click            | 0.70–0.80  | UI confirmation moments.                         |
| Typing           | 0.85–0.95  | Loud enough to read as "real" keys.              |
| Chime / shimmer  | 0.50–0.55  | Final-note moments (URL reveal).                 |

Music ducks during the VO interval `[2500, 27500]` (or whatever your script timing is). Typical config:

```ts
duckMusicOn: [[2500, 27500]],
duckedVolume: 0.07,
```

## 9. Music bed selection and trim

- Pick a music bed by **vibe match to the product**, not by genre alone. Trap/dark synth for "rage tech infrastructure"; ambient cinematic for emotional weight; minimal corporate for neutral.
- Free-for-commercial sources: **Pixabay Music** (Content License, no attribution), Uppbeat free tier, YouTube Audio Library, FreePD.
- A 30s cut wants a sparse opening (so the logo pop reads), steady mid (under VO), and a satisfying landing.
- Trim with `0.6s fade-in + 1.0s fade-out` so the cold open and tail don't clip.
- **Always volume-detect after the cut** to confirm it isn't silent (the ffmpeg seek-mode trap).
- Probe loudness in 15s windows across the source track first to find the sections with usable energy:
  ```bash
  for start in 0 15 30 45 60; do
    vol=$(ffmpeg -ss $start -t 15 -i src.mp3 -af "volumedetect" -f null - 2>&1 | grep "mean_volume" | awk '{print $5, $6}')
    echo "${start}s -> $vol"
  done
  ```

## 10. Voiceover timing

- VO `startAtMs` is typically 2500ms — let the logo pop breathe in silence first.
- Plain conversational voice, **138 WPM** is the sweet spot (brisk-but-comfortable). 100 WPM if the music is dense.
- Line breaks in the script are real pauses, not commas.
- Pronounce URLs letter-by-letter for spelled-out reads ("dot N L" not "dot null").
- No motivational lift at the end. Final line is the destination, not a callout.

## 11. Animation-event vs SFX-event matching

Audio cues must match what's actually visible. Two recurring traps:

- **Cylinder fill before chunks arrive** — the cylinder fill animation should start when the FIRST chunk reaches it, not when the cylinder itself lands. Trace the chunk flight `startMs + dur` to find first-arrival, anchor the fill waypoint there.
- **Typing audio overshoots the typing visual** — the typing SFX file loops or has a tail. Use `stopAtMs` aligned to the visual end of typing (when the last character lands).

## 12. Dev scrubber

A timeline scrubber bound to `elapsedMs` is essential for iteration. Without it, every "the sound at 7.4s is too loud" requires guessing. The scrubber lets the user jump to any timestamp and reference it precisely.

Activate via a query param like `?dev=1`. Provide:
- Play/pause toggle
- Scrubbable range input
- Live `X.Xs / 30s` readout

Build this into every cinematic-launch scaffold by default.

## 13. Audio config schema

The reference shape that makes all the above work:

```ts
export type AudioConfig = {
  music?: { src: string; baseVolume?: number; loop?: boolean } | null;
  vo?: { src: string; startAtMs?: number; volume?: number } | null;
  duckMusicOn?: Array<[number, number]>;
  duckedVolume?: number;
  sfx?: Array<{ atMs: number; stopAtMs?: number; src: string; volume?: number }>;
};
```

`stopAtMs` is per-cue and runs once (see Section 6).

---

## Summary checklist for the composer

When generating a cinematic launch video, the composer must:

- [ ] Drive everything off ONE master RAF clock writing to `elapsedMs`
- [ ] Define non-overlapping `PHASES` and apply 350ms smear cuts at boundaries
- [ ] Use `aeBounce` for any element that should land with weight
- [ ] Place whooshes ONLY on phase boundaries / scene jumps; never on internal animation
- [ ] Lead whooshes by 300–500ms before the visual impact
- [ ] Bake the audio-bus `stoppedSfxRef` fix into the scaffold (Section 6)
- [ ] Add the autoplay gate + warm-on-interaction pattern (Section 7)
- [ ] Match SFX timing to actual visible motion (cylinder fill = first chunk arrival, typing stop = last character)
- [ ] Verify every audio file's loudness after trim (catch the ffmpeg seek-mode silence trap)
- [ ] Pre-trim long whoosh files to single short sweeps with built-in fades; drop `stopAtMs` where possible
- [ ] Use the volume hierarchy in Section 8
- [ ] Ship a dev scrubber on `?dev=1` so the user can give precise timestamp feedback

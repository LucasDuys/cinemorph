// Top-level deck container. Owns stage state, keyboard nav (incl. backup
// stages per R026), and renders Canvas + Caption + StepIndicator + corner
// controls. Ported from C:/dev/stacklink-pitch-roundone/pitch-app/src/deck/Deck.tsx
// with backup-stage routing added.

import { useCallback, useEffect, useState, useMemo } from 'react';
import { Canvas } from './Canvas';
import { Caption } from './Caption';
import { StepIndicator } from './StepIndicator';
import { STAGES, type StageConfig } from './stages';

type DeckProps = {
  stages?: StageConfig[];
};

export function Deck({ stages: propStages }: DeckProps = {}) {
  const allStages = propStages ?? STAGES;

  // Split main vs backup stages. Main flow is what arrow keys navigate;
  // backup stages are jump-to via number/B (R026.AC1, AC2).
  const { mainStages, backupStages, mainIndices } = useMemo(() => {
    const main: StageConfig[] = [];
    const backup: StageConfig[] = [];
    const mIdx: number[] = [];
    allStages.forEach((s, idx) => {
      if (s.backup) backup.push(s);
      else { main.push(s); mIdx.push(idx); }
    });
    return { mainStages: main, backupStages: backup, mainIndices: mIdx };
  }, [allStages]);

  const [stageIdx, setStageIdx] = useState(0);
  const [returnToMainIdx, setReturnToMainIdx] = useState<number | null>(null);
  const [navQueueLock, setNavQueueLock] = useState(false);

  const stage = stageIdx < mainStages.length
    ? mainStages[stageIdx]
    : backupStages[stageIdx - mainStages.length];

  const onMainStage = stageIdx < mainStages.length;

  // Debounced navigation — queue depth = 1 (R007.AC4).
  const navigate = useCallback((dir: 'next' | 'prev' | 'main' | number) => {
    if (navQueueLock) return;
    setNavQueueLock(true);
    setTimeout(() => setNavQueueLock(false), 250);
    setStageIdx((s) => {
      if (typeof dir === 'number') return Math.max(0, Math.min(allStages.length - 1, dir));
      if (dir === 'main') {
        const target = returnToMainIdx ?? 0;
        setReturnToMainIdx(null);
        return target;
      }
      if (dir === 'next') return s < mainStages.length - 1 ? s + 1 : s;
      return s > 0 ? s - 1 : s;
    });
  }, [allStages.length, mainStages.length, returnToMainIdx, navQueueLock]);

  const jumpToBackup = useCallback((backupOrdinal: number) => {
    if (backupOrdinal < 0 || backupOrdinal >= backupStages.length) return;
    if (onMainStage) setReturnToMainIdx(stageIdx);
    setStageIdx(mainStages.length + backupOrdinal);
  }, [backupStages.length, mainStages.length, onMainStage, stageIdx]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Backup nav keys (R026.AC2)
      if (e.key >= '1' && e.key <= '9') {
        const n = parseInt(e.key, 10) - 1;
        if (n < backupStages.length) {
          e.preventDefault();
          jumpToBackup(n);
          return;
        }
      }
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        if (!onMainStage) navigate('main');
        else if (backupStages.length > 0) jumpToBackup(0);
        return;
      }
      if (e.key === 'Escape') {
        if (!onMainStage) {
          e.preventDefault();
          navigate('main');
          return;
        }
        if (document.fullscreenElement) {
          e.preventDefault();
          document.exitFullscreen();
        }
        return;
      }
      // Main nav (R007.AC1)
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        if (!onMainStage) return; // arrow keys only navigate main flow
        e.preventDefault();
        navigate('next');
      } else if (e.key === 'ArrowLeft') {
        if (!onMainStage) return;
        e.preventDefault();
        navigate('prev');
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        navigate(0);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, jumpToBackup, onMainStage, backupStages.length]);

  // Swallow browser back/forward on hashchange (R007.AC5)
  useEffect(() => {
    const onHash = (e: HashChangeEvent) => { e.preventDefault?.(); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (!stage) return null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background text-foreground">
      <Canvas stage={stage} />
      <Caption stage={stage} />

      {!onMainStage && (
        <div className="pointer-events-none fixed top-4 left-1/2 z-30 -translate-x-1/2 rounded-full border border-border bg-surface-raised/80 px-4 py-1 font-mono text-xs uppercase tracking-widest text-muted-foreground backdrop-blur-sm">
          Backup · press Esc or B to return
        </div>
      )}

      {onMainStage && stageIdx > 0 && (
        <button
          onClick={() => navigate('prev')}
          className="fixed bottom-8 left-8 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-raised text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Previous slide"
        >
          <ChevronLeft />
        </button>
      )}

      {onMainStage && stageIdx < mainStages.length - 1 && (
        <button
          onClick={() => navigate('next')}
          className="fixed bottom-8 right-8 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-raised text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Next slide"
        >
          <ChevronRight />
        </button>
      )}

      <StepIndicator
        current={onMainStage ? stageIdx : (returnToMainIdx ?? 0)}
        total={mainStages.length}
        onNavigate={(i) => navigate(mainIndices[i] ?? i)}
      />
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

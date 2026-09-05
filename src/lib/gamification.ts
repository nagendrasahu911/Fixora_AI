/**
 * Gamified coding system: XP, daily streak and badges, stored in localStorage.
 * Rewards user effort more than AI auto-fixes.
 */
import { useCallback, useEffect, useState } from "react";

export type GameState = {
  xp: number;
  streak: number;
  lastActiveDate: string;
  badges: string[];
  manualFixes: number;
  runs: number;
};

export type XpAction = "manual-fix" | "run" | "explanation" | "auto-fix";

const KEY = "fixora.gamification.v1";

export const XP_VALUES: Record<XpAction, number> = {
  "manual-fix": 10,
  run: 5,
  explanation: 3,
  "auto-fix": 1,
};

export const XP_LABELS: Record<XpAction, string> = {
  "manual-fix": "Manual fix",
  run: "Successful run",
  explanation: "Read explanation",
  "auto-fix": "AI auto fix",
};

export const BADGES: { name: string; hint: string; earned: (s: GameState) => boolean }[] = [
  { name: "Beginner", hint: "Earn 20 XP", earned: (s) => s.xp >= 20 },
  { name: "Bug Fixer", hint: "Fix 3 bugs yourself", earned: (s) => s.manualFixes >= 3 },
  { name: "Independent Coder", hint: "Reach 100 XP", earned: (s) => s.xp >= 100 },
  { name: "Streak Master", hint: "Code 5 days in a row", earned: (s) => s.streak >= 5 },
  { name: "Marathon", hint: "Run code 25 times", earned: (s) => s.runs >= 25 },
];

const EMPTY: GameState = {
  xp: 0,
  streak: 0,
  lastActiveDate: "",
  badges: [],
  manualFixes: 0,
  runs: 0,
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  const d = (Date.parse(b) - Date.parse(a)) / 86_400_000;
  return Number.isFinite(d) ? Math.round(d) : Infinity;
}

export function loadGame(): GameState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<GameState>) };
  } catch {
    return EMPTY;
  }
}

function persist(state: GameState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
  return state;
}

export function touchStreak(state: GameState): GameState {
  const d = today();
  if (state.lastActiveDate === d) return state;
  const gap = state.lastActiveDate ? daysBetween(state.lastActiveDate, d) : Infinity;
  return { ...state, lastActiveDate: d, streak: gap === 1 ? state.streak + 1 : 1 };
}

export function levelOf(xp: number) {
  const level = Math.floor(xp / 50) + 1;
  const into = xp % 50;
  return { level, into, next: 50, percent: (into / 50) * 100 };
}

export function awardXp(action: XpAction, multiplier = 1) {
  let next = touchStreak(loadGame());
  next = { ...next, xp: next.xp + Math.round(XP_VALUES[action] * multiplier) };
  if (action === "manual-fix") next.manualFixes += 1;
  if (action === "run") next.runs += 1;

  const unlocked = BADGES.filter((b) => b.earned(next) && !next.badges.includes(b.name)).map(
    (b) => b.name,
  );
  if (unlocked.length) next = { ...next, badges: [...next.badges, ...unlocked] };
  persist(next);
  return { state: next, unlocked, gained: Math.round(XP_VALUES[action] * multiplier) };
}

export function useGamification() {
  const [state, setState] = useState<GameState>(EMPTY);

  useEffect(() => {
    setState(persist(touchStreak(loadGame())));
  }, []);

  const award = useCallback((action: XpAction, multiplier = 1) => {
    const res = awardXp(action, multiplier);
    setState(res.state);
    return res;
  }, []);

  return { state, award };
}

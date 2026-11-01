/** One timeline shared by combat and the procedural sword rig (seconds/radians). */
export const BASIC_ATTACK = {
  duration: 0.36,
  cooldown: 0.38,
  windup: 0.075,
  activeEnd: 0.195,
  halfArc: Math.acos(0.1),
  reach: 125,
  damage: 25,
} as const;
export const smooth = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * x * (x * (x * 6 - 15) + 10); };
export function attackPose(elapsed: number) {
  const a = BASIC_ATTACK;
  if (elapsed < a.windup) {
    const t = smooth(elapsed / a.windup);
    return { angle: -0.25 - (a.halfArc - 0.25) * t, twist: -t * 0.32, extension: 1 - t * 0.15, weight: t, phase: 'windup' as const };
  }
  if (elapsed < a.activeEnd) {
    const t = smooth((elapsed - a.windup) / (a.activeEnd - a.windup));
    return { angle: -a.halfArc + a.halfArc * 2 * t, twist: -0.32 + t * 0.7, extension: 0.85 + Math.sin(t * Math.PI) ** 2 * 0.15, weight: 1, phase: 'active' as const };
  }
  const t = smooth((elapsed - a.activeEnd) / (a.duration - a.activeEnd));
  return { angle: a.halfArc + (-0.25 - a.halfArc) * t, twist: 0.38 * (1 - t), extension: 0.85 + 0.15 * t, weight: 1 - t, phase: 'recovery' as const };
}
/** Inclusive swept sector prevents tunneling between fixed updates. */
export function crossesTarget(previousElapsed: number, elapsed: number, relativeAngle: number) {
  const a = BASIC_ATTACK;
  if (elapsed < a.windup || previousElapsed > a.activeEnd) return false;
  const from = attackPose(Math.max(a.windup, previousElapsed)).angle;
  const to = attackPose(Math.min(a.activeEnd, elapsed)).angle;
  const angle = Math.atan2(Math.sin(relativeAngle), Math.cos(relativeAngle));
  return Math.abs(angle) <= a.halfArc && angle >= from - 0.08 && angle <= to + 0.08;
}

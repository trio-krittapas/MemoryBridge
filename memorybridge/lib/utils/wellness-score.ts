/**
 * Wellness Score Algorithm for MemoryBridge
 * 
 * Weights:
 * - Speech Stability (Rate/Pause): 30%
 * - Exercise Accuracy (Naming/Fluency): 30%
 * - Memory Recall Rate (Recall Task): 20%
 * - Interaction Frequency (Chat volume): 20%
 */

export interface WellnessMetrics {
  speechStability: number; // 0-100
  exerciseAccuracy: number; // 0-100
  recallRate: number; // 0-100
  interactionFrequency: number; // 0-100
}

export function calculateWellnessScore(metrics: WellnessMetrics): number {
  const score = (
    (metrics.speechStability * 0.3) +
    (metrics.exerciseAccuracy * 0.3) +
    (metrics.recallRate * 0.2) +
    (metrics.interactionFrequency * 0.2)
  );
  
  return Math.round(score);
}

export function getScoreColor(score: number): string {
  if (score >= 70) return '#10b981'; // Emerald 500 (Green)
  if (score >= 40) return '#f59e0b'; // Amber 500 (Yellow)
  return '#ef4444'; // Red 500 (Red)
}

export function getScoreLabel(score: number): string {
  if (score >= 70) return 'Stable';
  if (score >= 40) return 'Monitor';
  return 'Declining';
}

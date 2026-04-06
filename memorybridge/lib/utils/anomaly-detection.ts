/**
 * Z-score Based Anomaly Detection for MemoryBridge
 * 
 * Compares current score against a rolling window of historical scores.
 */

export interface ScoreData {
  value: number;
  date: string;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  severity: 'GREEN' | 'AMBER' | 'RED';
  message: string;
}

export function detectAnomaly(currentValue: number, historicalScores: number[]): AnomalyResult {
  if (historicalScores.length < 5) {
    return { isAnomaly: false, severity: 'GREEN', message: 'Not enough data to calculate baseline.' };
  }

  const n = historicalScores.length;
  const mean = historicalScores.reduce((a, b) => a + b, 0) / n;
  const variance = historicalScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return { isAnomaly: false, severity: 'GREEN', message: 'Perfectly stable performance.' };
  }

  const zScore = (currentValue - mean) / stdDev;

  if (zScore <= -2.5) {
    return { isAnomaly: true, severity: 'RED', message: 'Significant decline detected. Recommend immediate check-up.' };
  } else if (zScore <= -1.5) {
    return { isAnomaly: true, severity: 'AMBER', message: 'Notable drop in performance. Monitor closely over the next 48 hours.' };
  }

  return { isAnomaly: false, severity: 'GREEN', message: 'Performance is within normal baseline range.' };
}

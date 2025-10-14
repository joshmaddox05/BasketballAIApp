// shotAnalysisMapper.js - Transform comprehensive analysis to HS/College friendly UI model
// Implements progressive disclosure with plain language and motivational feedback

/**
 * Metric weights for overall scoring
 * Based on performance impact and injury safety
 */
const METRIC_WEIGHTS = {
  release_angle: 0.30,      // 30% - Most important for accuracy
  release_timing: 0.25,     // 25% - Power transfer and consistency
  elbow_flare: 0.20,        // 20% - Shot path accuracy
  knee_load: 0.15,          // 15% - Power generation
  lateral_sway: 0.10        // 10% - Balance and control
};

/**
 * Target bands for each metric (optimal ranges)
 */
const TARGET_BANDS = {
  release_angle_deg: { min: 55, max: 62, sigma: 3.5 },
  elbow_flare_deg: { min: 0, max: 10, sigma: 5 },
  knee_load_deg: { min: 45, max: 65, sigma: 8 },
  time_load_to_release_ms: { min: 240, max: 320, sigma: 40 },
  lateral_sway_cm: { min: 0, max: 3, sigma: 2 },
  base_width_ratio: { min: 0.18, max: 0.28, sigma: 0.05 }
};

/**
 * Verdict templates based on score ranges
 */
const VERDICTS = {
  mastery: { min: 90, text: "Pure stroke. Keep stacking reps." },
  game_ready: { min: 80, text: "Game-ready form. Small tweaks left." },
  solid_base: { min: 70, text: "Solid base. Fix timing for lift." },
  getting_there: { min: 60, text: "Good start. Focus on elbow + release." },
  rebuild: { min: 0, text: "Let's rebuild from the base up." }
};

/**
 * Drill library mapped to metrics
 */
const DRILL_LIBRARY = {
  'rhythm-1-motion': {
    name: '1-Motion Rhythm',
    duration: '2-3 min',
    description: 'Practice smooth transition from load to release'
  },
  'wall-elbow-slides': {
    name: 'Wall Elbow Slides',
    duration: '1-2 min',
    description: 'Keep elbow aligned by sliding hand up wall'
  },
  'stick-landings': {
    name: 'Stick Landings',
    duration: '2 min',
    description: 'Land balanced in same spot as takeoff'
  },
  'load-depth-drill': {
    name: 'Load Depth Practice',
    duration: '2 min',
    description: 'Practice consistent knee bend at 45-65°'
  },
  'arc-shooting': {
    name: 'High Arc Shots',
    duration: '3 min',
    description: 'Shoot over obstacle for optimal arc'
  },
  'balance-base': {
    name: 'Balance Base',
    duration: '2 min',
    description: 'Practice shooting from stable shoulder-width stance'
  }
};

/**
 * Compute z-score (standard deviations from target)
 */
function computeZScore(metricKey, value) {
  const band = TARGET_BANDS[metricKey];
  if (!band) return 0;
  
  const target = (band.min + band.max) / 2;
  const deviation = Math.abs(value - target);
  
  // If within band, z-score is 0 (perfect)
  if (value >= band.min && value <= band.max) {
    return 0;
  }
  
  // Otherwise compute how many standard deviations away
  return deviation / band.sigma;
}

/**
 * Convert z-score to letter grade
 */
function zScoreToGrade(zScore) {
  if (zScore < 0.5) return 'A';
  if (zScore < 1.5) return 'B';
  if (zScore < 2.5) return 'C';
  return 'D';
}

/**
 * Get grade color
 */
function getGradeColor(grade) {
  switch(grade) {
    case 'A': return '#10B981'; // Green
    case 'B': return '#3B82F6'; // Blue
    case 'C': return '#F59E0B'; // Amber
    case 'D': return '#EF4444'; // Red
    default: return '#6B7280'; // Gray
  }
}

/**
 * Compute overall score from metrics (0-100)
 */
function computeOverallScore(metrics) {
  let score = 100;
  
  // Release angle (30%)
  if (metrics.release_angle_deg) {
    const z = computeZScore('release_angle_deg', metrics.release_angle_deg);
    score -= METRIC_WEIGHTS.release_angle * Math.min(z * 15, 30);
  }
  
  // Release timing (25%)
  if (metrics.time_load_to_release_ms) {
    const z = computeZScore('time_load_to_release_ms', metrics.time_load_to_release_ms);
    score -= METRIC_WEIGHTS.release_timing * Math.min(z * 15, 25);
  }
  
  // Elbow flare (20%)
  if (metrics.elbow_flare_deg) {
    const z = computeZScore('elbow_flare_deg', metrics.elbow_flare_deg);
    score -= METRIC_WEIGHTS.elbow_flare * Math.min(z * 15, 20);
  }
  
  // Knee load (15%)
  if (metrics.knee_load_deg) {
    const z = computeZScore('knee_load_deg', metrics.knee_load_deg);
    score -= METRIC_WEIGHTS.knee_load * Math.min(z * 15, 15);
  }
  
  // Lateral sway (10%)
  if (metrics.lateral_sway_cm) {
    const z = computeZScore('lateral_sway_cm', metrics.lateral_sway_cm);
    score -= METRIC_WEIGHTS.lateral_sway * Math.min(z * 15, 10);
  }
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Pick verdict based on score
 */
function pickVerdict(score) {
  if (score >= VERDICTS.mastery.min) return VERDICTS.mastery.text;
  if (score >= VERDICTS.game_ready.min) return VERDICTS.game_ready.text;
  if (score >= VERDICTS.solid_base.min) return VERDICTS.solid_base.text;
  if (score >= VERDICTS.getting_there.min) return VERDICTS.getting_there.text;
  return VERDICTS.rebuild.text;
}

/**
 * Map confidence score to label
 */
function mapConfidence(confidenceScore) {
  if (confidenceScore >= 0.8) return 'High';
  if (confidenceScore >= 0.6) return 'Medium';
  return 'Low';
}

/**
 * Build highlight chips (Base, Release, Control)
 */
function buildHighlights(metrics) {
  const highlights = [];
  
  // Base (feet/knees/hips alignment)
  const baseMetrics = [
    metrics.knee_load_deg ? computeZScore('knee_load_deg', metrics.knee_load_deg) : null,
    metrics.base_width_ratio ? computeZScore('base_width_ratio', metrics.base_width_ratio) : null,
    metrics.hip_shoulder_alignment_deg || 0
  ].filter(v => v !== null);
  
  const baseAvgZ = baseMetrics.reduce((a, b) => a + b, 0) / Math.max(baseMetrics.length, 1);
  highlights.push({
    label: 'Base',
    emoji: '🦵',
    status: baseAvgZ < 0.5 ? 'good' : baseAvgZ < 1.5 ? 'ok' : 'needs work'
  });
  
  // Release (angle & timing)
  const releaseMetrics = [
    metrics.release_angle_deg ? computeZScore('release_angle_deg', metrics.release_angle_deg) : null,
    metrics.time_load_to_release_ms ? computeZScore('time_load_to_release_ms', metrics.time_load_to_release_ms) : null
  ].filter(v => v !== null);
  
  const releaseAvgZ = releaseMetrics.reduce((a, b) => a + b, 0) / Math.max(releaseMetrics.length, 1);
  highlights.push({
    label: 'Release',
    emoji: '🏀',
    status: releaseAvgZ < 0.5 ? 'good' : releaseAvgZ < 1.5 ? 'ok' : 'needs work'
  });
  
  // Control (lateral sway/consistency)
  const controlZ = metrics.lateral_sway_cm ? computeZScore('lateral_sway_cm', metrics.lateral_sway_cm) : 0;
  highlights.push({
    label: 'Control',
    emoji: '🎯',
    status: controlZ < 0.5 ? 'good' : controlZ < 1.5 ? 'ok' : 'needs work'
  });
  
  return highlights;
}

/**
 * Derive achievement badges
 */
function deriveBadges(metrics, history = []) {
  const badges = [];
  
  // Quick Trigger badge
  if (metrics.time_load_to_release_ms <= 300) {
    badges.push({
      id: 'quick-trigger',
      name: 'Quick Trigger',
      emoji: '⚡',
      description: 'Lightning-fast release'
    });
  }
  
  // Pure Arc badge
  const releaseAngle = metrics.release_angle_deg;
  if (releaseAngle >= 55 && releaseAngle <= 62) {
    // Check history for consistency (2+ sessions)
    const consistentArc = history.filter(h => 
      h.metrics?.release_angle_deg >= 55 && h.metrics?.release_angle_deg <= 62
    ).length >= 1; // Count current + history
    
    if (consistentArc) {
      badges.push({
        id: 'pure-arc',
        name: 'Pure Arc',
        emoji: '🌈',
        description: 'Optimal shot trajectory'
      });
    }
  }
  
  // Rock Solid Base badge
  if (metrics.lateral_sway_cm <= 3 && 
      metrics.base_width_ratio >= 0.18 && 
      metrics.base_width_ratio <= 0.28) {
    badges.push({
      id: 'rock-solid',
      name: 'Rock Solid',
      emoji: '🗿',
      description: 'Perfect balance and base'
    });
  }
  
  return badges;
}

/**
 * Convert metrics to MetricCard models
 */
function toMetricCards(metrics, cues = []) {
  const cards = [];
  
  // Release Angle
  if (metrics.release_angle_deg !== undefined) {
    const z = computeZScore('release_angle_deg', metrics.release_angle_deg);
    const grade = zScoreToGrade(z);
    const band = TARGET_BANDS.release_angle_deg;
    const cue = cues.find(c => {
      const cueText = (c.cue || c.title || c.description || '').toLowerCase();
      return cueText.includes('arc') || cueText.includes('angle');
    });
    
    cards.push({
      id: 'release_angle',
      label: 'Shot Arc',
      value: Math.round(metrics.release_angle_deg),
      units: '°',
      target: `${band.min}-${band.max}°`,
      grade,
      gradeColor: getGradeColor(grade),
      delta: metrics.release_angle_deg - (band.min + band.max) / 2,
      why: 'Higher arc = better angle into basket',
      drill: cue?.drill_id || 'arc-shooting',
      status: grade === 'A' ? 'good' : grade === 'D' ? 'needs work' : 'ok'
    });
  }
  
  // Release Timing
  if (metrics.time_load_to_release_ms !== undefined) {
    const z = computeZScore('time_load_to_release_ms', metrics.time_load_to_release_ms);
    const grade = zScoreToGrade(z);
    const band = TARGET_BANDS.time_load_to_release_ms;
    const cue = cues.find(c => {
      const cueText = (c.cue || c.title || c.description || '').toLowerCase();
      return cueText.includes('earlier') || cueText.includes('timing');
    });
    
    cards.push({
      id: 'release_timing',
      label: 'Release Speed',
      value: Math.round(metrics.time_load_to_release_ms),
      units: 'ms',
      target: `${band.min}-${band.max}ms`,
      grade,
      gradeColor: getGradeColor(grade),
      delta: metrics.time_load_to_release_ms - (band.min + band.max) / 2,
      why: 'Quicker release = more power transfer',
      drill: cue?.drill_id || 'rhythm-1-motion',
      status: grade === 'A' ? 'good' : grade === 'D' ? 'needs work' : 'ok'
    });
  }
  
  // Elbow Flare
  if (metrics.elbow_flare_deg !== undefined) {
    const z = computeZScore('elbow_flare_deg', metrics.elbow_flare_deg);
    const grade = zScoreToGrade(z);
    const band = TARGET_BANDS.elbow_flare_deg;
    const cue = cues.find(c => {
      const cueText = (c.cue || c.title || c.description || '').toLowerCase();
      return cueText.includes('elbow') || cueText.includes('tuck');
    });
    
    cards.push({
      id: 'elbow_flare',
      label: 'Elbow Alignment',
      value: Math.round(metrics.elbow_flare_deg),
      units: '°',
      target: `<${band.max}°`,
      grade,
      gradeColor: getGradeColor(grade),
      delta: metrics.elbow_flare_deg - band.max,
      why: 'Tucked elbow = straighter shot path',
      drill: cue?.drill_id || 'wall-elbow-slides',
      status: grade === 'A' ? 'good' : grade === 'D' ? 'needs work' : 'ok'
    });
  }
  
  // Knee Load
  if (metrics.knee_load_deg !== undefined) {
    const z = computeZScore('knee_load_deg', metrics.knee_load_deg);
    const grade = zScoreToGrade(z);
    const band = TARGET_BANDS.knee_load_deg;
    const cue = cues.find(c => {
      const cueText = (c.cue || c.title || c.description || '').toLowerCase();
      return cueText.includes('knee') || cueText.includes('load');
    });
    
    cards.push({
      id: 'knee_load',
      label: 'Power Load',
      value: Math.round(metrics.knee_load_deg),
      units: '°',
      target: `${band.min}-${band.max}°`,
      grade,
      gradeColor: getGradeColor(grade),
      delta: metrics.knee_load_deg - (band.min + band.max) / 2,
      why: 'Deeper load = more leg power',
      drill: cue?.drill_id || 'load-depth-drill',
      status: grade === 'A' ? 'good' : grade === 'D' ? 'needs work' : 'ok'
    });
  }
  
  // Lateral Sway
  if (metrics.lateral_sway_cm !== undefined) {
    const z = computeZScore('lateral_sway_cm', metrics.lateral_sway_cm);
    const grade = zScoreToGrade(z);
    const band = TARGET_BANDS.lateral_sway_cm;
    const cue = cues.find(c => {
      const cueText = (c.cue || c.title || c.description || '').toLowerCase();
      return cueText.includes('balance') || cueText.includes('stabilize');
    });
    
    cards.push({
      id: 'lateral_sway',
      label: 'Balance Control',
      value: metrics.lateral_sway_cm.toFixed(1),
      units: 'cm',
      target: `<${band.max}cm`,
      grade,
      gradeColor: getGradeColor(grade),
      delta: metrics.lateral_sway_cm - band.max,
      why: 'Less sway = more consistent shots',
      drill: cue?.drill_id || 'stick-landings',
      status: grade === 'A' ? 'good' : grade === 'D' ? 'needs work' : 'ok'
    });
  }
  
  return cards;
}

/**
 * Format cues to be HS/College friendly (max 8 words)
 */
function formatCues(cues) {
  return cues.map(cue => {
    // Handle different data structures
    let cueText = cue.cue || cue.title || cue.description || '';
    let drillId = cue.drill_id || cue.drill || '';
    
    // Safely process the cue text
    let shortCue = '';
    if (cueText) {
      shortCue = cueText.split('.')[0].split(',')[0].substring(0, 50); // First sentence, max 50 chars
    }
    
    return {
      ...cue,
      shortCue: shortCue,
      drill: DRILL_LIBRARY[drillId] || null,
      priority: cue.priority || 1,
      why: cue.why || cue.description || ''
    };
  });
}

/**
 * Main mapper: Transform API response to UI model
 * @param {Object} apiResponse - Raw API response from comprehensive analysis
 * @param {Array} history - Previous analysis sessions for badges
 * @returns {Object} UI-ready model with progressive disclosure
 */
export function mapAnalysisToUI(apiResponse, history = []) {
  // Extract metrics (handle both snake_case from API and camelCase)
  const metrics = {
    release_angle_deg: apiResponse.metrics?.release_angle_deg || 
                       apiResponse.metrics?.find(m => m.id === 'release_angle')?.value,
    elbow_flare_deg: apiResponse.metrics?.elbow_flare_deg ||
                     apiResponse.metrics?.find(m => m.id === 'elbow_flare')?.value,
    knee_load_deg: apiResponse.metrics?.knee_load_deg ||
                   apiResponse.metrics?.find(m => m.id === 'knee_flexion')?.value,
    time_load_to_release_ms: apiResponse.metrics?.time_load_to_release_ms || 300,
    lateral_sway_cm: apiResponse.metrics?.lateral_sway_cm ||
                     apiResponse.metrics?.find(m => m.id === 'lateral_sway')?.value,
    base_width_ratio: apiResponse.metrics?.base_width_ratio ||
                      apiResponse.metrics?.find(m => m.id === 'stance_width')?.value,
    hip_shoulder_alignment_deg: apiResponse.metrics?.hip_shoulder_alignment_deg ||
                                apiResponse.metrics?.find(m => m.id === 'hip_shoulder_alignment')?.value
  };
  
  // Compute overall score
  const score = apiResponse.overallScore || computeOverallScore(metrics);
  
  // Get verdict
  const verdict = pickVerdict(score);
  
  // Map confidence
  const confidence = mapConfidence(apiResponse.confidence || 0.85);
  
  // Format cues (top 3)
  const cues = apiResponse.coachingCues || apiResponse.cues || [];
  const topCues = formatCues(cues.slice(0, 3));
  
  // Build highlights
  const highlights = buildHighlights(metrics);
  
  // Derive badges
  const badges = deriveBadges(metrics, history);
  
  // Convert to metric cards
  const metricCards = toMetricCards(metrics, cues);
  
  // Build replay data
  const replay = {
    videoUrl: apiResponse.videoUrl,
    phases: apiResponse.phases || {},
    ghostRef: apiResponse.archetype_match?.ref_player || apiResponse.baselineComparison?.player
  };
  
  return {
    score,
    verdict,
    confidence,
    topCues,
    badges,
    highlights,
    metrics: metricCards,
    replay,
    warnings: apiResponse.warnings || [],
    sessionId: apiResponse.session_id || apiResponse.videoId,
    timestamp: apiResponse.analyzed_at || apiResponse.timestamp || new Date().toISOString()
  };
}

/**
 * Get drill details by ID
 */
export function getDrillDetails(drillId) {
  return DRILL_LIBRARY[drillId] || null;
}

/**
 * Get score color based on value
 */
export function getScoreColor(score) {
  if (score >= 80) return '#10B981'; // Green
  if (score >= 60) return '#F59E0B'; // Amber
  return '#EF4444'; // Red
}

/**
 * Get confidence tip for low confidence
 */
export function getConfidenceTip(confidence, warnings = []) {
  if (confidence === 'Low') {
    if (warnings.includes('lighting')) {
      return 'Re-record with brighter light and full body in frame.';
    }
    if (warnings.includes('framing')) {
      return 'Step back 1-2 feet so full body is visible.';
    }
    return 'Re-record with better lighting and clearer view.';
  }
  return null;
}

export default {
  mapAnalysisToUI,
  getDrillDetails,
  getScoreColor,
  getConfidenceTip,
  VERDICTS,
  TARGET_BANDS
};

// Telemetry and Mathematical Fuel Estimation Physics Utilities

/**
 * Calculates distance in kilometers between two GPS coordinates using Haversine formula
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Computes heading in degrees (0 = North, 90 = East, 180 = South, 270 = West)
 */
export function calculateHeading(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Relative Fuel Consumption Model:
 * Uses vehicle nominal rate (e.g. 10 L/100km) and applies real-time telematics adjustments:
 * - Speed efficiency curve (optimal efficiency at 60-80 km/h; higher aerodynamic drag >80km/h; stop & go penalty <25km/h)
 * - Acceleration inertial penalty (G-force acceleration burns fuel)
 * - Idling engine consumption (~0.8 to 1.2 Liters/hour when speed == 0 with engine running)
 */
export function calculateInstantFuelRate(
  speedKmH: number,
  accelG: number,
  nominalLPer100Km: number = 10.0,
  isIdling: boolean = false
): {
  lPer100Km: number;
  litersPerHour: number;
} {
  if (isIdling || speedKmH < 1.5) {
    // Engine running while stationary: ~0.9 L/hour
    const idleBurnPerHour = nominalLPer100Km * 0.09; // ~0.9 L/h for 10L/100km vehicle
    return {
      lPer100Km: 0,
      litersPerHour: Number(idleBurnPerHour.toFixed(2)),
    };
  }

  // Speed efficiency multiplier
  let speedFactor = 1.0;
  if (speedKmH <= 25) {
    // Urban stop-and-go low gear inefficiency
    speedFactor = 1.4 - (speedKmH / 25) * 0.3; // 1.4 down to 1.1
  } else if (speedKmH <= 75) {
    // Sweet spot: 50-75 km/h optimal cruise gear
    speedFactor = 0.85 + Math.abs(speedKmH - 65) * 0.005;
  } else if (speedKmH <= 100) {
    // Highway drag starts increasing quadratically
    speedFactor = 1.0 + ((speedKmH - 75) / 25) * 0.35; // 1.0 to 1.35
  } else {
    // High speed severe aerodynamic drag
    speedFactor = 1.35 + ((speedKmH - 100) / 30) * 0.55;
  }

  // Acceleration penalty: hard acceleration (accelG > 0.15G) injects extra fuel
  let accelFactor = 1.0;
  if (accelG > 0.05) {
    accelFactor += Math.min(accelG * 2.2, 1.8);
  }

  const effectiveLPer100Km = nominalLPer100Km * speedFactor * accelFactor;
  const litersPerHour = (effectiveLPer100Km * speedKmH) / 100;

  return {
    lPer100Km: Number(effectiveLPer100Km.toFixed(2)),
    litersPerHour: Number(litersPerHour.toFixed(2)),
  };
}

/**
 * Calculates updated Eco-Driving Score (0 to 100)
 * Evaluates harsh events, speeding, and idle ratio
 */
export function calculateEcoScore(params: {
  suddenBrakings: number;
  suddenAccels: number;
  speedingCount: number;
  totalDistanceKm: number;
  idleMinutes: number;
  totalMinutes: number;
}): number {
  const { suddenBrakings, suddenAccels, speedingCount, totalDistanceKm, idleMinutes, totalMinutes } = params;
  
  let score = 100;

  // Rate of harsh events per 10 km
  const kmChunk = Math.max(totalDistanceKm / 10, 1);
  const harshBrakingRate = suddenBrakings / kmChunk;
  const harshAccelRate = suddenAccels / kmChunk;
  const speedingRate = speedingCount / kmChunk;

  score -= harshBrakingRate * 8;
  score -= harshAccelRate * 7;
  score -= speedingRate * 10;

  // Idling penalty if idling takes more than 20% of route time
  if (totalMinutes > 10) {
    const idleRatio = idleMinutes / totalMinutes;
    if (idleRatio > 0.25) {
      score -= (idleRatio - 0.25) * 40;
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number, decimals: number = 1): string {
  return num.toLocaleString('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

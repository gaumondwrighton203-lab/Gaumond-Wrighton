import { MeterReading, TariffConfig } from '../types';

export interface CalculatedReading {
  reading: MeterReading;
  prevReading: MeterReading | null;
  coldDiff: number;
  hotDiff: number;
  wastewaterDiff: number;
  elecDiff: number; // Peak T1 or Single Rate
  elecHalfPeakDiff: number; // Half-peak T2
  elecNightDiff: number; // Night T3
  elecTotalDiff?: number; // General electricity meter difference
  coldCost: number;
  hotCost: number;
  wastewaterCost: number;
  elecCost: number; // Peak T1 or Single Rate cost
  elecHalfPeakCost: number; // Half-peak T2 cost
  elecNightCost: number; // Night T3 cost
  totalCost: number;
}

/**
 * Sorts readings chronologically and computes consumption differences and costs.
 */
export function calculateReadings(
  readings: MeterReading[],
  tariffs: TariffConfig
): CalculatedReading[] {
  // Sort readings by date ascending
  const sorted = [...readings].sort((a, b) => a.date.localeCompare(b.date));

  return sorted.map((reading, index) => {
    const prevReading = index > 0 ? sorted[index - 1] : null;

    let coldDiff = 0;
    let hotDiff = 0;
    let elecDiff = 0;
    let elecHalfPeakDiff = 0;
    let elecNightDiff = 0;
    let elecTotalDiff = 0;

    if (prevReading) {
      // Consumption is the difference between current and previous indices.
      // Guard against negative values in case of typos, default to 0.
      coldDiff = Math.max(0, reading.coldWater - prevReading.coldWater);
      hotDiff = Math.max(0, reading.hotWater - prevReading.hotWater);
      elecDiff = Math.max(0, reading.electricity - prevReading.electricity);

      const hasDoubleOrTriple = tariffs.electricityTariffType === 'double' || tariffs.electricityTariffType === 'triple';
      const hasTriple = tariffs.electricityTariffType === 'triple';

      if (hasDoubleOrTriple && reading.electricityNight !== undefined && prevReading.electricityNight !== undefined) {
        elecNightDiff = Math.max(0, reading.electricityNight - prevReading.electricityNight);
      }

      if (hasTriple && reading.electricityHalfPeak !== undefined && prevReading.electricityHalfPeak !== undefined) {
        elecHalfPeakDiff = Math.max(0, reading.electricityHalfPeak - prevReading.electricityHalfPeak);
      }

      if (reading.electricityTotal !== undefined && prevReading.electricityTotal !== undefined) {
        elecTotalDiff = Math.max(0, reading.electricityTotal - prevReading.electricityTotal);
      }
    }

    const wastewaterDiff = coldDiff + hotDiff;
    const wastewaterCost = wastewaterDiff * (tariffs.wastewaterRate || 0);

    const coldCost = coldDiff * tariffs.coldWaterRate;
    const hotCost = hotDiff * tariffs.hotWaterRate;
    
    let elecCost = elecDiff * tariffs.electricityRate;
    let elecHalfPeakCost = 0;
    let elecNightCost = 0;

    const hasDoubleOrTriple = tariffs.electricityTariffType === 'double' || tariffs.electricityTariffType === 'triple';
    const hasTriple = tariffs.electricityTariffType === 'triple';

    if (hasDoubleOrTriple) {
      elecNightCost = elecNightDiff * (tariffs.electricityRateNight || 0);
    }
    if (hasTriple) {
      elecHalfPeakCost = elecHalfPeakDiff * (tariffs.electricityRateHalfPeak || 0);
    }

    const totalCost = coldCost + hotCost + wastewaterCost + elecCost + elecHalfPeakCost + elecNightCost;

    return {
      reading,
      prevReading,
      coldDiff: parseFloat(coldDiff.toFixed(3)),
      hotDiff: parseFloat(hotDiff.toFixed(3)),
      wastewaterDiff: parseFloat(wastewaterDiff.toFixed(2)),
      elecDiff: parseFloat(elecDiff.toFixed(2)),
      elecHalfPeakDiff: parseFloat(elecHalfPeakDiff.toFixed(2)),
      elecNightDiff: parseFloat(elecNightDiff.toFixed(2)),
      elecTotalDiff: parseFloat(elecTotalDiff.toFixed(2)),
      coldCost: parseFloat(coldCost.toFixed(2)),
      hotCost: parseFloat(hotCost.toFixed(2)),
      wastewaterCost: parseFloat(wastewaterCost.toFixed(2)),
      elecCost: parseFloat(elecCost.toFixed(2)),
      elecHalfPeakCost: parseFloat(elecHalfPeakCost.toFixed(2)),
      elecNightCost: parseFloat(elecNightCost.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
    };
  });
}

/**
 * Formats a month code (e.g. "2026-06-20") into a readable Russian month name.
 */
export function formatRussianMonth(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Short month label for charts (e.g. "Июн")
 */
export function getShortMonthLabel(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const month = date.toLocaleString('ru-RU', { month: 'short' });
    // Capitalize first letter
    return month.charAt(0).toUpperCase() + month.slice(1).replace('.', '');
  } catch (e) {
    return '';
  }
}

/**
 * Format message template for messenger sharing
 */
export function compileMessage(
  template: string,
  calc: CalculatedReading,
  landlordName: string,
  tenantName: string,
  currency: string
): string {
  const monthName = formatRussianMonth(calc.reading.date);
  
  // Format variables
  return template
    .replace(/{landlord}/g, landlordName || 'Арендодатель')
    .replace(/{month}/g, monthName)
    .replace(/{cold_val}/g, calc.reading.coldWater.toString())
    .replace(/{cold_diff}/g, calc.coldDiff.toString())
    .replace(/{cold_cost}/g, calc.coldCost.toFixed(2))
    .replace(/{hot_val}/g, calc.reading.hotWater.toString())
    .replace(/{hot_diff}/g, calc.hotDiff.toString())
    .replace(/{hot_cost}/g, calc.hotCost.toFixed(2))
    .replace(/{wastewater_val}/g, (calc.reading.coldWater + calc.reading.hotWater).toFixed(2))
    .replace(/{wastewater_diff}/g, calc.wastewaterDiff.toFixed(2))
    .replace(/{wastewater_cost}/g, calc.wastewaterCost.toFixed(2))
    .replace(/{elec_val}/g, calc.reading.electricity.toString())
    .replace(/{elec_diff}/g, calc.elecDiff.toString())
    .replace(/{elec_cost}/g, calc.elecCost.toFixed(2))
    .replace(/{elec_half_val}/g, (calc.reading.electricityHalfPeak ?? 0).toString())
    .replace(/{elec_half_diff}/g, calc.elecHalfPeakDiff.toString())
    .replace(/{elec_half_cost}/g, calc.elecHalfPeakCost.toFixed(2))
    .replace(/{elec_night_val}/g, (calc.reading.electricityNight ?? 0).toString())
    .replace(/{elec_night_diff}/g, calc.elecNightDiff.toString())
    .replace(/{elec_night_cost}/g, calc.elecNightCost.toFixed(2))
    .replace(/{elec_total_val}/g, (calc.reading.electricityTotal ?? 0).toString())
    .replace(/{elec_total_diff}/g, (calc.elecTotalDiff ?? 0).toString())
    .replace(/{total_cost}/g, calc.totalCost.toLocaleString('ru-RU'))
    .replace(/{currency}/g, currency)
    .replace(/{tenant}/g, tenantName || 'Арендатор');
}

export interface MeterReading {
  id: string;
  date: string; // "YYYY-MM-DD"
  coldWater: number; // m³
  hotWater: number; // m³
  electricity: number; // kWh (Peak T1 or Single Rate)
  electricityHalfPeak?: number; // kWh (Half-peak T2 for 3-tariff)
  electricityNight?: number; // kWh (Night T3 for 2-tariff / 3-tariff)
  electricityTotal?: number; // kWh (General electricity meter, not used in calculations)
  notes?: string;
  isShared?: boolean;
}

export interface TariffConfig {
  coldWaterRate: number; // currency per m³
  hotWaterRate: number; // currency per m³
  wastewaterRate: number; // currency per m³ (sum of hot and cold water)
  electricityRate: number; // currency per kWh (Peak T1 or Single Rate)
  electricityRateHalfPeak?: number; // currency per kWh (Half-peak T2 for 3-tariff)
  electricityRateNight?: number; // currency per kWh (Night T3 for 2-tariff / 3-tariff)
  electricityTariffType: 'single' | 'double' | 'triple';
  currency: string;
}

export interface LandlordConfig {
  name: string;
  tenantName: string;
  phone?: string;
  messageTemplate: string;
  preferredMessenger?: 'whatsapp' | 'telegram' | 'sms';
}

export interface ReminderConfig {
  enabled: boolean;
  dayOfMonth: number;
  time: string;
  dismissedForMonth?: string; // "YYYY-MM"
}

export interface AppState {
  readings: MeterReading[];
  tariffs: TariffConfig;
  landlord: LandlordConfig;
  reminder: ReminderConfig;
}

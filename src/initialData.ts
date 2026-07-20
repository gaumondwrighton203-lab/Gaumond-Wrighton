import { MeterReading, TariffConfig, LandlordConfig, ReminderConfig } from './types';

export const INITIAL_TARIFFS: TariffConfig = {
  coldWaterRate: 50.47, // ₽/m³
  hotWaterRate: 243.16, // ₽/m³
  wastewaterRate: 39.97, // ₽/m³ (водоотведение)
  electricityRate: 8.94, // ₽/kWh (Т1 - Пик)
  electricityRateHalfPeak: 6.73, // ₽/kWh (Т2 - Полупик)
  electricityRateNight: 2.62, // ₽/kWh (Т3 - Ночь)
  electricityTariffType: 'triple',
  currency: '₽'
};

export const INITIAL_LANDLORD: LandlordConfig = {
  name: 'Иван Иванович',
  tenantName: 'Алексей',
  phone: '+79991234567',
  messageTemplate: 'Добрый день, {landlord}! Показания счетчиков за {month}:\n\n💧 Холодная вода №11: {cold_val} м³ (расход: {cold_diff} м³) - {cold_cost} {currency}\n🔥 Горячая вода №13: {hot_val} м³ (расход: {hot_diff} м³) - {hot_cost} {currency}\n☔ Водоотведение: {wastewater_val} м³ (расход: {wastewater_diff} м³) - {wastewater_cost} {currency}\n⚡ Электричество:\n   - Т1 (Пик): {elec_val} кВт·ч (расход: {elec_diff} кВт·ч) - {elec_cost} {currency}\n   - Т2 (Полупик): {elec_half_val} кВт·ч (расход: {elec_half_diff} кВт·ч) - {elec_half_cost} {currency}\n   - Т3 (Ночь): {elec_night_val} кВт·ч (расход: {elec_night_diff} кВт·ч) - {elec_night_cost} {currency}\n\nИтого к оплате по тарифам: {total_cost} {currency}\n\nС уважением, {tenant}!',
  preferredMessenger: 'telegram'
};

export const INITIAL_REMINDER: ReminderConfig = {
  enabled: true,
  dayOfMonth: 20,
  time: '12:00',
  dismissedForMonth: ''
};

export const INITIAL_READINGS: MeterReading[] = [];

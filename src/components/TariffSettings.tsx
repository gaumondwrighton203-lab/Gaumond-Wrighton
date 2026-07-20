import React, { useState, useEffect } from 'react';
import { TariffConfig, MeterReading } from '../types';
import { Settings, Save, Info } from 'lucide-react';

interface TariffSettingsProps {
  tariffs: TariffConfig;
  onSave: (newTariffs: TariffConfig) => void;
  readings: MeterReading[];
  onSaveReadings: (newReadings: MeterReading[]) => void;
}

export const TariffSettings: React.FC<TariffSettingsProps> = ({
  tariffs,
  onSave,
  readings,
  onSaveReadings
}) => {
  const [coldWaterRate, setColdWaterRate] = useState(tariffs.coldWaterRate.toString());
  const [hotWaterRate, setHotWaterRate] = useState(tariffs.hotWaterRate.toString());
  const [wastewaterRate, setWastewaterRate] = useState((tariffs.wastewaterRate ?? 0).toString());
  const [electricityRate, setElectricityRate] = useState(tariffs.electricityRate.toString());
  const [electricityRateHalfPeak, setElectricityRateHalfPeak] = useState(
    (tariffs.electricityRateHalfPeak || 0).toString()
  );
  const [electricityRateNight, setElectricityRateNight] = useState(
    (tariffs.electricityRateNight || 0).toString()
  );
  const [electricityTariffType, setElectricityTariffType] = useState<TariffConfig['electricityTariffType']>(
    tariffs.electricityTariffType || 'single'
  );
  const [currency, setCurrency] = useState(tariffs.currency);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // States for primary (initial) values
  const getBaselineReading = () => {
    const sorted = [...readings].sort((a, b) => a.date.localeCompare(b.date));
    return sorted[0];
  };

  const baseline = getBaselineReading();

  const [baseCold, setBaseCold] = useState(baseline ? baseline.coldWater.toString() : '0');
  const [baseHot, setBaseHot] = useState(baseline ? baseline.hotWater.toString() : '0');
  const [baseElec, setBaseElec] = useState(baseline ? baseline.electricity.toString() : '0');
  const [baseElecHalf, setBaseElecHalf] = useState(baseline && baseline.electricityHalfPeak !== undefined ? baseline.electricityHalfPeak.toString() : '');
  const [baseElecNight, setBaseElecNight] = useState(baseline && baseline.electricityNight !== undefined ? baseline.electricityNight.toString() : '');
  const [baseElecTotal, setBaseElecTotal] = useState(baseline && baseline.electricityTotal !== undefined ? baseline.electricityTotal.toString() : '');
  const [baseDate, setBaseDate] = useState(baseline ? baseline.date : new Date().toISOString().split('T')[0]);

  // Keep state in sync if readings or tariffs change
  useEffect(() => {
    const b = getBaselineReading();
    if (b) {
      setBaseCold(b.coldWater.toString());
      setBaseHot(b.hotWater.toString());
      setBaseElec(b.electricity.toString());
      setBaseElecHalf(b.electricityHalfPeak?.toString() || '');
      setBaseElecNight(b.electricityNight?.toString() || '');
      setBaseElecTotal(b.electricityTotal?.toString() || '');
      setBaseDate(b.date);
    }
  }, [readings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      coldWaterRate: parseFloat(coldWaterRate) || 0,
      hotWaterRate: parseFloat(hotWaterRate) || 0,
      wastewaterRate: parseFloat(wastewaterRate) || 0,
      electricityRate: parseFloat(electricityRate) || 0,
      electricityRateHalfPeak: electricityTariffType === 'triple' ? parseFloat(electricityRateHalfPeak) || 0 : undefined,
      electricityRateNight: (electricityTariffType === 'double' || electricityTariffType === 'triple') ? parseFloat(electricityRateNight) || 0 : undefined,
      electricityTariffType,
      currency
    });

    // Save baseline reading
    const b = getBaselineReading();
    if (b) {
      const updatedBaseline: MeterReading = {
        ...b,
        date: baseDate,
        coldWater: parseFloat(baseCold) || 0,
        hotWater: parseFloat(baseHot) || 0,
        electricity: parseFloat(baseElec) || 0,
        ...(electricityTariffType === 'triple' && baseElecHalf ? { electricityHalfPeak: parseFloat(baseElecHalf) || 0 } : {}),
        ...((electricityTariffType === 'double' || electricityTariffType === 'triple') && baseElecNight ? { electricityNight: parseFloat(baseElecNight) || 0 } : {}),
        ...(baseElecTotal ? { electricityTotal: parseFloat(baseElecTotal) || 0 } : {}),
      };
      const newReadings = readings.map(r => r.id === b.id ? updatedBaseline : r);
      onSaveReadings(newReadings);
    } else {
      const newBaseline: MeterReading = {
        id: Math.random().toString(36).substr(2, 9),
        date: baseDate,
        coldWater: parseFloat(baseCold) || 0,
        hotWater: parseFloat(baseHot) || 0,
        electricity: parseFloat(baseElec) || 0,
        ...(electricityTariffType === 'triple' && baseElecHalf ? { electricityHalfPeak: parseFloat(baseElecHalf) || 0 } : {}),
        ...((electricityTariffType === 'double' || electricityTariffType === 'triple') && baseElecNight ? { electricityNight: parseFloat(baseElecNight) || 0 } : {}),
        ...(baseElecTotal ? { electricityTotal: parseFloat(baseElecTotal) || 0 } : {}),
        notes: 'Первоначальный запуск учета'
      };
      onSaveReadings([newBaseline]);
    }
    
    // Trigger mini alert success
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  return (
    <form id="tariff-form" onSubmit={handleSubmit} className="space-y-4">
      {/* Toast notification inside frame */}
      {showSavedToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-black/80 dark:bg-white/90 text-white dark:text-black px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-1 animate-bounce">
          <span>✅ Тарифы успешно сохранены</span>
        </div>
      )}

      {/* iOS styled grouped table section */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-[18px] border border-black/[0.04] dark:border-white/[0.05] overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-black/20 border-b border-gray-100 dark:border-gray-800/60 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Ставки тарифов
          </span>
          <Settings className="w-3.5 h-3.5 text-gray-400" />
        </div>

        {/* Cold Water Row */}
        <div className="px-4 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/40">
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-gray-900 dark:text-white">Холодная вода №11</span>
            <span className="text-[10px] text-gray-500">Плата за 1 кубический метр (м³)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="any"
              value={coldWaterRate}
              onChange={(e) => setColdWaterRate(e.target.value)}
              className="w-24 px-2.5 py-1.5 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-800 rounded-lg text-right text-sm font-bold focus:outline-none focus:ring-1 focus:ring-ios-blue text-gray-900 dark:text-white"
            />
            <span className="text-xs text-gray-500 font-bold w-4">{currency}</span>
          </div>
        </div>

        {/* Hot Water Row */}
        <div className="px-4 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/40">
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-gray-900 dark:text-white">Горячая вода №13</span>
            <span className="text-[10px] text-gray-500">Плата за 1 кубический метр (м³)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="any"
              value={hotWaterRate}
              onChange={(e) => setHotWaterRate(e.target.value)}
              className="w-24 px-2.5 py-1.5 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-800 rounded-lg text-right text-sm font-bold focus:outline-none focus:ring-1 focus:ring-ios-blue text-gray-900 dark:text-white"
            />
            <span className="text-xs text-gray-500 font-bold w-4">{currency}</span>
          </div>
        </div>

        {/* Wastewater Row */}
        <div className="px-4 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/40">
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-gray-900 dark:text-white">Водоотведение (слив)</span>
            <span className="text-[10px] text-gray-500">Плата за слив 1 м³ воды (ХВ + ГВ)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="any"
              value={wastewaterRate}
              onChange={(e) => setWastewaterRate(e.target.value)}
              className="w-24 px-2.5 py-1.5 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-800 rounded-lg text-right text-sm font-bold focus:outline-none focus:ring-1 focus:ring-ios-blue text-gray-900 dark:text-white"
            />
            <span className="text-xs text-gray-500 font-bold w-4">{currency}</span>
          </div>
        </div>

        {/* Segmented Control for Electricity Tariff Type */}
        <div className="px-4 py-3.5 border-b border-gray-100 dark:border-gray-800/40 bg-black/[0.01] dark:bg-white/[0.01]">
          <div className="flex flex-col mb-2">
            <span className="text-[14px] font-bold text-gray-900 dark:text-white">Тип учета электричества</span>
            <span className="text-[10px] text-gray-500">Количество тарифов в зависимости от времени суток</span>
          </div>
          
          {/* Segmented selector */}
          <div className="p-0.5 bg-gray-100 dark:bg-[#2c2c2e] rounded-lg flex">
            <button
              type="button"
              onClick={() => setElectricityTariffType('single')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                electricityTariffType === 'single'
                  ? 'bg-white dark:bg-[#1c1c1e] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              1-тарифный
            </button>
            <button
              type="button"
              onClick={() => setElectricityTariffType('double')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                electricityTariffType === 'double'
                  ? 'bg-white dark:bg-[#1c1c1e] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              2-тарифный
            </button>
            <button
              type="button"
              onClick={() => setElectricityTariffType('triple')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                electricityTariffType === 'triple'
                  ? 'bg-white dark:bg-[#1c1c1e] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              3-тарифный
            </button>
          </div>
        </div>

        {/* Electricity Row (Day/Single/Peak T1) */}
        <div className="px-4 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/40">
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-gray-900 dark:text-white">
              {electricityTariffType === 'single' && 'Электричество'}
              {electricityTariffType === 'double' && 'Электричество (Т1 - День)'}
              {electricityTariffType === 'triple' && 'Электричество (Т1 - Пик)'}
            </span>
            <span className="text-[10px] text-gray-500">
              {electricityTariffType === 'single' && 'Плата за 1 киловатт-час (кВт·ч)'}
              {electricityTariffType === 'double' && 'Плата за 1 киловатт-час (кВт·ч) в дневное время'}
              {electricityTariffType === 'triple' && 'Пиковая зона (с 7:00 до 10:00 и с 17:00 до 21:00)'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="any"
              value={electricityRate}
              onChange={(e) => setElectricityRate(e.target.value)}
              className="w-24 px-2.5 py-1.5 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-800 rounded-lg text-right text-sm font-bold focus:outline-none focus:ring-1 focus:ring-ios-blue text-gray-900 dark:text-white"
            />
            <span className="text-xs text-gray-500 font-bold w-4">{currency}</span>
          </div>
        </div>

        {/* Electricity Half-Peak Row (T2) */}
        {electricityTariffType === 'triple' && (
          <div className="px-4 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/40 bg-amber-500/[0.02]">
            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-amber-600 dark:text-amber-400">Электричество (Т2 - Полупик)</span>
              <span className="text-[10px] text-gray-500">Полупиковая зона (с 10:00 до 17:00 и с 21:00 до 23:00)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="any"
                value={electricityRateHalfPeak}
                onChange={(e) => setElectricityRateHalfPeak(e.target.value)}
                className="w-24 px-2.5 py-1.5 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-800 rounded-lg text-right text-sm font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 text-gray-900 dark:text-white"
              />
              <span className="text-xs text-gray-500 font-bold w-4">{currency}</span>
            </div>
          </div>
        )}

        {/* Electricity Night Row (T3) */}
        {(electricityTariffType === 'double' || electricityTariffType === 'triple') && (
          <div className="px-4 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/40 bg-indigo-500/[0.02]">
            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-indigo-600 dark:text-indigo-400">
                {electricityTariffType === 'double' ? 'Электричество (Т2 - Ночь)' : 'Электричество (Т3 - Ночь)'}
              </span>
              <span className="text-[10px] text-gray-500">Ночная зона (с 23:00 до 7:00)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="any"
                value={electricityRateNight}
                onChange={(e) => setElectricityRateNight(e.target.value)}
                className="w-24 px-2.5 py-1.5 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-800 rounded-lg text-right text-sm font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white"
              />
              <span className="text-xs text-gray-500 font-bold w-4">{currency}</span>
            </div>
          </div>
        )}

        {/* Currency Row */}
        <div className="px-4 py-3.5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-gray-900 dark:text-white">Валюта расчетов</span>
            <span className="text-[10px] text-gray-500">Символ валюты для отображения</span>
          </div>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-bold text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-ios-blue"
          >
            <option value="₽">₽ (Рубль)</option>
            <option value="руб.">руб.</option>
            <option value="₸">₸ (Тенге)</option>
            <option value="Br">Br (Бел. Рубль)</option>
            <option value="$">$ (Доллар)</option>
            <option value="€">€ (Евро)</option>
          </select>
        </div>
      </div>

      {/* iOS styled grouped table section for Initial readings */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-[18px] border border-black/[0.04] dark:border-white/[0.05] overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-black/20 border-b border-gray-100 dark:border-gray-800/60 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Первичные (начальные) значения
          </span>
          <Info className="w-3.5 h-3.5 text-gray-400" />
        </div>

        {/* Info label */}
        <div className="px-4 py-2.5 bg-purple-500/[0.04] text-[10px] text-purple-700 dark:text-purple-300 border-b border-gray-100 dark:border-gray-800/40 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-500" />
          <span>Укажите стартовые показания приборов учета, от которых начнется расчет расходов со следующего месяца (например, на момент заезда).</span>
        </div>

        {/* Start Date */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/40">
          <div className="flex flex-col pr-2">
            <span className="text-[14px] font-bold text-gray-900 dark:text-white">Дата старта</span>
            <span className="text-[10px] text-gray-500">С какого числа начнется учет</span>
          </div>
          <input
            type="date"
            value={baseDate}
            onChange={(e) => setBaseDate(e.target.value)}
            className="w-auto max-w-[140px] min-w-0 px-2.5 py-1.5 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-ios-blue"
          />
        </div>

        {/* Cold Water Row */}
        <div className="px-4 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/40">
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-gray-900 dark:text-white">Холодная вода №11 (ХВ)</span>
            <span className="text-[10px] text-gray-500">Начальный объем (м³)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="any"
              value={baseCold}
              onChange={(e) => setBaseCold(e.target.value)}
              className="w-24 px-2.5 py-1.5 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-800 rounded-lg text-right text-sm font-bold focus:outline-none focus:ring-1 focus:ring-ios-blue text-gray-900 dark:text-white"
            />
            <span className="text-xs text-gray-500 font-bold w-4">м³</span>
          </div>
        </div>

        {/* Hot Water Row */}
        <div className="px-4 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/40">
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-gray-900 dark:text-white">Горячая вода №13 (ГВ)</span>
            <span className="text-[10px] text-gray-500">Начальный объем (м³)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="any"
              value={baseHot}
              onChange={(e) => setBaseHot(e.target.value)}
              className="w-24 px-2.5 py-1.5 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-800 rounded-lg text-right text-sm font-bold focus:outline-none focus:ring-1 focus:ring-ios-blue text-gray-900 dark:text-white"
            />
            <span className="text-xs text-gray-500 font-bold w-4">м³</span>
          </div>
        </div>

        {/* Base Electricity */}
        <div className="px-4 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/40">
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-gray-900 dark:text-white">
              {electricityTariffType === 'single' && 'Электричество'}
              {electricityTariffType === 'double' && 'Электричество (Т1 - День)'}
              {electricityTariffType === 'triple' && 'Электричество (Т1 - Пик)'}
            </span>
            <span className="text-[10px] text-gray-500">Начальные киловатты (кВт·ч)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="any"
              value={baseElec}
              onChange={(e) => setBaseElec(e.target.value)}
              className="w-24 px-2.5 py-1.5 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-800 rounded-lg text-right text-sm font-bold focus:outline-none focus:ring-1 focus:ring-ios-blue text-gray-900 dark:text-white"
            />
            <span className="text-xs text-gray-500 font-bold w-4">кВтч</span>
          </div>
        </div>

        {/* Base Electricity Half-Peak */}
        {electricityTariffType === 'triple' && (
          <div className="px-4 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/40 bg-amber-500/[0.02]">
            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-amber-600 dark:text-amber-400">Электричество (Т2 - Полупик)</span>
              <span className="text-[10px] text-gray-500">Начальные киловатты (кВт·ч)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="any"
                value={baseElecHalf}
                onChange={(e) => setBaseElecHalf(e.target.value)}
                className="w-24 px-2.5 py-1.5 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-800 rounded-lg text-right text-sm font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 text-gray-900 dark:text-white"
              />
              <span className="text-xs text-gray-500 font-bold w-4">кВтч</span>
            </div>
          </div>
        )}

        {/* Base Electricity Night */}
        {(electricityTariffType === 'double' || electricityTariffType === 'triple') && (
          <div className="px-4 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/40 bg-indigo-500/[0.02]">
            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-indigo-600 dark:text-indigo-400">
                {electricityTariffType === 'double' ? 'Электричество (Т2 - Ночь)' : 'Электричество (Т3 - Ночь)'}
              </span>
              <span className="text-[10px] text-gray-500">Начальные киловатты (кВт·ч)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="any"
                value={baseElecNight}
                onChange={(e) => setBaseElecNight(e.target.value)}
                className="w-24 px-2.5 py-1.5 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-800 rounded-lg text-right text-sm font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white"
              />
              <span className="text-xs text-gray-500 font-bold w-4">кВтч</span>
            </div>
          </div>
        )}

        {/* Base Electricity Total */}
        <div className="px-4 py-3.5 flex items-center justify-between bg-purple-500/[0.01]">
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-purple-600 dark:text-purple-400">Общий эл. счетчик</span>
            <span className="text-[10px] text-gray-500">Начальные киловатты (кВт·ч)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="any"
              value={baseElecTotal}
              onChange={(e) => setBaseElecTotal(e.target.value)}
              className="w-24 px-2.5 py-1.5 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-800 rounded-lg text-right text-sm font-bold focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-white"
            />
            <span className="text-xs text-gray-500 font-bold w-4">кВтч</span>
          </div>
        </div>
      </div>

      {/* Info Block */}
      <div className="bg-ios-blue/5 border border-ios-blue/10 rounded-2xl p-4 flex gap-2.5">
        <div className="text-[11px] text-gray-600 dark:text-gray-300 leading-snug">
          Все расчеты потребления и стоимости коммунальных услуг выполняются автоматически при вводе показаний на основе данных тарифов. Обновленные тарифы применяются к расчету стоимости новых и существующих записей сразу после сохранения.
        </div>
      </div>
    </form>
  );
};

import React, { useEffect, useState } from 'react';
import { MeterReading, TariffConfig } from '../types';
import { Droplet, Flame, Zap, Calendar, AlertTriangle, RefreshCw } from 'lucide-react';

interface ReadingFormProps {
  readingToEdit?: MeterReading;
  previousReading?: MeterReading;
  tariffs: TariffConfig;
  onSave: (reading: Omit<MeterReading, 'id'>) => void;
  onCancel: () => void;
}

export const ReadingForm: React.FC<ReadingFormProps> = ({
  readingToEdit,
  previousReading,
  tariffs,
  onSave,
  onCancel
}) => {
  const [date, setDate] = useState('');
  const [coldWater, setColdWater] = useState('');
  const [hotWater, setHotWater] = useState('');
  const [electricity, setElectricity] = useState('');
  const [electricityHalfPeak, setElectricityHalfPeak] = useState('');
  const [electricityNight, setElectricityNight] = useState('');
  const [electricityTotal, setElectricityTotal] = useState('');
  const [notes, setNotes] = useState('');
  const [bypassWarning, setBypassWarning] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const tariffType = tariffs.electricityTariffType || 'single';

  useEffect(() => {
    if (readingToEdit) {
      setDate(readingToEdit.date);
      setColdWater(readingToEdit.coldWater.toString());
      setHotWater(readingToEdit.hotWater.toString());
      setElectricity(readingToEdit.electricity.toString());
      setElectricityHalfPeak(readingToEdit.electricityHalfPeak?.toString() || '');
      setElectricityNight(readingToEdit.electricityNight?.toString() || '');
      setElectricityTotal(readingToEdit.electricityTotal?.toString() || '');
      setNotes(readingToEdit.notes || '');
    } else {
      // Setup current date (YYYY-MM-DD)
      const now = new Date();
      const offset = now.getTimezoneOffset();
      const localNow = new Date(now.getTime() - offset * 60 * 1000);
      setDate(localNow.toISOString().split('T')[0]);
      
      // Keep input fields clean/empty for new readings as requested by the user
      setColdWater('');
      setHotWater('');
      setElectricity('');
      setElectricityHalfPeak('');
      setElectricityNight('');
      setElectricityTotal('');
      setNotes('');
    }
    setBypassWarning(false);
    setValidationError(null);
  }, [readingToEdit, previousReading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const coldVal = parseFloat(coldWater);
    const hotVal = parseFloat(hotWater);
    const elecVal = parseFloat(electricity);
    const elecNightVal = (tariffType === 'double' || tariffType === 'triple') ? parseFloat(electricityNight) : undefined;
    const elecHalfPeakVal = tariffType === 'triple' ? parseFloat(electricityHalfPeak) : undefined;
    const elecTotalVal = electricityTotal ? parseFloat(electricityTotal) : undefined;

    // Basic Validation
    if (isNaN(coldVal) || isNaN(hotVal) || isNaN(elecVal)) {
      setValidationError('Пожалуйста, заполните все обязательные поля корректными числами.');
      return;
    }

    if ((tariffType === 'double' || tariffType === 'triple') && isNaN(elecNightVal || NaN)) {
      setValidationError('При многотарифном учете необходимо ввести показания для ночной зоны (Т3/Т2 Ночь).');
      return;
    }

    if (tariffType === 'triple' && isNaN(elecHalfPeakVal || NaN)) {
      setValidationError('При трехтарифном учете необходимо ввести показания для полупиковой зоны (Т2 Полупик).');
      return;
    }

    // Historical regression validation
    if (previousReading && !bypassWarning) {
      const isColdLower = coldVal < previousReading.coldWater;
      const isHotLower = hotVal < previousReading.hotWater;
      const isElecLower = elecVal < previousReading.electricity;
      const isElecNightLower = (tariffType === 'double' || tariffType === 'triple') && 
        previousReading.electricityNight !== undefined && 
        (elecNightVal || 0) < previousReading.electricityNight;
      const isElecHalfLower = tariffType === 'triple' && 
        previousReading.electricityHalfPeak !== undefined && 
        (elecHalfPeakVal || 0) < previousReading.electricityHalfPeak;
      const isElecTotalLower = previousReading.electricityTotal !== undefined &&
        elecTotalVal !== undefined &&
        elecTotalVal < previousReading.electricityTotal;

      if (isColdLower || isHotLower || isElecLower || isElecNightLower || isElecHalfLower || isElecTotalLower) {
        setValidationError(
          'Введенные показания МЕНЬШЕ предыдущих. Если это не замена или сброс счетчика, пожалуйста, проверьте значения.'
        );
        setBypassWarning(true);
        return;
      }
    }

    // Call save callback
    onSave({
      date,
      coldWater: coldVal,
      hotWater: hotVal,
      electricity: elecVal,
      ...((tariffType === 'double' || tariffType === 'triple') && elecNightVal !== undefined ? { electricityNight: elecNightVal } : {}),
      ...(tariffType === 'triple' && elecHalfPeakVal !== undefined ? { electricityHalfPeak: elecHalfPeakVal } : {}),
      ...(elecTotalVal !== undefined ? { electricityTotal: elecTotalVal } : {}),
      notes: notes.trim() || undefined
    });
  };

  const handlePrefillPrevious = () => {
    if (previousReading) {
      setColdWater(previousReading.coldWater.toString());
      setHotWater(previousReading.hotWater.toString());
      setElectricity(previousReading.electricity.toString());
      setElectricityHalfPeak(previousReading.electricityHalfPeak?.toString() || '');
      setElectricityNight(previousReading.electricityNight?.toString() || '');
      setElectricityTotal(previousReading.electricityTotal?.toString() || '');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {validationError && (
        <div className="p-3 bg-ios-red/10 border border-ios-red/20 text-ios-red rounded-xl text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span>{validationError}</span>
            {bypassWarning && (
              <button
                type="button"
                onClick={() => {
                  setValidationError(null);
                }}
                className="block mt-1 font-bold underline cursor-pointer"
              >
                Все равно сохранить (замена счетчика)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Date Select */}
      <div className="w-full max-w-full overflow-hidden">
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
          Дата снятия показаний
        </label>
        <div className="relative w-full max-w-full">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full max-w-full box-border px-4 py-3 bg-white dark:bg-ios-card-dark rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ios-blue focus:border-transparent min-w-0"
          />
        </div>
      </div>

      {/* Inputs Section */}
      <div className="space-y-3.5">
        {/* Cold Water */}
        <div className="bg-white dark:bg-ios-card-dark rounded-xl p-3 border border-gray-200/60 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Droplet className="w-3.5 h-3.5 fill-blue-500/10" />
              </div>
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Холодная вода №11 (м³)</span>
            </div>
            {previousReading && (
              <span className="text-[10px] text-gray-400 font-medium">
                Пред.: {previousReading.coldWater} м³
              </span>
            )}
          </div>
          <input
            type="number"
            step="any"
            value={coldWater}
            onChange={(e) => setColdWater(e.target.value)}
            placeholder="например: 124.35"
            required
            className="w-full bg-transparent text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 focus:outline-none focus:border-blue-500 pb-1"
          />
        </div>

        {/* Hot Water */}
        <div className="bg-white dark:bg-ios-card-dark rounded-xl p-3 border border-gray-200/60 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                <Flame className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Горячая вода №13 (м³)</span>
            </div>
            {previousReading && (
              <span className="text-[10px] text-gray-400 font-medium">
                Пред.: {previousReading.hotWater} м³
              </span>
            )}
          </div>
          <input
            type="number"
            step="any"
            value={hotWater}
            onChange={(e) => setHotWater(e.target.value)}
            placeholder="например: 74.8"
            required
            className="w-full bg-transparent text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 focus:outline-none focus:border-red-500 pb-1"
          />
        </div>

        {/* Electricity T1 (Peak or Single) */}
        <div className="bg-white dark:bg-ios-card-dark rounded-xl p-3 border border-gray-200/60 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                <Zap className="w-3.5 h-3.5 fill-yellow-500/10" />
              </div>
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                {tariffType === 'single' && 'Электричество (кВт·ч)'}
                {tariffType === 'double' && 'Электричество День Т1 (кВт·ч)'}
                {tariffType === 'triple' && 'Электричество Пик Т1 (кВт·ч)'}
              </span>
            </div>
            {previousReading && (
              <span className="text-[10px] text-gray-400 font-medium">
                Пред.: {previousReading.electricity} кВт·ч
              </span>
            )}
          </div>
          <input
            type="number"
            step="any"
            value={electricity}
            onChange={(e) => setElectricity(e.target.value)}
            placeholder="например: 4180"
            required
            className="w-full bg-transparent text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 focus:outline-none focus:border-yellow-500 pb-1"
          />
        </div>

        {/* Electricity T2 (Half-peak) for Triple-tariff */}
        {tariffType === 'triple' && (
          <div className="bg-white dark:bg-ios-card-dark rounded-xl p-3 border border-gray-200/60 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Электричество Полупик Т2 (кВт·ч)</span>
              </div>
              {previousReading && previousReading.electricityHalfPeak !== undefined && (
                <span className="text-[10px] text-gray-400 font-medium">
                  Пред.: {previousReading.electricityHalfPeak} кВт·ч
                </span>
              )}
            </div>
            <input
              type="number"
              step="any"
              value={electricityHalfPeak}
              onChange={(e) => setElectricityHalfPeak(e.target.value)}
              placeholder="например: 1032"
              required={tariffType === 'triple'}
              className="w-full bg-transparent text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 focus:outline-none focus:border-amber-500 pb-1"
            />
          </div>
        )}

        {/* Electricity Night (T3/T2 Night) */}
        {(tariffType === 'double' || tariffType === 'triple') && (
          <div className="bg-white dark:bg-ios-card-dark rounded-xl p-3 border border-gray-200/60 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  {tariffType === 'double' ? 'Электричество Ночь Т2 (кВт·ч)' : 'Электричество Ночь Т3 (кВт·ч)'}
                </span>
              </div>
              {previousReading && previousReading.electricityNight !== undefined && (
                <span className="text-[10px] text-gray-400 font-medium">
                  Пред.: {previousReading.electricityNight} кВт·ч
                </span>
              )}
            </div>
            <input
              type="number"
              step="any"
              value={electricityNight}
              onChange={(e) => setElectricityNight(e.target.value)}
              placeholder="например: 1540"
              required={tariffType === 'double' || tariffType === 'triple'}
              className="w-full bg-transparent text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 focus:outline-none focus:border-indigo-500 pb-1"
            />
          </div>
        )}

        {/* General/Total Electricity Meter (Only recorded, not in calculations) */}
        <div className="bg-white dark:bg-ios-card-dark rounded-xl p-3 border border-gray-200/60 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                <Zap className="w-3.5 h-3.5 fill-purple-500/10" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Общий эл. счетчик (кВт·ч)</span>
                <span className="text-[9px] text-gray-400 font-normal leading-tight">только фиксация, без расчетов</span>
              </div>
            </div>
            {previousReading && previousReading.electricityTotal !== undefined && (
              <span className="text-[10px] text-gray-400 font-medium">
                Пред.: {previousReading.electricityTotal} кВт·ч
              </span>
            )}
          </div>
          <input
            type="number"
            step="any"
            value={electricityTotal}
            onChange={(e) => setElectricityTotal(e.target.value)}
            placeholder="например: 5410"
            className="w-full bg-transparent text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 focus:outline-none focus:border-purple-500 pb-1"
          />
        </div>
      </div>

      {/* Prefill Helper Button */}
      {previousReading && !readingToEdit && (
        <button
          type="button"
          onClick={handlePrefillPrevious}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-ios-blue hover:underline py-1 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Скопировать предыдущие показания как основу</span>
        </button>
      )}

      {/* Notes Input */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
          Заметка / комментарий (необязательно)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Например: Снимали показания до отпуска"
          rows={2}
          className="w-full px-4 py-3 bg-white dark:bg-ios-card-dark rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ios-blue focus:border-transparent resize-none"
        />
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3.5 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm font-bold active:scale-98 transition-all cursor-pointer"
        >
          Отменить
        </button>
        <button
          type="submit"
          className="flex-1 py-3.5 rounded-xl bg-ios-blue text-white text-sm font-bold shadow-md shadow-ios-blue/15 active:scale-98 transition-all cursor-pointer"
        >
          Сохранить
        </button>
      </div>
    </form>
  );
};

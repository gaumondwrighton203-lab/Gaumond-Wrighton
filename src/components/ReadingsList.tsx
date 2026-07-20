import React from 'react';
import { CalculatedReading } from '../utils/calculations';
import { Droplet, Flame, Zap, Calendar, Share2, Edit2, Trash2, MessageSquare, AlertCircle } from 'lucide-react';

interface ReadingsListProps {
  calculatedReadings: CalculatedReading[];
  onEdit: (readingId: string) => void;
  onDelete: (readingId: string) => void;
  onShare: (calc: CalculatedReading) => void;
  currency: string;
}

export const ReadingsList: React.FC<ReadingsListProps> = ({
  calculatedReadings,
  onEdit,
  onDelete,
  onShare,
  currency
}) => {
  // Sort descending by date to show the latest readings on top
  const displayedReadings = [...calculatedReadings].reverse();

  if (displayedReadings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-ios-blue/10 flex items-center justify-center text-ios-blue mb-4">
          <Calendar className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Нет записей</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
          Добавьте свои первые показания счетчиков с помощью кнопки «+» в правом верхнем углу.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayedReadings.map((item) => {
        const dateObj = new Date(item.reading.date);
        const monthLabel = dateObj.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
        const isBaseline = !item.prevReading;

        return (
          <div
            key={item.reading.id}
            id={`reading-card-${item.reading.id}`}
            className="bg-white dark:bg-[#1c1c1e] rounded-[18px] shadow-sm border border-black/[0.04] dark:border-white/[0.05] p-4 transition-all hover:shadow-md"
          >
            {/* Card Header */}
            <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-gray-100 dark:border-gray-800/60">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-ios-blue" />
                <span className="text-[15px] font-bold text-gray-900 dark:text-white capitalize">
                  {monthLabel}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onShare(item)}
                  className="p-1.5 rounded-lg bg-ios-blue/10 text-ios-blue hover:bg-ios-blue/20 transition-all"
                  title="Отправить отчет"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onEdit(item.reading.id)}
                  className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                  title="Редактировать"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(item.reading.id)}
                  className="p-1.5 rounded-lg bg-ios-red/10 text-ios-red hover:bg-ios-red/20 transition-all"
                  title="Удалить"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* Cold Water */}
              <div className="bg-[#f2f2f7]/60 dark:bg-[#2c2c2e]/40 rounded-xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">ХВ №11 (м³)</span>
                  <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Droplet className="w-3 h-3 fill-blue-500/10" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight">
                    {item.reading.coldWater}
                  </div>
                  <div className="text-[10px] font-semibold mt-0.5 flex items-center gap-0.5">
                    {isBaseline ? (
                      <span className="text-gray-400">база</span>
                    ) : (
                      <span className="text-blue-500">+{item.coldDiff} м³</span>
                    )}
                  </div>
                  {!isBaseline && (
                    <div className="text-[9px] text-gray-500 mt-0.5">
                      {item.coldCost.toLocaleString('ru-RU')} {currency}
                    </div>
                  )}
                </div>
              </div>

              {/* Hot Water */}
              <div className="bg-[#f2f2f7]/60 dark:bg-[#2c2c2e]/40 rounded-xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">ГВ №13 (м³)</span>
                  <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                    <Flame className="w-3 h-3" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight">
                    {item.reading.hotWater}
                  </div>
                  <div className="text-[10px] font-semibold mt-0.5 flex items-center gap-0.5">
                    {isBaseline ? (
                      <span className="text-gray-400">база</span>
                    ) : (
                      <span className="text-red-500">+{item.hotDiff} м³</span>
                    )}
                  </div>
                  {!isBaseline && (
                    <div className="text-[9px] text-gray-500 mt-0.5">
                      {item.hotCost.toLocaleString('ru-RU')} {currency}
                    </div>
                  )}
                </div>
              </div>

              {/* Electricity */}
              <div className="bg-[#f2f2f7]/60 dark:bg-[#2c2c2e]/40 rounded-xl p-2.5 flex flex-col justify-between col-span-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Элек (кВтч)</span>
                  <div className="w-5 h-5 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                    <Zap className="w-3 h-3 fill-yellow-500/10" />
                  </div>
                </div>
                <div className="mt-2 space-y-0.5">
                  <div className="text-[12px] font-bold text-gray-900 dark:text-white leading-tight">
                    {item.reading.electricityHalfPeak !== undefined ? (
                      // Triple tariff
                      <div className="text-[11px] font-normal text-gray-700 dark:text-gray-300 space-y-0.5">
                        <div>Т1: <span className="font-bold">{item.reading.electricity}</span></div>
                        <div>Т2: <span className="font-bold">{item.reading.electricityHalfPeak}</span></div>
                        {item.reading.electricityNight !== undefined && (
                          <div>Т3: <span className="font-bold">{item.reading.electricityNight}</span></div>
                        )}
                      </div>
                    ) : item.reading.electricityNight !== undefined ? (
                      // Double tariff
                      <div className="text-[11px] font-normal text-gray-700 dark:text-gray-300 space-y-0.5">
                        <div>Т1 (Д): <span className="font-bold">{item.reading.electricity}</span></div>
                        <div>Т2 (Н): <span className="font-bold">{item.reading.electricityNight}</span></div>
                      </div>
                    ) : (
                      // Single tariff
                      <span className="text-[14px]">{item.reading.electricity}</span>
                    )}
                  </div>
                  <div className="text-[9px] font-semibold mt-1 flex flex-col text-yellow-600 dark:text-yellow-400">
                    {isBaseline ? (
                      <span className="text-gray-400">база</span>
                    ) : (
                      <>
                        {item.reading.electricityHalfPeak !== undefined ? (
                          <span>
                            Δ: +{item.elecDiff} / +{item.elecHalfPeakDiff} / +{item.elecNightDiff}
                          </span>
                        ) : item.reading.electricityNight !== undefined ? (
                          <span>
                            Δ: +{item.elecDiff} / +{item.elecNightDiff}
                          </span>
                        ) : (
                          <span>+{item.elecDiff} кВт·ч</span>
                        )}
                      </>
                    )}
                  </div>
                  {!isBaseline && (
                    <div className="text-[9px] text-gray-500 mt-0.5">
                      {(item.elecCost + item.elecHalfPeakCost + item.elecNightCost).toLocaleString('ru-RU')} {currency}
                    </div>
                  )}
                  {item.reading.electricityTotal !== undefined && (
                    <div className="mt-2 pt-1.5 border-t border-gray-200/50 dark:border-gray-800/40 text-[9px] text-purple-600 dark:text-purple-400">
                      <div>Общий: <span className="font-bold text-gray-900 dark:text-white">{item.reading.electricityTotal}</span></div>
                      {!isBaseline && item.elecTotalDiff !== undefined && (
                        <div>Расход: <span className="font-bold">+{item.elecTotalDiff}</span></div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Wastewater row */}
            <div className="mt-3.5 bg-purple-500/5 dark:bg-purple-500/10 rounded-xl p-2.5 flex items-center justify-between border border-purple-500/10">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                  <Droplet className="w-3 h-3 fill-purple-500/10" />
                </div>
                <div>
                  <span className="text-[11px] text-gray-700 dark:text-gray-300 font-bold">Водоотведение (ХВ + ГВ)</span>
                  <p className="text-[9px] text-gray-400 leading-none mt-0.5">слив холодной и горячей воды</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[12px] font-bold text-gray-900 dark:text-white leading-none">
                  {(item.reading.coldWater + item.reading.hotWater).toFixed(1)} м³
                </div>
                <div className="text-[10px] font-semibold mt-0.5 text-purple-600 dark:text-purple-400">
                  {isBaseline ? (
                    <span className="text-gray-400 font-normal">база</span>
                  ) : (
                    <span>+{item.wastewaterDiff} м³ ({item.wastewaterCost.toLocaleString('ru-RU')} {currency})</span>
                  )}
                </div>
              </div>
            </div>

            {/* Total calculated sum for the month */}
            {!isBaseline && (
              <div className="mt-3.5 pt-3.5 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between text-xs">
                <div className="text-gray-500 font-medium">Начислено за месяц:</div>
                <div className="text-sm font-extrabold text-ios-green">
                  {item.totalCost.toLocaleString('ru-RU')} {currency}
                </div>
              </div>
            )}

            {isBaseline && (
              <div className="mt-3.5 pt-3 border-t border-gray-100 dark:border-gray-800/60 flex items-center gap-1.5 text-[10px] text-gray-500 bg-gray-50 dark:bg-black/20 p-2 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                <span>Эта запись является стартовой (базой). Расход и стоимость начнут рассчитываться со следующего месяца.</span>
              </div>
            )}

            {/* Notes if any */}
            {item.reading.notes && (
              <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 bg-black/[0.02] dark:bg-white/[0.02] p-2 rounded-lg italic">
                📋 {item.reading.notes}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

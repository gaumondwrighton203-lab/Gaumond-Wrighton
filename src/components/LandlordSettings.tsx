import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LandlordConfig } from '../types';
import { CalculatedReading, compileMessage } from '../utils/calculations';
import { Smartphone, Check, User, Share, Copy, Save } from 'lucide-react';
import { INITIAL_LANDLORD } from '../initialData';

interface LandlordSettingsProps {
  config: LandlordConfig;
  latestCalculatedReading?: CalculatedReading;
  currency: string;
  onSave: (newConfig: LandlordConfig) => void;
}

export const LandlordSettings: React.FC<LandlordSettingsProps> = ({
  config,
  latestCalculatedReading,
  currency,
  onSave
}) => {
  const [name, setName] = useState(config.name);
  const [tenantName, setTenantName] = useState(config.tenantName || '');
  const [messageTemplate, setMessageTemplate] = useState(config.messageTemplate);
  const [copied, setCopied] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  useEffect(() => {
    setName(config.name);
    setTenantName(config.tenantName || '');
    setMessageTemplate(config.messageTemplate);
  }, [config]);

  const handleSave = () => {
    onSave({
      name,
      tenantName,
      messageTemplate
    });
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const getSampleReading = (): CalculatedReading => {
    if (latestCalculatedReading) {
      return latestCalculatedReading;
    }
    return {
      reading: { id: 'temp', date: '2026-07-20', coldWater: 123.4, hotWater: 74.8, electricity: 1410, electricityHalfPeak: 950, electricityNight: 430 },
      prevReading: { id: 'temp-prev', date: '2026-06-20', coldWater: 119.2, hotWater: 72.1, electricity: 1350, electricityHalfPeak: 910, electricityNight: 408 },
      coldDiff: 4.2,
      hotDiff: 2.7,
      elecDiff: 60,
      elecHalfPeakDiff: 40,
      elecNightDiff: 22,
      coldCost: 211.97,
      hotCost: 656.53,
      elecCost: 536.4,
      elecHalfPeakCost: 269.2,
      elecNightCost: 57.64,
      wastewaterDiff: 6.9,
      wastewaterCost: 275.79,
      totalCost: 2007.53
    };
  };

  const sampleReading = getSampleReading();
  const compiledText = compileMessage(messageTemplate, sampleReading, name, tenantName, currency);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(compiledText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Fallback
    }
  };

  return (
    <form id="landlord-form" onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
      {showSavedToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-black/80 dark:bg-white/90 text-white dark:text-black px-4 py-2 rounded-full text-xs font-bold shadow-lg">
          <span>✅ Контактные данные сохранены</span>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-[18px] border border-black/[0.04] dark:border-white/[0.05] p-4 space-y-3.5">
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
          Контактные данные
        </h3>

        {/* Landlord Name input */}
        <div>
          <label className="block text-[11px] font-bold text-gray-400 mb-1 uppercase">ФИО Арендодателя</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <User className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Иван Иванович"
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-ios-blue"
            />
          </div>
        </div>

        {/* Tenant Name input */}
        <div>
          <label className="block text-[11px] font-bold text-gray-400 mb-1 uppercase">Имя Арендатора (вы)</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <User className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="Алексей"
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-ios-blue"
            />
          </div>
        </div>

        {/* Collapsible Message Template Editor */}
        <div className="border-t border-gray-100 dark:border-gray-800/40 pt-3 mt-1.5">
          <details className="group">
            <summary className="flex items-center justify-between text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer list-none select-none">
              <span>Редактировать шаблон сообщения</span>
              <span className="text-ios-blue text-[10px] transition-transform group-open:rotate-180">▼</span>
            </summary>
            
            <div className="mt-3 space-y-3">
              <textarea
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                rows={7}
                className="w-full p-3 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-ios-blue leading-relaxed font-mono resize-none"
                placeholder="Шаблон сообщения..."
              />
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const confirmReset = window.confirm('🔄 Сбросить шаблон сообщения к стандартному виду?');
                    if (confirmReset) {
                      setMessageTemplate(INITIAL_LANDLORD.messageTemplate);
                    }
                  }}
                  className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                >
                  Сбросить шаблон
                </button>
              </div>

              {/* Helper Placeholders Info */}
              <div className="bg-gray-50 dark:bg-black/10 rounded-xl p-2.5 text-[10px] text-gray-400 space-y-1 font-medium leading-relaxed">
                <p className="font-bold text-gray-500 uppercase tracking-wider mb-1">Переменные шаблона:</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[9px]">
                  <div><span className="text-ios-blue">{'{landlord}'}</span> - имя арендодателя</div>
                  <div><span className="text-ios-blue">{'{tenant}'}</span> - ваше имя</div>
                  <div><span className="text-ios-blue">{'{month}'}</span> - месяц года</div>
                  <div><span className="text-ios-blue">{'{currency}'}</span> - валюта ({currency})</div>
                  <div><span className="text-ios-blue">{'{total_cost}'}</span> - итоговая сумма</div>
                  <div><span className="text-ios-blue">{'{cold_val}'}</span> - хол. вода №11</div>
                  <div><span className="text-ios-blue">{'{cold_diff}'}</span> - расход хол. воды</div>
                  <div><span className="text-ios-blue">{'{cold_cost}'}</span> - сумма хол. воды</div>
                  <div><span className="text-ios-blue">{'{hot_val}'}</span> - гор. вода №13</div>
                  <div><span className="text-ios-blue">{'{hot_diff}'}</span> - расход гор. воды</div>
                  <div><span className="text-ios-blue">{'{hot_cost}'}</span> - сумма гор. воды</div>
                  <div><span className="text-ios-blue">{'{wastewater_val}'}</span> - водоотв. объем</div>
                  <div><span className="text-ios-blue">{'{wastewater_diff}'}</span> - расход водоотв.</div>
                  <div><span className="text-ios-blue">{'{wastewater_cost}'}</span> - сумма водоотв.</div>
                  <div><span className="text-ios-blue">{'{elec_val}'}</span> - Т1 показания</div>
                  <div><span className="text-ios-blue">{'{elec_diff}'}</span> - Т1 расход</div>
                  <div><span className="text-ios-blue">{'{elec_cost}'}</span> - Т1 сумма</div>
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* Save button inside main card */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-900 dark:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-ios-blue" />
            <span>Сохранить настройки</span>
          </button>
        </div>
      </div>

      {/* Live Preview Block */}
      <div className="bg-[#f2f2f7] dark:bg-[#2c2c2e]/60 rounded-2xl p-4 border border-black/[0.03] dark:border-white/[0.03]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <Smartphone className="w-3.5 h-3.5 text-ios-blue" />
            <span>Предпросмотр сообщения</span>
          </div>
          <span className="text-[10px] bg-ios-blue/10 text-ios-blue font-bold px-2 py-0.5 rounded-full">
            {sampleReading.reading.id === 'temp' ? 'Демо-данные' : 'Посл. месяц'}
          </span>
        </div>

        {/* Speech Bubble Container */}
        <div className="relative bg-white dark:bg-ios-card-dark rounded-2xl p-3.5 shadow-sm text-xs leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap border border-gray-100 dark:border-gray-800/60 font-medium">
          {compiledText}
        </div>

        {/* iOS style actions */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setIsActionSheetOpen(true)}
            className="w-full py-3.5 bg-ios-blue hover:bg-ios-blue/95 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-md shadow-ios-blue/10"
          >
            <Share className="w-4 h-4" />
            <span>Поделиться / Отправить</span>
          </button>
        </div>
      </div>

      {/* iOS styled Action Sheet */}
      <AnimatePresence>
        {isActionSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsActionSheetOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            />

            {/* Sheet content */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="relative w-full max-w-[390px] mx-auto px-2.5 pb-safe z-10 select-none"
            >
              {/* Main Actions Container */}
              <div className="bg-white/90 dark:bg-[#1c1c1ecc]/90 backdrop-blur-xl rounded-[14px] overflow-hidden flex flex-col text-center divide-y divide-gray-200/50 dark:divide-white/10">
                <div className="py-3 px-4 text-center">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                    Отправить показания
                  </span>
                  {name && (
                    <p className="text-[13px] font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                      для {name}
                    </p>
                  )}
                </div>

                {/* Option: Native Share (System Menu) */}
                <button
                  type="button"
                  onClick={async () => {
                    setIsActionSheetOpen(false);
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: 'Показания счетчиков',
                          text: compiledText
                        });
                      } catch (err) {
                        // ignored
                      }
                    } else {
                      handleCopyText();
                    }
                  }}
                  className="w-full py-3.5 text-center text-ios-blue text-[17px] font-medium hover:bg-gray-100/50 dark:hover:bg-white/5 active:bg-gray-200/50 dark:active:bg-white/10 transition-colors"
                >
                  {navigator.share ? 'Системное меню Share' : 'Поделиться'}
                </button>

                {/* Option: Copy Text */}
                <button
                  type="button"
                  onClick={() => {
                    setIsActionSheetOpen(false);
                    handleCopyText();
                  }}
                  className="w-full py-3.5 text-center text-ios-blue text-[17px] font-medium hover:bg-gray-100/50 dark:hover:bg-white/5 active:bg-gray-200/50 dark:active:bg-white/10 transition-colors"
                >
                  {copied ? 'Скопировано!' : 'Скопировать текст'}
                </button>
              </div>

              {/* Cancel Button Container */}
              <div className="mt-2 mb-2.5">
                <button
                  type="button"
                  onClick={() => setIsActionSheetOpen(false)}
                  className="w-full py-3.5 bg-white dark:bg-[#1c1c1e] text-ios-blue text-[17px] font-bold rounded-[14px] text-center active:scale-98 transition-all"
                >
                  Отмена
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </form>
  );
};

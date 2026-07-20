import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  INITIAL_READINGS,
  INITIAL_TARIFFS,
  INITIAL_LANDLORD,
  INITIAL_REMINDER
} from './initialData';
import { MeterReading, TariffConfig, LandlordConfig, ReminderConfig } from './types';
import { calculateReadings, CalculatedReading, formatRussianMonth } from './utils/calculations';
import { safeStorage } from './utils/storage';
import {
  initAuth,
  googleSignIn,
  googleSignInRedirect,
  checkRedirectResult,
  logoutGoogle,
  createGoogleSpreadsheet,
  syncReadingsToGoogleSheet
} from './utils/googleSheets';
import { User as FirebaseUser } from 'firebase/auth';

// Component Imports
import { IOSNotification } from './components/iOSNotification';
import { IOSModal } from './components/IOSModal';
import { ReadingsList } from './components/ReadingsList';
import { ReadingForm } from './components/ReadingForm';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { TariffSettings } from './components/TariffSettings';
import { LandlordSettings } from './components/LandlordSettings';
import { ReminderSettings } from './components/ReminderSettings';

// Icons Import
import {
  Plus,
  Compass,
  TrendingUp,
  User,
  Settings,
  Bell,
  CheckCircle,
  Wifi,
  Battery,
  Moon,
  Sun,
  Grid,
  FileText,
  BookmarkCheck,
  Smartphone,
  Check,
  Save,
  Droplet,
  Zap
} from 'lucide-react';

type TabType = 'readings' | 'analytics' | 'landlord' | 'tariffs' | 'reminders';

const RubleIcon = ({ className = "w-5.5 h-5.5" }: { className?: string }) => (
  <span className={`${className} inline-flex items-center justify-center font-bold text-[17px] leading-none select-none`} style={{ fontStyle: 'normal' }}>
    ₽
  </span>
);

export default function App() {
  // State Initialization from LocalStorage or Defaults
  const [readings, setReadings] = useState<MeterReading[]>(() => {
    try {
      const saved = safeStorage.getItem('meter_readings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // If they have legacy demo data (detected by id '1' or the old single-tariff fallback), clear it to start fresh
          if (parsed.some((r: any) => r.id === '1' || r.id === 1) || (parsed.length > 0 && parsed[0].electricity === 3410 && parsed[0].electricityHalfPeak === undefined)) {
            return [];
          }
          return parsed;
        } catch (e) {
          return INITIAL_READINGS;
        }
      }
    } catch (e) {
      console.warn('Failed to access safeStorage for readings:', e);
    }
    return INITIAL_READINGS;
  });

  const [tariffs, setTariffs] = useState<TariffConfig>(() => {
    try {
      const saved = safeStorage.getItem('meter_tariffs');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Migrate old structure to electricityTariffType if missing
          if (!parsed.electricityTariffType) {
            if (parsed.isBiTariff === true) {
              parsed.electricityTariffType = 'double';
            } else if (parsed.isBiTariff === false) {
              parsed.electricityTariffType = 'single';
            } else {
              parsed.electricityTariffType = 'triple';
            }
          }
          return { ...INITIAL_TARIFFS, ...parsed };
        } catch (e) {
          return INITIAL_TARIFFS;
        }
      }
    } catch (e) {
      console.warn('Failed to access safeStorage for tariffs:', e);
    }
    return INITIAL_TARIFFS;
  });

  const [landlord, setLandlord] = useState<LandlordConfig>(() => {
    try {
      const saved = safeStorage.getItem('meter_landlord');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (!parsed.tenantName) {
            parsed.tenantName = INITIAL_LANDLORD.tenantName || 'Алексей';
          }
          if (parsed.messageTemplate && !parsed.messageTemplate.includes('{cold_cost}')) {
            parsed.messageTemplate = INITIAL_LANDLORD.messageTemplate;
          }
          return parsed;
        } catch (e) {
          return INITIAL_LANDLORD;
        }
      }
    } catch (e) {
      console.warn('Failed to access safeStorage for landlord:', e);
    }
    return INITIAL_LANDLORD;
  });

  const [reminder, setReminder] = useState<ReminderConfig>(() => {
    try {
      const saved = safeStorage.getItem('meter_reminder');
      return saved ? JSON.parse(saved) : INITIAL_REMINDER;
    } catch (e) {
      console.warn('Failed to access safeStorage for reminder:', e);
    }
    return INITIAL_REMINDER;
  });

  // Google Sheets States
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() => {
    try {
      return safeStorage.getItem('google_spreadsheet_id');
    } catch {
      return null;
    }
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Initialize Google Auth session on mount
  useEffect(() => {
    let active = true;
    
    // Check for redirect login result first (Safari and iOS compatibility)
    const handleRedirectResult = async () => {
      try {
        const res = await checkRedirectResult();
        if (res && active) {
          setGoogleUser(res.user);
          setGoogleToken(res.accessToken);
          
          // Auto sync if spreadsheet is connected
          const savedSpreadsheetId = safeStorage.getItem('google_spreadsheet_id');
          if (savedSpreadsheetId) {
            await syncToSheets(res.accessToken, savedSpreadsheetId, readings);
          }
        }
      } catch (err) {
        console.error('Error handling Google Redirect result:', err);
      }
    };
    handleRedirectResult();

    const unsubscribe = initAuth(
      (user, token) => {
        if (active) {
          setGoogleUser(user);
          setGoogleToken(token);
        }
      },
      () => {
        if (active) {
          setGoogleUser(null);
          setGoogleToken(null);
        }
      }
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [readings]);

  // UI States
  const [activeTab, setActiveTab] = useState<TabType>('readings');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [readingToEdit, setReadingToEdit] = useState<MeterReading | undefined>(undefined);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = safeStorage.getItem('meter_dark_mode');
      if (saved !== null) {
        return saved === 'true';
      }
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
    } catch (e) {
      console.warn('Failed to access safeStorage or matchMedia for dark mode:', e);
    }
    return false;
  });
  
  // Save dark mode setting
  useEffect(() => {
    try {
      safeStorage.setItem('meter_dark_mode', isDarkMode.toString());
    } catch (e) {
      console.warn('Failed to save dark mode setting:', e);
    }
  }, [isDarkMode]);

  // Simulated Notification States
  const [isNotificationActive, setIsNotificationActive] = useState(false);
  
  // Real-time Clock for iOS status bar
  const [systemTime, setSystemTime] = useState('20:12');

  // Synchronize localStorage on states update
  useEffect(() => {
    try {
      safeStorage.setItem('meter_readings', JSON.stringify(readings));
    } catch (e) {
      console.warn('Failed to save readings:', e);
    }
  }, [readings]);

  useEffect(() => {
    try {
      safeStorage.setItem('meter_tariffs', JSON.stringify(tariffs));
    } catch (e) {
      console.warn('Failed to save tariffs:', e);
    }
  }, [tariffs]);

  useEffect(() => {
    try {
      safeStorage.setItem('meter_landlord', JSON.stringify(landlord));
    } catch (e) {
      console.warn('Failed to save landlord config:', e);
    }
  }, [landlord]);

  useEffect(() => {
    try {
      safeStorage.setItem('meter_reminder', JSON.stringify(reminder));
    } catch (e) {
      console.warn('Failed to save reminder config:', e);
    }
  }, [reminder]);

  // Update real-time iOS Status clock
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const hrs = d.getHours().toString().padStart(2, '0');
      const mins = d.getMinutes().toString().padStart(2, '0');
      setSystemTime(`${hrs}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Sync dark mode preference with document class
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Calculate consumption and bills
  const calculatedReadings = calculateReadings(readings, tariffs);

  // Sorting helper to find latest previous reading relative to date
  const getPreviousReadingForDate = (dateStr: string, editId?: string): MeterReading | undefined => {
    const filtered = readings.filter(r => r.id !== editId);
    const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date)); // descending
    return sorted.find(r => r.date < dateStr);
  };

  // Synchronize values to Google Spreadsheet helper
  const syncToSheets = async (
    targetToken: string,
    targetSpreadsheetId: string,
    targetReadings: MeterReading[]
  ) => {
    setIsSyncing(true);
    try {
      const computed = calculateReadings(targetReadings, tariffs);
      await syncReadingsToGoogleSheet(
        targetToken,
        targetSpreadsheetId,
        computed,
        tariffs.currency
      );
      console.log('Successfully synchronized with Google Sheets');
    } catch (err: any) {
      console.error('Failed to sync with Google Sheets:', err);
      // Fail silently for background auto-sync, but we can log it.
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        
        // If they already have a spreadsheetId, auto sync after logging in!
        if (spreadsheetId) {
          await syncToSheets(res.accessToken, spreadsheetId, readings);
        }
      }
    } catch (err: any) {
      alert(`❌ Ошибка авторизации: ${err.message || err}`);
    }
  };

  const handleGoogleLoginRedirect = async () => {
    try {
      await googleSignInRedirect();
    } catch (err: any) {
      alert(`❌ Ошибка авторизации (Redirect): ${err.message || err}`);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logoutGoogle();
      setGoogleUser(null);
      setGoogleToken(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleCreateSpreadsheet = async () => {
    if (!googleToken) {
      alert('⚠️ Пожалуйста, сначала войдите через Google.');
      return;
    }
    setIsSyncing(true);
    try {
      const newId = await createGoogleSpreadsheet(googleToken, 'Показания счетчиков ЖКХ (Мои счетчики)');
      setSpreadsheetId(newId);
      try {
        safeStorage.setItem('google_spreadsheet_id', newId);
      } catch (e) {
        console.warn(e);
      }
      
      // Auto sync immediately!
      await syncToSheets(googleToken, newId, readings);
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      alert('✅ Google Таблица успешно создана на вашем Google Диске и подключена к приложению!');
    } catch (err: any) {
      alert(`❌ Ошибка создания таблицы: ${err.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveSpreadsheetId = (id: string | null) => {
    setSpreadsheetId(id);
    try {
      if (id) {
        safeStorage.setItem('google_spreadsheet_id', id);
        // Auto-sync immediately to ensure table structure is created/updated
        if (googleToken) {
          syncToSheets(googleToken, id, readings);
        }
      } else {
        safeStorage.removeItem('google_spreadsheet_id');
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleManualSync = async () => {
    if (!googleToken || !spreadsheetId) {
      alert('⚠️ Синхронизация невозможна. Проверьте подключение.');
      return;
    }
    await syncToSheets(googleToken, spreadsheetId, readings);
    alert('✅ Все данные успешно синхронизированы с Google Таблицей!');
  };

  // Add or Edit reading submission handler
  const handleSaveReading = (formData: Omit<MeterReading, 'id'>) => {
    let updatedReadings: MeterReading[];
    if (readingToEdit) {
      // Edit mode
      updatedReadings = readings.map(r => (r.id === readingToEdit.id ? { ...formData, id: readingToEdit.id } : r));
      setReadings(updatedReadings);
      setReadingToEdit(undefined);
    } else {
      // Add mode
      const newReading: MeterReading = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9)
      };
      updatedReadings = [...readings, newReading];
      setReadings(updatedReadings);
      
      // Fire satisfying success confetti on successful entry!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 }
      });
    }
    setIsModalOpen(false);

    // Auto sync to Google Sheets if logged in and spreadsheet is connected
    if (googleToken && spreadsheetId) {
      syncToSheets(googleToken, spreadsheetId, updatedReadings);
    }
  };

  // Delete reading handler
  const handleDeleteReading = (readingId: string) => {
    const confirmDelete = window.confirm('❌ Вы уверены, что хотите удалить эту запись?');
    if (confirmDelete) {
      const updatedReadings = readings.filter(r => r.id !== readingId);
      setReadings(updatedReadings);

      // Auto sync to Google Sheets if logged in and spreadsheet is connected
      if (googleToken && spreadsheetId) {
        syncToSheets(googleToken, spreadsheetId, updatedReadings);
      }
    }
  };

  // Select reading for editing
  const handleEditReading = (readingId: string) => {
    const found = readings.find(r => r.id === readingId);
    if (found) {
      setReadingToEdit(found);
      setIsModalOpen(true);
    }
  };

  // Share report helper (switches view to Landlord and pops context)
  const handleShareReading = (calc: CalculatedReading) => {
    setActiveTab('landlord');
    // Scroll view if needed, and fire a small success pop
    confetti({
      particleCount: 30,
      spread: 40,
      colors: ['#007aff', '#34c759']
    });
  };

  // Simulate notification banner slide-down
  const triggerSimulation = () => {
    setIsNotificationActive(true);
  };

  // Action callback inside simulated push banner
  const handleNotificationAction = () => {
    setActiveTab('readings');
    setReadingToEdit(undefined);
    setIsModalOpen(true); // Open bottom sheet to type readings immediately!
  };

  // Backup file handler
  const handleExportData = () => {
    const dataStr = JSON.stringify({ readings, tariffs, landlord, reminder }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Communal_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Restore backup handler
  const handleImportData = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.readings && Array.isArray(parsed.readings)) {
        setReadings(parsed.readings);
        if (parsed.tariffs) setTariffs(parsed.tariffs);
        if (parsed.landlord) setLandlord(parsed.landlord);
        if (parsed.reminder) setReminder(parsed.reminder);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  // Reset to default pre-loaded state
  const handleResetData = () => {
    setReadings(INITIAL_READINGS);
    setTariffs(INITIAL_TARIFFS);
    setLandlord(INITIAL_LANDLORD);
    setReminder(INITIAL_REMINDER);
  };

  // Determine baseline reference for form
  const activePreviousReading = readingToEdit
    ? getPreviousReadingForDate(readingToEdit.date, readingToEdit.id)
    : readings.length > 0
    ? [...readings].sort((a, b) => b.date.localeCompare(a.date))[0] // latest reading overall is default base
    : undefined;

  return (
    <div className="h-[100dvh] w-full max-w-full overflow-x-hidden md:min-h-screen md:h-auto bg-[#e5e5ea] dark:bg-[#121212] flex items-center justify-center p-0 md:p-6 transition-colors duration-300">
      
      {/* iOS Simulated Notification Banner */}
      <IOSNotification
        show={isNotificationActive}
        onClose={() => setIsNotificationActive(false)}
        onAction={handleNotificationAction}
        dayOfMonth={reminder.dayOfMonth}
      />

      {/* Main Responsive iPhone Enclosure */}
      <div className="w-full h-full md:h-[840px] md:max-w-[412px] md:rounded-[42px] md:border-[12px] md:border-[#000000] dark:md:border-[#2a2a2c] md:shadow-2xl relative overflow-hidden bg-[#f2f2f7] dark:bg-black flex flex-col font-sans transition-all">
        
        {/* iPhone Dynamic Island Mock & Status Bar */}
        <div className="hidden md:flex h-11 px-6 items-center justify-between text-[13px] font-bold text-black dark:text-white shrink-0 select-none bg-white/75 dark:bg-black/75 backdrop-blur-md z-30 border-b border-gray-100 dark:border-gray-900/40">
          <span>{systemTime}</span>
          
          {/* iOS Dynamic Island Sensor Dot on Desktop view */}
          <div className="hidden md:block w-28 h-5.5 rounded-full bg-black absolute left-1/2 -translate-x-1/2 top-1 shadow-inner" />

          <div className="flex items-center gap-1.5">
            <Wifi className="w-4 h-4" />
            <span className="text-[10px]">LTE</span>
            <Battery className="w-5 h-5 shrink-0" />
          </div>
        </div>

        {/* Dynamic Theme Switch & Title Header Inside App */}
        <div className="px-4 py-3 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-2.5">
            {/* iOS Styled App Icon */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-orange-400 p-0.5 shadow-md flex items-center justify-center relative overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-white/5 dark:bg-black/5 backdrop-blur-[0.5px]" />
              <div className="relative flex items-center justify-center">
                <Droplet className="w-4 h-4 text-white fill-white/20 -mr-0.5 drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.35)]" />
                <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300/30 -ml-0.5 drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.35)]" />
              </div>
            </div>
            <div>
              <h1 className="text-base font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                <span>Мои счетчики</span>
              </h1>
              <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Учет воды и энергии</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Dark Mode Switch */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Переключить тему оформления"
            >
              {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            {/* Quick Trigger Form Button */}
            {activeTab === 'readings' && (
              <button
                onClick={() => {
                  setReadingToEdit(undefined);
                  setIsModalOpen(true);
                }}
                className="p-2 rounded-xl bg-ios-blue text-white hover:bg-ios-blue/90 shadow-md shadow-ios-blue/15 active:scale-95 transition-all cursor-pointer"
                title="Добавить показания"
              >
                <Plus className="w-4.5 h-4.5" />
              </button>
            )}
          </div>
        </div>

        {/* Main Scrollable View Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-40 bg-[#f2f2f7] dark:bg-black">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              className="space-y-4"
            >
              {activeTab === 'readings' && (
                <div className="space-y-4">
                  {/* Mini info widget */}
                  {calculatedReadings.length > 0 && (
                    <div className="bg-gradient-to-r from-ios-blue to-ios-indigo rounded-[18px] p-4 text-white shadow-md flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-white/70 uppercase font-black tracking-wider">
                          Последний расчет
                        </span>
                        <h4 className="text-base font-bold mt-0.5">
                          {formatRussianMonth(calculatedReadings[calculatedReadings.length - 1].reading.date)}
                        </h4>
                        <p className="text-[11px] text-white/80 mt-1">
                          Всего: {calculatedReadings[calculatedReadings.length - 1].totalCost.toLocaleString('ru-RU')} {tariffs.currency}
                        </p>
                      </div>
                      
                      {/* Sharing quick action */}
                      <button
                        onClick={() => handleShareReading(calculatedReadings[calculatedReadings.length - 1])}
                        className="py-1.5 px-3 rounded-full bg-white text-ios-blue text-xs font-bold shadow-sm hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
                      >
                        Отправить 🚀
                      </button>
                    </div>
                  )}

                  {/* Main readings listing */}
                  <ReadingsList
                    calculatedReadings={calculatedReadings}
                    onEdit={handleEditReading}
                    onDelete={handleDeleteReading}
                    onShare={handleShareReading}
                    currency={tariffs.currency}
                  />
                </div>
              )}

              {activeTab === 'analytics' && (
                <AnalyticsCharts
                  calculatedReadings={calculatedReadings}
                  currency={tariffs.currency}
                />
              )}

              {activeTab === 'landlord' && (
                <LandlordSettings
                  config={landlord}
                  latestCalculatedReading={
                    calculatedReadings.length > 1
                      ? calculatedReadings[calculatedReadings.length - 1]
                      : undefined
                  }
                  currency={tariffs.currency}
                  onSave={setLandlord}
                />
              )}

              {activeTab === 'tariffs' && (
                <TariffSettings
                  tariffs={tariffs}
                  onSave={setTariffs}
                  readings={readings}
                  onSaveReadings={setReadings}
                />
              )}

              {activeTab === 'reminders' && (
                <ReminderSettings
                  config={reminder}
                  readings={readings}
                  onSave={setReminder}
                  onExportData={handleExportData}
                  onImportData={handleImportData}
                  onResetData={handleResetData}
                  onSaveReadings={setReadings}
                  
                  // Google Sheets Integration Props
                  googleUser={googleUser}
                  googleToken={googleToken}
                  spreadsheetId={spreadsheetId}
                  isSyncing={isSyncing}
                  onGoogleLogin={handleGoogleLogin}
                  onGoogleLoginRedirect={handleGoogleLoginRedirect}
                  onGoogleLogout={handleGoogleLogout}
                  onCreateSpreadsheet={handleCreateSpreadsheet}
                  onSyncToGoogleSheet={handleManualSync}
                  onSaveSpreadsheetId={handleSaveSpreadsheetId}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Fixed Bottom Action Panel */}
        {['readings', 'landlord', 'tariffs'].includes(activeTab) && (
          <div className="absolute bottom-20 left-0 right-0 bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-xl px-4 py-3 border-t border-gray-200/50 dark:border-gray-800/50 z-25 flex items-center justify-center">
            {activeTab === 'readings' && (
              <button
                onClick={() => {
                  setReadingToEdit(undefined);
                  setIsModalOpen(true);
                }}
                className="w-full py-3.5 bg-ios-blue hover:bg-ios-blue/95 text-white font-bold rounded-xl text-sm shadow-md shadow-ios-blue/15 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить показания</span>
              </button>
            )}

            {activeTab === 'landlord' && (
              <button
                type="submit"
                form="landlord-form"
                className="w-full py-3.5 bg-ios-green hover:bg-ios-green/95 text-white font-bold rounded-xl text-sm shadow-md shadow-ios-green/15 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Сохранить изменения</span>
              </button>
            )}

            {activeTab === 'tariffs' && (
              <button
                type="submit"
                form="tariff-form"
                className="w-full py-3.5 bg-ios-blue hover:bg-ios-blue/95 text-white font-bold rounded-xl text-sm shadow-md shadow-ios-blue/15 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Сохранить тарифы</span>
              </button>
            )}
          </div>
        )}

        {/* Sliding Bottom Modal Sheet for Entering/Editing readings */}
        <IOSModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setReadingToEdit(undefined);
          }}
          title={readingToEdit ? 'Редактировать запись' : 'Новые показания'}
        >
          <ReadingForm
            readingToEdit={readingToEdit}
            previousReading={activePreviousReading}
            tariffs={tariffs}
            onCancel={() => {
              setIsModalOpen(false);
              setReadingToEdit(undefined);
            }}
            onSave={handleSaveReading}
          />
        </IOSModal>

        {/* Elegant Native iOS Tab Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-white/80 dark:bg-[#1c1c1e]/85 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50 flex items-center justify-around px-2 pb-5 z-30 select-none">
          {/* Readings tab */}
          <button
            onClick={() => setActiveTab('readings')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              activeTab === 'readings'
                ? 'text-ios-blue scale-105'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <FileText className="w-5.5 h-5.5" />
            <span className="text-[10px] font-bold mt-1">Показания</span>
          </button>

          {/* Analytics tab */}
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              activeTab === 'analytics'
                ? 'text-ios-blue scale-105'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <TrendingUp className="w-5.5 h-5.5" />
            <span className="text-[10px] font-bold mt-1">Аналитика</span>
          </button>

          {/* Contact tab */}
          <button
            onClick={() => setActiveTab('landlord')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              activeTab === 'landlord'
                ? 'text-ios-blue scale-105'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <User className="w-5.5 h-5.5" />
            <span className="text-[10px] font-bold mt-1">Контакты</span>
          </button>

          {/* Tariffs tab */}
          <button
            onClick={() => setActiveTab('tariffs')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              activeTab === 'tariffs'
                ? 'text-ios-blue scale-105'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <RubleIcon className="w-5.5 h-5.5" />
            <span className="text-[10px] font-bold mt-1">Тарифы</span>
          </button>

          {/* Settings tab */}
          <button
            onClick={() => setActiveTab('reminders')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              activeTab === 'reminders'
                ? 'text-ios-blue scale-105'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Settings className="w-5.5 h-5.5" />
            <span className="text-[10px] font-bold mt-1">Настройки</span>
          </button>
        </div>

        {/* iPhone bottom home indicator bar on Desktop view */}
        <div className="hidden md:block absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 rounded-full bg-black/60 dark:bg-white/40 z-40" />

      </div>
    </div>
  );
}

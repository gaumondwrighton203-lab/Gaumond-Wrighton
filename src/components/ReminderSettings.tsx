import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { ReminderConfig, MeterReading } from '../types';
import { Bell, Clock, Calendar, AlertCircle, Download, Upload, RotateCcw, FileSpreadsheet, Cloud, Database, Link2, Unlink, RefreshCw, LogOut, Globe } from 'lucide-react';
import { User } from 'firebase/auth';

interface ReminderSettingsProps {
  config: ReminderConfig;
  readings: MeterReading[];
  onSave: (newConfig: ReminderConfig) => void;
  onExportData: () => void;
  onImportData: (jsonData: string) => boolean;
  onResetData: () => void;
  onSaveReadings: (newReadings: MeterReading[]) => void;
  
  // Google Sheets Props
  googleUser: User | null;
  googleToken: string | null;
  spreadsheetId: string | null;
  isSyncing: boolean;
  onGoogleLogin: () => Promise<void>;
  onGoogleLoginRedirect: () => Promise<void>;
  onGoogleLogout: () => Promise<void>;
  onCreateSpreadsheet: () => Promise<void>;
  onSyncToGoogleSheet: () => Promise<void>;
  onPullFromGoogleSheet: () => Promise<void>;
  onSaveSpreadsheetId: (id: string | null) => void;
}

export const ReminderSettings: React.FC<ReminderSettingsProps> = ({
  config,
  readings,
  onSave,
  onExportData,
  onImportData,
  onResetData,
  onSaveReadings,
  
  // Google Sheets Props destructuring
  googleUser,
  googleToken,
  spreadsheetId,
  isSyncing,
  onGoogleLogin,
  onGoogleLoginRedirect,
  onGoogleLogout,
  onCreateSpreadsheet,
  onSyncToGoogleSheet,
  onPullFromGoogleSheet,
  onSaveSpreadsheetId
}) => {
  const [enabled, setEnabled] = useState(config.enabled);
  const [dayOfMonth, setDayOfMonth] = useState(config.dayOfMonth);
  const [time, setTime] = useState(config.time);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const spreadsheetInputRef = useRef<HTMLInputElement>(null);
  const [isEditingId, setIsEditingId] = useState(false);
  const [tempId, setTempId] = useState(spreadsheetId || '');

  const handleToggle = () => {
    const nextVal = !enabled;
    setEnabled(nextVal);
    onSave({ enabled: nextVal, dayOfMonth, time });
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const day = parseInt(e.target.value);
    setDayOfMonth(day);
    onSave({ enabled, dayOfMonth: day, time });
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value;
    setTime(t);
    onSave({ enabled, dayOfMonth, time: t });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const success = onImportData(text);
        if (success) {
          alert('✅ Данные успешно импортированы!');
        } else {
          alert('❌ Ошибка при импорте. Убедитесь, что формат файла корректен.');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Export readings to Excel (.xlsx)
  const handleExportExcel = () => {
    if (readings.length === 0) {
      alert('⚠️ Нет показаний для экспорта!');
      return;
    }

    const data = readings.map(r => ({
      'Дата': r.date,
      'Холодная вода (м³)': r.coldWater,
      'Горячая вода (м³)': r.hotWater,
      'Электричество T1 (Пик) (кВт·ч)': r.electricity,
      'Электричество T2 (Полупик) (кВт·ч)': r.electricityHalfPeak || 0,
      'Электричество T3 (Ночь) (кВт·ч)': r.electricityNight || 0,
      'Электричество Сумма (кВт·ч)': r.electricityTotal || (r.electricity + (r.electricityHalfPeak || 0) + (r.electricityNight || 0)),
      'Заметки': r.notes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Показания');

    // Auto-fit columns
    const maxLens = Object.keys(data[0] || {}).map(key => {
      let maxLen = key.length;
      data.forEach(row => {
        const val = String((row as any)[key] || '');
        if (val.length > maxLen) maxLen = val.length;
      });
      return { wch: maxLen + 3 };
    });
    worksheet['!cols'] = maxLens;

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Communal_Readings_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export readings to CSV
  const handleExportCSV = () => {
    if (readings.length === 0) {
      alert('⚠️ Нет показаний для экспорта!');
      return;
    }

    const data = readings.map(r => ({
      'Дата': r.date,
      'Холодная вода (м³)': r.coldWater,
      'Горячая вода (м³)': r.hotWater,
      'Электричество T1 (кВт·ч)': r.electricity,
      'Электричество T2 (кВт·ч)': r.electricityHalfPeak || 0,
      'Электричество T3 (кВт·ч)': r.electricityNight || 0,
      'Заметки': r.notes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    
    // Use UTF-8 BOM so Russian characters open correctly in Excel
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvOutput], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Communal_Readings_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import readings from CSV/Excel
  const handleImportSpreadsheet = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        let workbook;

        if (fileExt === 'csv') {
          const text = new TextDecoder('utf-8').decode(data as ArrayBuffer);
          workbook = XLSX.read(text, { type: 'string' });
        } else {
          workbook = XLSX.read(data, { type: 'array' });
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (rawRows.length === 0) {
          alert('❌ Файл пуст или имеет неверный формат.');
          return;
        }

        let added = 0;
        let updated = 0;
        const updatedReadings = [...readings];

        rawRows.forEach((row: any, idx) => {
          const keys = Object.keys(row);
          const getVal = (possibleKeys: string[]) => {
            const foundKey = keys.find(k => possibleKeys.some(pk => k.toLowerCase().includes(pk.toLowerCase())));
            return foundKey ? Number(row[foundKey]) : undefined;
          };

          const getStringVal = (possibleKeys: string[]) => {
            const foundKey = keys.find(k => possibleKeys.some(pk => k.toLowerCase().includes(pk.toLowerCase())));
            return foundKey ? String(row[foundKey]) : undefined;
          };

          // Find date
          let dateStr = getStringVal(['дата', 'date']) || new Date().toISOString().split('T')[0];
          
          // Parse serial Excel date
          if (/^\d+(\.\d+)?$/.test(dateStr)) {
            const serial = Number(dateStr);
            const dateObj = XLSX.SSF.parse_date_code(serial);
            if (dateObj) {
              const pad = (num: number) => String(num).padStart(2, '0');
              dateStr = `${dateObj.y}-${pad(dateObj.m)}-${pad(dateObj.d)}`;
            }
          } else {
            // Check Russian DD.MM.YYYY format
            const parts = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
            if (parts) {
              const day = parts[1].padStart(2, '0');
              const month = parts[2].padStart(2, '0');
              let year = parts[3];
              if (year.length === 2) year = '20' + year;
              dateStr = `${year}-${month}-${day}`;
            }
          }

          const coldWater = getVal(['холодная', 'cold', 'хв']) ?? 0;
          const hotWater = getVal(['горячая', 'hot', 'гв']) ?? 0;
          const electricity = getVal(['электричество t1', 'электричество пик', 't1', 'electricity', 'электричество']) ?? 0;
          const electricityHalfPeak = getVal(['электричество t2', 'полупик', 't2', 'halfpeak', 'полу']);
          const electricityNight = getVal(['электричество t3', 'ночь', 't3', 'night']);
          const notes = getStringVal(['заметки', 'примечание', 'notes', 'комментарий']) || '';

          const newReading: MeterReading = {
            id: 'import-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substring(2, 6),
            date: dateStr,
            coldWater,
            hotWater,
            electricity,
            electricityHalfPeak: electricityHalfPeak !== undefined ? electricityHalfPeak : undefined,
            electricityNight: electricityNight !== undefined ? electricityNight : undefined,
            notes
          };

          const existingIdx = updatedReadings.findIndex(r => r.date === dateStr);
          if (existingIdx !== -1) {
            updatedReadings[existingIdx] = {
              ...updatedReadings[existingIdx],
              coldWater: newReading.coldWater,
              hotWater: newReading.hotWater,
              electricity: newReading.electricity,
              electricityHalfPeak: newReading.electricityHalfPeak !== undefined ? newReading.electricityHalfPeak : updatedReadings[existingIdx].electricityHalfPeak,
              electricityNight: newReading.electricityNight !== undefined ? newReading.electricityNight : updatedReadings[existingIdx].electricityNight,
              notes: newReading.notes || updatedReadings[existingIdx].notes || ''
            };
            updated++;
          } else {
            updatedReadings.push(newReading);
            added++;
          }
        });

        // Sort chronologically
        updatedReadings.sort((a, b) => a.date.localeCompare(b.date));
        onSaveReadings(updatedReadings);

        alert(`📊 Успешно импортировано!\n• Добавлено новых записей: ${added}\n• Обновлено существующих: ${updated}`);
      } catch (err) {
        alert('❌ Ошибка при чтении или анализе структуры файла Excel/CSV.');
      }
    };

    reader.readAsArrayBuffer(file);
    if (spreadsheetInputRef.current) {
      spreadsheetInputRef.current.value = '';
    }
  };

  const triggerReset = () => {
    const confirmReset = window.confirm(
      '⚠️ Вы уверены, что хотите сбросить все внесенные показания и настройки к демонстрационным? Ваши текущие данные будут утеряны.'
    );
    if (confirmReset) {
      onResetData();
      alert('🔄 Успешно сброшено к исходному состоянию.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Reminders Setup Panel */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-[18px] border border-black/[0.04] dark:border-white/[0.05] overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-black/20 border-b border-gray-100 dark:border-gray-800/60 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Напоминания о счетчиках
          </span>
          <Bell className="w-3.5 h-3.5 text-gray-400" />
        </div>

        {/* Enabled State Toggle Row */}
        <div className="px-4 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/40">
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-gray-900 dark:text-white">Включить напоминания</span>
            <span className="text-[10px] text-gray-500">Отправлять push-уведомление каждый месяц</span>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 outline-none ${
              enabled ? 'bg-ios-green' : 'bg-gray-300 dark:bg-gray-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow-md ${
                enabled ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {/* Day Select Row */}
        {enabled && (
          <>
            <div className="px-4 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/40 bg-black/[0.005] dark:bg-white/[0.005]">
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-gray-900 dark:text-white">Число месяца</span>
                <span className="text-[10px] text-gray-500">Рекомендуемый день для отправки показаний</span>
              </div>
              <div className="flex items-center gap-1.5">
                <select
                  value={dayOfMonth}
                  onChange={handleDayChange}
                  className="px-2.5 py-1.5 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-bold text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-ios-blue cursor-pointer"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}-е число
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Time Select Row */}
            <div className="px-4 py-3.5 flex items-center justify-between bg-black/[0.005] dark:bg-white/[0.005]">
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-gray-900 dark:text-white">Время напоминания</span>
                <span className="text-[10px] text-gray-500">Уведомление придет в указанный час</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="time"
                  value={time}
                  onChange={handleTimeChange}
                  className="px-2.5 py-1.5 bg-gray-50 dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-bold text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-ios-blue cursor-pointer"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Google Sheets Integration Section */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-[18px] border border-black/[0.04] dark:border-white/[0.05] p-4 space-y-3">
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <FileSpreadsheet className="w-4 h-4 text-[#0f9d58]" />
          <span>Синхронизация с Google Таблицами</span>
        </h3>

        {window.self !== window.top && (
          <div className="p-2.5 bg-ios-blue/5 dark:bg-ios-blue/10 border border-ios-blue/15 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 text-ios-blue">
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[10px] font-bold">Ограничение Safari/iOS в режиме превью</span>
            </div>
            <p className="text-[9px] text-gray-600 dark:text-gray-300 leading-normal">
              Браузеры (особенно Safari на macOS/iOS) блокируют передачу данных авторизации Google внутри фреймов. Если вы получаете ошибку или окно входа не открывается, пожалуйста, <strong>откройте приложение в новой вкладке</strong> кнопкой в правом верхнем углу интерфейса AI Studio, либо используйте ссылку:
            </p>
            <div className="pt-1 flex flex-col gap-1">
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] text-ios-blue font-bold hover:underline break-all"
              >
                {window.location.href} ↗
              </a>
            </div>
          </div>
        )}

        {!googleUser ? (
          <div className="space-y-2.5">
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Вы можете автоматически сохранять ваши показания в таблицу на вашем Google Диске. Поддерживается синхронизация всех расчетов в реальном времени.
            </p>
            
            {/* Custom styled Google Sign In button (Popup) */}
            <button
              onClick={onGoogleLogin}
              className="w-full flex items-center justify-center gap-2.5 bg-white dark:bg-white text-gray-700 font-bold px-4 py-3 border border-gray-200 dark:border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm text-xs cursor-pointer active:scale-98"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>Войти через всплывающее окно</span>
            </button>

            {/* Google Sign In button (Redirect) */}
            <button
              onClick={onGoogleLoginRedirect}
              className="w-full flex items-center justify-center gap-2.5 bg-ios-blue hover:bg-ios-blue/95 text-white font-bold px-4 py-3 rounded-xl transition-all shadow-md shadow-ios-blue/10 text-xs cursor-pointer active:scale-98"
            >
              <svg className="w-4 h-4 shrink-0 bg-white p-0.5 rounded-full" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>Войти через перенаправление (Safari/iOS)</span>
            </button>
            <p className="text-[9px] text-center text-gray-400 italic">
              Рекомендуется использовать "Перенаправление" на смартфонах и в браузере Safari.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* User Profile Info */}
            <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-100 dark:border-gray-800/40">
              <div className="flex items-center gap-2">
                {googleUser.photoURL ? (
                  <img src={googleUser.photoURL} alt={googleUser.displayName || ''} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full border border-gray-200" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-ios-blue text-white flex items-center justify-center font-bold text-xs uppercase">
                    {(googleUser.displayName || googleUser.email || 'G').charAt(0)}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-[12px] font-bold text-gray-900 dark:text-white leading-tight">
                    {googleUser.displayName || 'Google Пользователь'}
                  </span>
                  <span className="text-[10px] text-gray-500 leading-none mt-0.5">
                    {googleUser.email}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onGoogleLogout}
                className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-ios-red dark:hover:text-ios-red hover:bg-ios-red/10 dark:hover:bg-ios-red/10 transition-colors"
                title="Выйти из Google"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Token expiry note */}
            {!googleToken && (
              <div className="p-2.5 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/20 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-yellow-600 dark:text-yellow-500 leading-normal">
                  Сессия Google истекла. Пожалуйста, войдите снова, чтобы разрешить синхронизацию с таблицей.
                </p>
              </div>
            )}

            {googleToken && (
              <>
                {/* Spreadsheet Connection State */}
                {!spreadsheetId ? (
                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-500">
                      У вас пока нет подключенной таблицы. Вы можете создать новую на Google Диске или указать ID существующей.
                    </p>

                    {isEditingId ? (
                      <div className="space-y-2 p-2.5 bg-gray-50 dark:bg-[#1a1a1c] border border-gray-100 dark:border-gray-800 rounded-xl">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">ID Google Таблицы</label>
                        <input
                          type="text"
                          value={tempId}
                          onChange={(e) => setTempId(e.target.value)}
                          placeholder="Вставьте ID или полную ссылку на таблицу"
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-medium text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-ios-blue"
                        />
                        <div className="flex justify-end gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingId(false);
                              setTempId('');
                            }}
                            className="px-2.5 py-1 rounded-md text-[10px] font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            Отмена
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!tempId.trim()) return;
                              // Extract ID if link was pasted
                              let finalId = tempId.trim();
                              const match = finalId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
                              if (match && match[1]) {
                                finalId = match[1];
                              }
                              onSaveSpreadsheetId(finalId);
                              setIsEditingId(false);
                            }}
                            className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-ios-blue text-white hover:bg-ios-blue/90 transition-colors"
                          >
                            Сохранить
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={onCreateSpreadsheet}
                          disabled={isSyncing}
                          className="py-2.5 px-3 rounded-xl bg-ios-blue/10 hover:bg-ios-blue/15 text-ios-blue font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          {isSyncing ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Cloud className="w-3.5 h-3.5" />
                          )}
                          <span>Создать таблицу</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setTempId('');
                            setIsEditingId(true);
                          }}
                          className="py-2.5 px-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          <span>Указать ID</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Linked Spreadsheet Card */}
                    <div className="p-3 bg-ios-green/5 dark:bg-ios-green/10 border border-ios-green/20 rounded-xl flex items-start justify-between">
                      <div className="flex items-start gap-2.5">
                        <Database className="w-4 h-4 text-ios-green mt-0.5 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[12px] font-bold text-gray-900 dark:text-white leading-tight">Таблица подключена!</span>
                          <a
                            href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-ios-blue hover:underline font-bold mt-1 inline-flex items-center gap-0.5 truncate"
                          >
                            <span>Открыть в Google Таблицах</span>
                            <Globe className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Отключить интеграцию с этой таблицей? Данные на Google Диске не будут удалены.')) {
                            onSaveSpreadsheetId(null);
                          }
                        }}
                        className="text-gray-400 hover:text-ios-red transition-colors p-1"
                        title="Отключить таблицу"
                      >
                        <Unlink className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Sync Actions */}
                    <div className="flex flex-col gap-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        {/* Pull from sheets */}
                        <button
                          type="button"
                          onClick={onPullFromGoogleSheet}
                          disabled={isSyncing}
                          className="py-2.5 px-3 rounded-xl bg-ios-blue hover:bg-ios-blue/95 text-white font-bold text-xs shadow-md shadow-ios-blue/10 flex items-center justify-center gap-1.5 active:scale-98 transition-all disabled:opacity-70 disabled:pointer-events-none cursor-pointer"
                        >
                          {isSyncing ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span>Загрузить данные</span>
                        </button>

                        {/* Push to sheets */}
                        <button
                          type="button"
                          onClick={onSyncToGoogleSheet}
                          disabled={isSyncing}
                          className="py-2.5 px-3 rounded-xl bg-ios-green hover:bg-ios-green/95 text-white font-bold text-xs shadow-md shadow-ios-green/10 flex items-center justify-center gap-1.5 active:scale-98 transition-all disabled:opacity-70 disabled:pointer-events-none cursor-pointer"
                        >
                          {isSyncing ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          <span>Выгрузить данные</span>
                        </button>
                      </div>

                      <div className="px-1 text-[10px] text-gray-500 leading-normal space-y-1">
                        <p>🔄 <strong>Автосинхронизация:</strong> любые изменения показаний автоматически отправляются в Google Таблицу.</p>
                        <p>📥 <strong>Загрузить данные:</strong> импортирует и объединит записи из Google Таблицы в приложение.</p>
                        <p>📤 <strong>Выгрузить данные:</strong> перезапишет показания в Google Таблице текущими данными из приложения.</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* CSV & Excel dedicated Section */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-[18px] border border-black/[0.04] dark:border-white/[0.05] p-4 space-y-3">
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <FileSpreadsheet className="w-4 h-4 text-ios-green" />
          <span>Таблица показаний (Excel / CSV)</span>
        </h3>
        
        <p className="text-[10px] text-gray-500 leading-relaxed">
          Вы можете скачать всю таблицу ваших показаний в формате Excel или CSV для дальнейшего анализа или загрузить записи из внешнего файла.
        </p>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* Excel Export */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="py-2.5 px-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-800/60 text-gray-800 dark:text-gray-200 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-ios-green/10 hover:border-ios-green/20 hover:text-ios-green dark:hover:text-ios-green transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Скачать Excel</span>
          </button>

          {/* CSV Export */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="py-2.5 px-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-800/60 text-gray-800 dark:text-gray-200 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-ios-green/10 hover:border-ios-green/20 hover:text-ios-green dark:hover:text-ios-green transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Скачать CSV</span>
          </button>

          {/* Upload Spreadsheet */}
          <button
            type="button"
            onClick={() => spreadsheetInputRef.current?.click()}
            className="col-span-2 py-3 px-3 rounded-xl bg-ios-green/10 hover:bg-ios-green/15 text-ios-green font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Загрузить Excel или CSV файл</span>
          </button>
          
          <input
            type="file"
            ref={spreadsheetInputRef}
            onChange={handleImportSpreadsheet}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
        </div>
      </div>

      {/* Data Administration Backup (Full Backup) */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-[18px] border border-black/[0.04] dark:border-white/[0.05] p-4 space-y-3">
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Резервная копия всего приложения (JSON)
        </h3>
        
        <p className="text-[10px] text-gray-500 leading-relaxed">
          Полный файл резервной копии содержит все показания, настройки тарифов, напоминаний и контактов.
        </p>

        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Export button */}
          <button
            type="button"
            onClick={onExportData}
            className="py-2.5 px-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-98 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Экспорт JSON</span>
          </button>

          {/* Import button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="py-2.5 px-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-98 transition-all"
          >
            <Upload className="w-3.5 h-3.5 text-gray-500" />
            <span>Импорт JSON</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json"
            className="hidden"
          />
        </div>

        {/* Danger reset button */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800/60 flex justify-end">
          <button
            type="button"
            onClick={triggerReset}
            className="py-2 px-3 text-[11px] text-ios-red bg-ios-red/10 hover:bg-ios-red/15 font-bold rounded-lg flex items-center gap-1 active:scale-98 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Сбросить все данные</span>
          </button>
        </div>
      </div>
    </div>
  );
};

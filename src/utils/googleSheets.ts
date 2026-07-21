import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { CalculatedReading } from './calculations';
import { safeStorage } from './storage';
import { MeterReading } from '../types';

// Dynamically configure authDomain for Netlify and Vercel proxying to fix Safari third-party cookie issue
const getDynamicFirebaseConfig = () => {
  const config = { ...firebaseConfig };
  if (typeof window !== 'undefined') {
    const isProxyAuth = window.location.hostname.includes('netlify.app') || 
                        window.location.hostname.includes('stirring-boba-d22fba') ||
                        window.location.hostname.includes('netlify.com') ||
                        window.location.hostname.includes('vercel.app');
    if (isProxyAuth) {
      config.authDomain = window.location.hostname;
    }
  }
  return config;
};

// Initialize Firebase App securely
const app = getApps().length === 0 ? initializeApp(getDynamicFirebaseConfig()) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Helper to save token to storage to handle page reloads
const saveAccessToken = (token: string) => {
  cachedAccessToken = token;
  try {
    safeStorage.setItem('google_access_token', token);
    safeStorage.setItem('google_access_token_time', Date.now().toString());
  } catch (e) {
    console.warn('Failed to save access token:', e);
  }
};

// Initialize token from storage if it is less than 55 minutes old
try {
  const savedToken = safeStorage.getItem('google_access_token');
  const savedTokenTime = safeStorage.getItem('google_access_token_time');
  if (savedToken && savedTokenTime) {
    const elapsed = Date.now() - parseInt(savedTokenTime, 10);
    if (elapsed < 55 * 60 * 1000) { // 55 minutes
      cachedAccessToken = savedToken;
    } else {
      safeStorage.removeItem('google_access_token');
      safeStorage.removeItem('google_access_token_time');
    }
  }
} catch (e) {
  console.warn('Failed to restore cached access token:', e);
}

// Check redirect result on load
export const checkRedirectResult = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        saveAccessToken(credential.accessToken);
        return { user: result.user, accessToken: credential.accessToken };
      }
    }
  } catch (error) {
    console.error('Ошибка getRedirectResult:', error);
  }
  return null;
};

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess: (user: User, token: string) => void,
  onAuthFailure: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess(user, cachedAccessToken);
      } else {
        // If logged in but token is not in cache (e.g., page reloaded),
        // we can trigger signInWithPopup or ask to sign in again.
        // We'll call failure to show sign-in button but keep user state.
        onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure();
    }
  });
};

// Google Sign-In with Popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Не удалось получить access token от Google Auth');
    }

    saveAccessToken(credential.accessToken);
    return { user: result.user, accessToken: cachedAccessToken! };
  } catch (error: any) {
    console.error('Ошибка входа Google (Popup):', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Google Sign-In with Redirect (for Safari and Mobile Safari/iOS)
export const googleSignInRedirect = async (): Promise<void> => {
  try {
    await signInWithRedirect(auth, provider);
  } catch (error: any) {
    console.error('Ошибка входа Google (Redirect):', error);
    throw error;
  }
};

// Log Out
export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  try {
    safeStorage.removeItem('google_access_token');
    safeStorage.removeItem('google_access_token_time');
  } catch (e) {
    console.warn('Failed to clear access token on logout:', e);
  }
};

// Get current token
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

// Create a new Google Spreadsheet
export const createGoogleSpreadsheet = async (accessToken: string, title: string): Promise<string> => {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title || 'Показания счетчиков ЖКХ',
      },
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Не удалось создать Google Таблицу');
  }

  const data = await response.json();
  return data.spreadsheetId;
};

// Export and Overwrite meter readings in the Spreadsheet
export const syncReadingsToGoogleSheet = async (
  accessToken: string,
  spreadsheetId: string,
  calculatedReadings: CalculatedReading[],
  currency: string
): Promise<void> => {
  // 0. Fetch Spreadsheet metadata dynamically to get the first sheet's real Name and SheetID.
  // This solves issues with locale-dependent sheet names ("Лист1" vs "Sheet1") and random sheet IDs.
  let sheetName = 'Sheet1';
  let realSheetId = 0;
  try {
    const metaResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    if (metaResponse.ok) {
      const metaData = await metaResponse.json();
      if (metaData.sheets && metaData.sheets.length > 0) {
        sheetName = metaData.sheets[0].properties.title || 'Sheet1';
        realSheetId = metaData.sheets[0].properties.sheetId ?? 0;
      }
    }
  } catch (metaErr) {
    console.warn('Could not fetch spreadsheet metadata, falling back to defaults:', metaErr);
  }

  // Define columns headers
  const headers = [
    'Месяц',
    'Дата показаний',
    'ХВС (показание, м³)',
    'ХВС (расход, м³)',
    'ХВС (сумма)',
    'ГВС (показание, м³)',
    'ГВС (расход, м³)',
    'ГВС (сумма)',
    'Водоотведение (расход, м³)',
    'Водоотведение (сумма)',
    'Электричество T1 (показание, кВт·ч)',
    'Электричество T1 (расход, кВт·ч)',
    'Электричество T1 (сумма)',
    'Электричество T2 (показание, кВт·ч)',
    'Электричество T2 (расход, кВт·ч)',
    'Электричество T2 (сумма)',
    'Электричество T3 (показание, кВт·ч)',
    'Электричество T3 (расход, кВт·ч)',
    'Электричество T3 (сумма)',
    'Заметки',
    `Итого к оплате (${currency})`
  ];

  // Map readings to sheet rows
  const rows = calculatedReadings.map((calc) => {
    // Format Russian Month
    let monthName = '';
    try {
      const dateObj = new Date(calc.reading.date);
      monthName = dateObj.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
    } catch {
      monthName = calc.reading.date;
    }

    return [
      monthName,
      calc.reading.date,
      calc.reading.coldWater,
      calc.coldDiff,
      calc.coldCost,
      calc.reading.hotWater,
      calc.hotDiff,
      calc.hotCost,
      calc.wastewaterDiff,
      calc.wastewaterCost,
      calc.reading.electricity,
      calc.elecDiff,
      calc.elecCost,
      calc.reading.electricityHalfPeak ?? '',
      calc.elecHalfPeakDiff || '',
      calc.elecHalfPeakCost || '',
      calc.reading.electricityNight ?? '',
      calc.elecNightDiff || '',
      calc.elecNightCost || '',
      calc.reading.notes || '',
      calc.totalCost
    ];
  });

  const allValues = [headers, ...rows];

  // 1. Write values to Spreadsheet.
  // We use the exact resolved sheetName to guarantee reliable cell writes.
  const range = `${sheetName}!A1:U${allValues.length}`;
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: allValues,
      }),
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Не удалось обновить данные в Google Таблице');
  }

  // 2. Format columns / headers using the actual dynamic realSheetId
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          // Bold and center headers (Row 0)
          {
            repeatCell: {
              range: {
                sheetId: realSheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: headers.length,
              },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    bold: true,
                  },
                  backgroundColor: {
                    red: 0.9,
                    green: 0.93,
                    blue: 0.98,
                  },
                  horizontalAlignment: 'CENTER',
                },
              },
              fields: 'userEnteredFormat(textFormat,backgroundColor,horizontalAlignment)',
            },
          },
          // Auto-resize columns
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: realSheetId,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: headers.length,
              },
            },
          },
        ],
      }),
    });
  } catch (err) {
    // Non-blocking formatting error, ignore
    console.warn('Formatting spreadsheet failed:', err);
  }
};

// Fetch readings from Google Spreadsheet
export const fetchReadingsFromGoogleSheet = async (
  accessToken: string,
  spreadsheetId: string
): Promise<MeterReading[]> => {
  // 1. Fetch sheet metadata to resolve sheet name
  let sheetName = 'Sheet1';
  try {
    const metaResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    if (metaResponse.ok) {
      const metaData = await metaResponse.json();
      if (metaData.sheets && metaData.sheets.length > 0) {
        sheetName = metaData.sheets[0].properties.title || 'Sheet1';
      }
    }
  } catch (metaErr) {
    console.warn('Could not fetch spreadsheet metadata for read, falling back to default Sheet1:', metaErr);
  }

  // 2. Fetch sheet values
  const valuesResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName + '!A1:U1000')}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!valuesResponse.ok) {
    const errData = await valuesResponse.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Не удалось загрузить данные из Google Таблицы');
  }

  const data = await valuesResponse.json();
  const values: any[][] = data.values;

  if (!values || values.length <= 1) {
    return [];
  }

  // 3. Parse headers
  const headers = values[0].map(h => String(h).toLowerCase());
  
  // Find indices based on headers
  const dateIdx = headers.findIndex(h => h.includes('дата') || h.includes('date'));
  const coldIdx = headers.findIndex(h => h.includes('хвс') || h.includes('холодная') || h.includes('cold'));
  const hotIdx = headers.findIndex(h => h.includes('гвс') || h.includes('горячая') || h.includes('hot'));
  const elecIdx = headers.findIndex(h => h.includes('t1') || h.includes('электричество t1') || h.includes('пик') || (h.includes('электричество') && !h.includes('t2') && !h.includes('t3')));
  const elecT2Idx = headers.findIndex(h => h.includes('t2') || h.includes('полупик') || h.includes('электричество t2'));
  const elecT3Idx = headers.findIndex(h => h.includes('t3') || h.includes('ночь') || h.includes('электричество t3'));
  const notesIdx = headers.findIndex(h => h.includes('заметки') || h.includes('note') || h.includes('примечание'));

  // Fallback fixed indices if header search fails
  const getIndex = (foundIdx: number, defaultIdx: number) => foundIdx !== -1 ? foundIdx : defaultIdx;

  const finalDateIdx = getIndex(dateIdx, 1);
  const finalColdIdx = getIndex(coldIdx, 2);
  const finalHotIdx = getIndex(hotIdx, 5);
  const finalElecIdx = getIndex(elecIdx, 10);
  const finalElecT2Idx = getIndex(elecT2Idx, 13);
  const finalElecT3Idx = getIndex(elecT3Idx, 16);
  const finalNotesIdx = getIndex(notesIdx, 19);

  // 4. Map rows to MeterReading
  const readings: MeterReading[] = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row || row.length <= Math.max(finalDateIdx, finalColdIdx, finalHotIdx)) {
      continue;
    }

    const dateStr = String(row[finalDateIdx] || '').trim();
    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      continue;
    }

    const parseNum = (val: any) => {
      if (val === undefined || val === null || val === '') return undefined;
      // Handle comma decimal separators common in Russian locales
      const normalized = String(val).replace(',', '.').replace(/\s/g, '');
      const num = Number(normalized);
      return isNaN(num) ? undefined : num;
    };

    const coldWater = parseNum(row[finalColdIdx]) ?? 0;
    const hotWater = parseNum(row[finalHotIdx]) ?? 0;
    const electricity = parseNum(row[finalElecIdx]) ?? 0;
    const electricityHalfPeak = parseNum(row[finalElecT2Idx]);
    const electricityNight = parseNum(row[finalElecT3Idx]);
    const notes = row[finalNotesIdx] !== undefined ? String(row[finalNotesIdx]).trim() : undefined;

    readings.push({
      id: `gs-${dateStr}`, // Use stable ID from date to allow robust syncing and prevent duplicates
      date: dateStr,
      coldWater,
      hotWater,
      electricity,
      electricityHalfPeak: electricityHalfPeak !== undefined ? electricityHalfPeak : undefined,
      electricityNight: electricityNight !== undefined ? electricityNight : undefined,
      notes: notes || '',
    });
  }

  // Sort chronologically
  return readings.sort((a, b) => a.date.localeCompare(b.date));
};

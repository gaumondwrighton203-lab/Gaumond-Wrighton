import { doc, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import { db, auth } from './googleSheets';
import { TariffConfig } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const saveTariffsToFirestore = async (userId: string, tariffs: TariffConfig): Promise<void> => {
  const docPath = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    const dataToSave = {
      coldWaterRate: tariffs.coldWaterRate,
      hotWaterRate: tariffs.hotWaterRate,
      wastewaterRate: tariffs.wastewaterRate || 0,
      electricityRate: tariffs.electricityRate,
      electricityRateHalfPeak: tariffs.electricityRateHalfPeak || 0,
      electricityRateNight: tariffs.electricityRateNight || 0,
      electricityTariffType: tariffs.electricityTariffType || 'single',
      currency: tariffs.currency || '₽',
      updatedAt: new Date().toISOString()
    };
    await setDoc(docRef, dataToSave);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
};

export const loadTariffsFromFirestore = async (userId: string): Promise<TariffConfig | null> => {
  const docPath = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        coldWaterRate: Number(data.coldWaterRate) || 0,
        hotWaterRate: Number(data.hotWaterRate) || 0,
        wastewaterRate: Number(data.wastewaterRate) || 0,
        electricityRate: Number(data.electricityRate) || 0,
        electricityRateHalfPeak: data.electricityRateHalfPeak !== undefined ? Number(data.electricityRateHalfPeak) : undefined,
        electricityRateNight: data.electricityRateNight !== undefined ? Number(data.electricityRateNight) : undefined,
        electricityTariffType: data.electricityTariffType || 'single',
        currency: data.currency || '₽'
      } as TariffConfig;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }
};

// Check connection to Firestore at initial boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}


import { Question } from '../types';

const DB_NAME = 'PT_EXAM_DB';
const STORE_NAME = 'questions';
const DB_VERSION = 1;

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('year', 'year', { unique: false });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('displayNumber', 'displayNumber', { unique: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * 設問リストをDBに保存（既存のdisplayNumberがあれば上書き）
 */
export const saveQuestions = async (questions: Question[]): Promise<void> => {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('displayNumber');

    let currentIndex = 0;

    const processNext = () => {
      if (currentIndex >= questions.length) return;

      const q = questions[currentIndex];
      const getRequest = index.get(q.displayNumber);

      getRequest.onsuccess = () => {
        const existing = getRequest.result as Question | undefined;
        if (existing) {
          const updated = { ...q, id: existing.id };
          store.put(updated);
        } else {
          store.put(q);
        }
        currentIndex++;
        processNext();
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    };

    processNext();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const updateQuestionImages = async (imageMap: Record<string, string>): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const allQuestions = request.result as Question[];
      allQuestions.forEach(q => {
        const key = q.displayNumber.toLowerCase().trim();
        if (imageMap[key]) {
          q.imageUrl = imageMap[key];
          store.put(q);
        }
      });
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const getFilteredQuestions = async (years: string[], threshold: number, fields: string[]): Promise<Question[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      let results = request.result as Question[];
      if (years.length > 0) results = results.filter(q => years.includes(q.year));
      if (fields.length > 0) results = results.filter(q => fields.includes(q.category));
      results = results.filter(q => q.accuracyRate >= threshold);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
};

export const getAllYears = async (): Promise<string[]> => {
  const db = await openDB();
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const questions = request.result as Question[];
      const years = [...new Set(questions.map(q => q.year))].sort().reverse();
      resolve(years);
    };
  });
};

export const deleteYearData = async (year: string): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const targets = (request.result as Question[]).filter(q => q.year === year);
      targets.forEach(t => store.delete(t.id!));
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

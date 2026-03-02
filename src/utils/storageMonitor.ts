// src/utils/storageMonitor.ts

/**
 * Утилита для мониторинга изменений localStorage
 * Помогает найти что очищает токены Supabase
 */

class StorageMonitor {
  private originalSetItem: typeof localStorage.setItem;
  private originalRemoveItem: typeof localStorage.removeItem;
  private originalClear: typeof localStorage.clear;

  constructor() {
    this.originalSetItem = localStorage.setItem.bind(localStorage);
    this.originalRemoveItem = localStorage.removeItem.bind(localStorage);
    this.originalClear = localStorage.clear.bind(localStorage);
  }

  start() {
    // Перехватываем setItem
    localStorage.setItem = (key: string, value: string) => {
      if (key.includes('sb-') || key.includes('supabase')) {
        console.log('🟢 [STORAGE] SET:', key);
        console.trace(); // Показать stack trace
      }
      return this.originalSetItem(key, value);
    };

    // Перехватываем removeItem
    localStorage.removeItem = (key: string) => {
      if (key.includes('sb-') || key.includes('supabase')) {
        console.warn('🔴 [STORAGE] REMOVE:', key);
        console.trace(); // Показать откуда вызвано
      }
      return this.originalRemoveItem(key);
    };

    // Перехватываем clear
    localStorage.clear = () => {
      console.error('🚨 [STORAGE] CLEAR ALL!');
      console.trace();
      return this.originalClear();
    };

    console.log('✅ Storage monitor started');
  }

  stop() {
    localStorage.setItem = this.originalSetItem;
    localStorage.removeItem = this.originalRemoveItem;
    localStorage.clear = this.originalClear;
    console.log('❌ Storage monitor stopped');
  }
}

export const storageMonitor = new StorageMonitor();

// Запустить автоматически в dev режиме doar cu flag explicit
const shouldMonitorStorage = import.meta.env.DEV && import.meta.env.VITE_STORAGE_MONITOR === 'true';
if (shouldMonitorStorage) {
  storageMonitor.start();
  console.log('🔍 Storage monitoring enabled');
}

#!/usr/bin/env node
/**
 * 🌍 I18N Sync Script - Automatic Translation Scanner & Synchronizer
 * 
 * This script:
 * 1. Scans all TSX/TS files for hardcoded Romanian strings
 * 2. Extracts them and generates translation keys
 * 3. Adds missing keys to ro.json, en.json, ru.json
 * 4. Can optionally replace hardcoded strings with t('key') calls
 * 
 * Usage:
 *   node scripts/i18n-sync.js scan     - Scan and report hardcoded strings
 *   node scripts/i18n-sync.js sync     - Sync all JSON files (add missing keys)
 *   node scripts/i18n-sync.js translate - Auto-translate missing keys
 *   node scripts/i18n-sync.js full     - Full sync + translate
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const SRC_DIR = path.join(__dirname, '..', 'src');
const LOCALES_DIR = path.join(SRC_DIR, 'i18n', 'locales');

// Translation dictionaries for common words/phrases
const TRANSLATIONS = {
  // Common UI elements
  'Salvează': { en: 'Save', ru: 'Сохранить' },
  'Anulează': { en: 'Cancel', ru: 'Отмена' },
  'Șterge': { en: 'Delete', ru: 'Удалить' },
  'Editează': { en: 'Edit', ru: 'Редактировать' },
  'Adaugă': { en: 'Add', ru: 'Добавить' },
  'Căutare': { en: 'Search', ru: 'Поиск' },
  'Se încarcă...': { en: 'Loading...', ru: 'Загрузка...' },
  'Eroare': { en: 'Error', ru: 'Ошибка' },
  'Succes': { en: 'Success', ru: 'Успешно' },
  'Confirmă': { en: 'Confirm', ru: 'Подтвердить' },
  'Înapoi': { en: 'Back', ru: 'Назад' },
  'Următorul': { en: 'Next', ru: 'Далее' },
  'Închide': { en: 'Close', ru: 'Закрыть' },
  'Da': { en: 'Yes', ru: 'Да' },
  'Nu': { en: 'No', ru: 'Нет' },
  
  // Dashboard specific
  'Minute Vorbite': { en: 'Minutes Spoken', ru: 'Минуты разговоров' },
  'Distribuție Apeluri': { en: 'Call Distribution', ru: 'Распределение звонков' },
  'Performanță': { en: 'Performance', ru: 'Производительность' },
  'Metrici în timp real': { en: 'Real-time metrics', ru: 'Метрики в реальном времени' },
  'Top Agenți': { en: 'Top Agents', ru: 'Топ агенты' },
  'După numărul de apeluri': { en: 'By number of calls', ru: 'По количеству звонков' },
  'Apeluri Total': { en: 'Total Calls', ru: 'Всего звонков' },
  'Total Apeluri': { en: 'Total Calls', ru: 'Всего звонков' },
  'apeluri': { en: 'calls', ru: 'звонков' },
  'Dimineață': { en: 'Morning', ru: 'Утро' },
  'După-amiază': { en: 'Afternoon', ru: 'День' },
  'Seară': { en: 'Evening', ru: 'Вечер' },
  'Succes': { en: 'Success', ru: 'Успех' },
  'Răspuns': { en: 'Response', ru: 'Ответ' },
  'Calitate': { en: 'Quality', ru: 'Качество' },
  'vs luna trecută': { en: 'vs last month', ru: 'vs прошлый месяц' },
  'Luna aceasta': { en: 'This month', ru: 'Этот месяц' },
  'Vezi raport': { en: 'View Report', ru: 'Смотреть отчёт' },
  'View Report': { en: 'View Report', ru: 'Смотреть отчёт' },
  'Mediu': { en: 'Medium', ru: 'Средний' },
  'Scor General': { en: 'Overall Score', ru: 'Общий балл' },
  'Media tuturor metricilor': { en: 'Average of all metrics', ru: 'Среднее всех метрик' },
  'Bazat pe ultimele 30 zile': { en: 'Based on last 30 days', ru: 'За последние 30 дней' },
  'Vezi detalii': { en: 'See details', ru: 'Подробнее' },
  'Ultimele 7 zile': { en: 'Last 7 days', ru: 'Последние 7 дней' },
  'Rată succes': { en: 'Success Rate', ru: 'Успешность' },
  'Transcrieri salvate': { en: 'Saved Transcripts', ru: 'Сохранённые транскрипции' },
  'Сохранённые транскрипции': { en: 'Saved Transcripts', ru: 'Сохранённые транскрипции' },
  
  // Chart labels
  'Minute vorbite': { en: 'Minutes spoken', ru: 'Минуты разговоров' },
  'Număr apeluri': { en: 'Number of calls', ru: 'Количество звонков' },
  '7 zile': { en: '7 days', ru: '7 дней' },
  '30 zile': { en: '30 days', ru: '30 дней' },
  'min': { en: 'min', ru: 'мин' },
  '/apel': { en: '/call', ru: '/звонок' },
  
  // Agent related
  'Agent': { en: 'Agent', ru: 'Агент' },
  'Agenți': { en: 'Agents', ru: 'Агенты' },
  'Agent activat': { en: 'Agent activated', ru: 'Агент активирован' },
  'Agentul a fost activat cu succes': { en: 'Agent was activated successfully', ru: 'Агент успешно активирован' },
  'Agent dezactivat': { en: 'Agent deactivated', ru: 'Агент деактивирован' },
  'Agentul a fost dezactivat': { en: 'Agent was deactivated', ru: 'Агент деактивирован' },
  'Agent șters': { en: 'Agent deleted', ru: 'Агент удалён' },
  'Agentul a fost șters cu succes': { en: 'Agent was deleted successfully', ru: 'Агент успешно удалён' },
  'Agent duplicat': { en: 'Agent duplicated', ru: 'Агент дублирован' },
  'a fost creat cu succes': { en: 'was created successfully', ru: 'успешно создан' },
  'Nu s-a putut activa agentul': { en: 'Could not activate agent', ru: 'Не удалось активировать агента' },
  'Nu s-a putut dezactiva agentul': { en: 'Could not deactivate agent', ru: 'Не удалось деактивировать агента' },
  'Nu s-a putut șterge agentul complet. Verifică lista.': { en: 'Could not completely delete agent. Check the list.', ru: 'Не удалось полностью удалить агента. Проверьте список.' },
  'Nu s-a putut duplica agentul': { en: 'Could not duplicate agent', ru: 'Не удалось дублировать агента' },
  'Copie': { en: 'Copy', ru: 'Копия' },
  
  // Notifications / Toasts
  'Te-ai deconectat cu succes': { en: 'You have been logged out successfully', ru: 'Вы успешно вышли' },
  
  // Time periods
  'zile': { en: 'days', ru: 'дней' },
  'ore': { en: 'hours', ru: 'часов' },
  'minute': { en: 'minutes', ru: 'минут' },
  'secunde': { en: 'seconds', ru: 'секунд' },
  
  // Misc
  'Total': { en: 'Total', ru: 'Всего' },
  'Balance': { en: 'Balance', ru: 'Баланс' },
  'Upgrade': { en: 'Upgrade', ru: 'Улучшить' },
  'credits': { en: 'credits', ru: 'кредитов' },
  'Remaining': { en: 'Remaining', ru: 'Осталось' },
};

// Romanian patterns to detect
const ROMANIAN_PATTERNS = [
  /["'`]([A-ZĂÂÎȘȚ][a-zăâîșțşţ]+(?:\s+[a-zăâîșțşţA-ZĂÂÎȘȚ]+)*)["`']/g,  // Capitalized Romanian words
  /["'`]([Ss]e\s+[a-zăâîșț]+)["`']/g,  // "Se încarcă" type patterns
  /["'`]([Nn]u\s+[a-zăâîșț]+)["`']/g,  // "Nu există" type patterns
  /["'`](\d+\s+(?:apeluri|minute|ore|zile|agenți))["`']/g,  // Number + Romanian word
];

// Characters that indicate Romanian text
const ROMANIAN_CHARS = /[ăâîșțĂÂÎȘȚşţ]/;

// Load JSON file
function loadJSON(filepath) {
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${filepath}:`, error.message);
    return {};
  }
}

// Save JSON file with proper formatting
function saveJSON(filepath, data) {
  const content = JSON.stringify(data, null, 2);
  fs.writeFileSync(filepath, content + '\n', 'utf-8');
  console.log(`✅ Saved: ${filepath}`);
}

// Generate a key from a Romanian string
function generateKey(str, category = 'ui') {
  // Remove special characters and convert to camelCase
  const words = str
    .toLowerCase()
    .replace(/[ăâ]/g, 'a')
    .replace(/[îı]/g, 'i')
    .replace(/[șş]/g, 's')
    .replace(/[țţ]/g, 't')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0);
  
  if (words.length === 0) return null;
  
  const key = words[0] + words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  return `${category}.${key}`;
}

// Find all hardcoded strings in a file
function findHardcodedStrings(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const strings = new Set();
  
  // Match strings in JSX/TSX that look like Romanian
  const patterns = [
    /"([^"]+)"/g,
    /'([^']+)'/g,
    /`([^`$]+)`/g,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const str = match[1];
      
      // Skip if it's a path, URL, key, or code
      if (str.startsWith('/') || 
          str.startsWith('http') || 
          str.startsWith('#') ||
          str.includes('.') && !str.includes(' ') ||
          str.length < 2 ||
          str.length > 100 ||
          /^[a-z_]+$/.test(str) ||
          /^\d+$/.test(str) ||
          str.startsWith('t(') ||
          str.includes('{{')) {
        continue;
      }
      
      // Check if it contains Romanian characters or matches Romanian patterns
      if (ROMANIAN_CHARS.test(str) || isLikelyRomanian(str)) {
        strings.add(str);
      }
    }
  }
  
  return Array.from(strings);
}

// Check if a string is likely Romanian
function isLikelyRomanian(str) {
  const romanianWords = [
    'vorbite', 'apeluri', 'agenți', 'minute', 'distribuție', 'performanță',
    'succes', 'răspuns', 'calitate', 'metrici', 'timp', 'real', 'total',
    'salvat', 'șters', 'activat', 'dezactivat', 'duplicat', 'creat',
    'luna', 'zile', 'ore', 'dimineață', 'seară', 'după-amiază',
    'încarcă', 'eroare', 'confirmă', 'anulează', 'editează', 'adaugă',
    'căutare', 'filtrează', 'exportă', 'importă', 'toate', 'niciunul',
    'detalii', 'acțiuni', 'status', 'nume', 'descriere', 'activ', 'inactiv',
  ];
  
  const lowerStr = str.toLowerCase();
  return romanianWords.some(word => lowerStr.includes(word));
}

// Scan all source files
function scanSourceFiles() {
  const results = {};
  
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filepath = path.join(dir, file);
      const stat = fs.statSync(filepath);
      
      if (stat.isDirectory()) {
        // Skip node_modules, dist, etc.
        if (!['node_modules', 'dist', '.git', 'locales'].includes(file)) {
          walkDir(filepath);
        }
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const strings = findHardcodedStrings(filepath);
        if (strings.length > 0) {
          results[filepath] = strings;
        }
      }
    }
  }
  
  walkDir(SRC_DIR);
  return results;
}

// Get all existing keys from a JSON object (flattened)
function flattenKeys(obj, prefix = '') {
  let keys = {};
  
  for (const key in obj) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys = { ...keys, ...flattenKeys(obj[key], newKey) };
    } else {
      keys[newKey] = obj[key];
    }
  }
  
  return keys;
}

// Set a nested key in an object
function setNestedKey(obj, keyPath, value) {
  const keys = keyPath.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current)) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  
  current[keys[keys.length - 1]] = value;
}

// Sync translations between files
function syncTranslations() {
  console.log('\n🔄 Syncing translation files...\n');
  
  const roPath = path.join(LOCALES_DIR, 'ro.json');
  const enPath = path.join(LOCALES_DIR, 'en.json');
  const ruPath = path.join(LOCALES_DIR, 'ru.json');
  
  const ro = loadJSON(roPath);
  const en = loadJSON(enPath);
  const ru = loadJSON(ruPath);
  
  const roKeys = flattenKeys(ro);
  const enKeys = flattenKeys(en);
  const ruKeys = flattenKeys(ru);
  
  let addedToEn = 0;
  let addedToRu = 0;
  
  // Find keys in RO that are missing in EN or RU
  for (const [key, roValue] of Object.entries(roKeys)) {
    // Check EN
    if (!(key in enKeys)) {
      const translation = TRANSLATIONS[roValue]?.en || `[TODO] ${roValue}`;
      setNestedKey(en, key, translation);
      addedToEn++;
      console.log(`  📝 EN: Added "${key}" = "${translation}"`);
    }
    
    // Check RU
    if (!(key in ruKeys)) {
      const translation = TRANSLATIONS[roValue]?.ru || `[TODO] ${roValue}`;
      setNestedKey(ru, key, translation);
      addedToRu++;
      console.log(`  📝 RU: Added "${key}" = "${translation}"`);
    }
  }
  
  // Save updated files
  if (addedToEn > 0) {
    saveJSON(enPath, en);
  }
  if (addedToRu > 0) {
    saveJSON(ruPath, ru);
  }
  
  console.log(`\n✅ Sync complete!`);
  console.log(`   Added ${addedToEn} keys to EN`);
  console.log(`   Added ${addedToRu} keys to RU`);
  
  return { en, ru, ro };
}

// Add new dashboard translations
function addDashboardTranslations() {
  console.log('\n📊 Adding dashboard translations...\n');
  
  const roPath = path.join(LOCALES_DIR, 'ro.json');
  const enPath = path.join(LOCALES_DIR, 'en.json');
  const ruPath = path.join(LOCALES_DIR, 'ru.json');
  
  const ro = loadJSON(roPath);
  const en = loadJSON(enPath);
  const ru = loadJSON(ruPath);
  
  // Dashboard translations to add
  const dashboardKeys = {
    'dashboard.minutesSpoken': { ro: 'Minute Vorbite', en: 'Minutes Spoken', ru: 'Минуты разговоров' },
    'dashboard.callDistribution': { ro: 'Distribuție Apeluri', en: 'Call Distribution', ru: 'Распределение звонков' },
    'dashboard.totalCallsLabel': { ro: 'Total: {{count}} apeluri', en: 'Total: {{count}} calls', ru: 'Всего: {{count}} звонков' },
    'dashboard.performance': { ro: 'Performanță', en: 'Performance', ru: 'Производительность' },
    'dashboard.realTimeMetrics': { ro: 'Metrici în timp real', en: 'Real-time metrics', ru: 'Метрики в реальном времени' },
    'dashboard.topAgents': { ro: 'Top Agenți', en: 'Top Agents', ru: 'Топ агенты' },
    'dashboard.topAgentsSubtitle': { ro: 'După numărul de apeluri (total)', en: 'By number of calls (total)', ru: 'По количеству звонков (всего)' },
    'dashboard.totalCallsCard': { ro: 'Apeluri Total', en: 'Total Calls', ru: 'Всего звонков' },
    'dashboard.vsLastMonth': { ro: 'vs luna trecută', en: 'vs last month', ru: 'vs прошлый месяц' },
    'dashboard.thisMonth': { ro: 'Luna aceasta: {{count}} apeluri', en: 'This month: {{count}} calls', ru: 'Этот месяц: {{count}} звонков' },
    'dashboard.morning': { ro: 'Dimineață', en: 'Morning', ru: 'Утро' },
    'dashboard.afternoon': { ro: 'După-amiază', en: 'Afternoon', ru: 'День' },
    'dashboard.evening': { ro: 'Seară', en: 'Evening', ru: 'Вечер' },
    'dashboard.success': { ro: 'Succes', en: 'Success', ru: 'Успех' },
    'dashboard.response': { ro: 'Răspuns', en: 'Response', ru: 'Ответ' },
    'dashboard.quality': { ro: 'Calitate', en: 'Quality', ru: 'Качество' },
    'dashboard.calls': { ro: 'apeluri', en: 'calls', ru: 'звонков' },
    'dashboard.noAgentsData': { ro: 'Nu există agenți cu apeluri', en: 'No agents with calls', ru: 'Нет агентов с звонками' },
    'dashboard.viewReport': { ro: 'Vezi raport', en: 'View Report', ru: 'Смотреть отчёт' },
    'dashboard.calculatingStats': { ro: 'Se calculează statisticile...', en: 'Calculating statistics...', ru: 'Вычисление статистики...' },
    'dashboard.overallScore': { ro: 'Scor General', en: 'Overall Score', ru: 'Общий балл' },
    'dashboard.averageAllMetrics': { ro: 'Media tuturor metricilor', en: 'Average of all metrics', ru: 'Среднее всех метрик' },
    'dashboard.basedOnLast30Days': { ro: 'Bazat pe ultimele 30 zile', en: 'Based on last 30 days', ru: 'За последние 30 дней' },
    'dashboard.seeDetails': { ro: 'Vezi detalii', en: 'See details', ru: 'Подробнее' },
    'dashboard.last7Days': { ro: 'Ultimele 7 zile', en: 'Last 7 days', ru: 'Последние 7 дней' },
    'dashboard.days7': { ro: '7 zile', en: '7 days', ru: '7 дней' },
    'dashboard.days30': { ro: '30 zile', en: '30 days', ru: '30 дней' },
    'dashboard.medium': { ro: 'Mediu', en: 'Medium', ru: 'Средний' },
    'dashboard.minutesSpokenLabel': { ro: 'Minute vorbite', en: 'Minutes spoken', ru: 'Минуты разговоров' },
    'dashboard.callCount': { ro: 'Număr apeluri', en: 'Number of calls', ru: 'Количество звонков' },
  };
  
  // Agent toast translations
  const agentToastKeys = {
    'agents.toast.activated': { ro: 'Agent activat', en: 'Agent activated', ru: 'Агент активирован' },
    'agents.toast.activatedDesc': { ro: 'Agentul a fost activat cu succes', en: 'Agent was activated successfully', ru: 'Агент успешно активирован' },
    'agents.toast.deactivated': { ro: 'Agent dezactivat', en: 'Agent deactivated', ru: 'Агент деактивирован' },
    'agents.toast.deactivatedDesc': { ro: 'Agentul a fost dezactivat', en: 'Agent was deactivated', ru: 'Агент деактивирован' },
    'agents.toast.deleted': { ro: 'Agent șters', en: 'Agent deleted', ru: 'Агент удалён' },
    'agents.toast.deletedDesc': { ro: 'Agentul a fost șters cu succes', en: 'Agent was deleted successfully', ru: 'Агент успешно удалён' },
    'agents.toast.duplicated': { ro: 'Agent duplicat', en: 'Agent duplicated', ru: 'Агент дублирован' },
    'agents.toast.duplicatedDesc': { ro: 'a fost creat cu succes', en: 'was created successfully', ru: 'успешно создан' },
    'agents.toast.activateError': { ro: 'Nu s-a putut activa agentul', en: 'Could not activate agent', ru: 'Не удалось активировать агента' },
    'agents.toast.deactivateError': { ro: 'Nu s-a putut dezactiva agentul', en: 'Could not deactivate agent', ru: 'Не удалось деактивировать агента' },
    'agents.toast.deleteError': { ro: 'Nu s-a putut șterge agentul complet', en: 'Could not completely delete agent', ru: 'Не удалось полностью удалить агента' },
    'agents.toast.duplicateError': { ro: 'Nu s-a putut duplica agentul', en: 'Could not duplicate agent', ru: 'Не удалось дублировать агента' },
  };
  
  const allKeys = { ...dashboardKeys, ...agentToastKeys };
  let added = 0;
  
  for (const [keyPath, translations] of Object.entries(allKeys)) {
    setNestedKey(ro, keyPath, translations.ro);
    setNestedKey(en, keyPath, translations.en);
    setNestedKey(ru, keyPath, translations.ru);
    added++;
    console.log(`  ✅ Added: ${keyPath}`);
  }
  
  saveJSON(roPath, ro);
  saveJSON(enPath, en);
  saveJSON(ruPath, ru);
  
  console.log(`\n✅ Added ${added} translation keys to all files!`);
}

// Main command handler
const command = process.argv[2] || 'help';

console.log('🌍 I18N Sync Tool\n');

switch (command) {
  case 'scan':
    console.log('📂 Scanning source files for hardcoded strings...\n');
    const results = scanSourceFiles();
    
    let total = 0;
    for (const [file, strings] of Object.entries(results)) {
      const relativePath = path.relative(process.cwd(), file);
      console.log(`\n📄 ${relativePath}:`);
      for (const str of strings) {
        console.log(`   "${str}"`);
        total++;
      }
    }
    
    console.log(`\n📊 Found ${total} hardcoded strings in ${Object.keys(results).length} files`);
    break;
    
  case 'sync':
    syncTranslations();
    break;
    
  case 'translate':
  case 'add':
    addDashboardTranslations();
    break;
    
  case 'full':
    addDashboardTranslations();
    syncTranslations();
    break;
    
  case 'help':
  default:
    console.log(`
Usage: node scripts/i18n-sync.js <command>

Commands:
  scan      - Scan source files for hardcoded Romanian strings
  sync      - Sync all JSON files (add missing keys from RO to EN/RU)
  translate - Add predefined dashboard/agent translations
  full      - Run translate + sync
  help      - Show this help message

Examples:
  node scripts/i18n-sync.js scan
  node scripts/i18n-sync.js full
`);
}

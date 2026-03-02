#!/usr/bin/env node
/**
 * 🌍 I18N Complete Translations - Romanian to English and Russian
 * 
 * This script replaces all [TODO] placeholders with proper translations.
 * Contains a comprehensive dictionary for RO -> EN and RO -> RU translations.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '..', 'src', 'i18n', 'locales');

// Complete translation dictionary: Romanian -> English, Russian
const TRANSLATIONS = {
  // Common
  'Toate': { en: 'All', ru: 'Все' },
  'Niciunul': { en: 'None', ru: 'Ничего' },
  'Selectează': { en: 'Select', ru: 'Выбрать' },
  'Acțiuni': { en: 'Actions', ru: 'Действия' },
  'Detalii': { en: 'Details', ru: 'Детали' },
  'Status': { en: 'Status', ru: 'Статус' },
  'Data': { en: 'Date', ru: 'Дата' },
  'Nume': { en: 'Name', ru: 'Имя' },
  'Telefon': { en: 'Phone', ru: 'Телефон' },
  'Email': { en: 'Email', ru: 'Email' },
  'Note': { en: 'Notes', ru: 'Заметки' },
  'Descriere': { en: 'Description', ru: 'Описание' },
  'Activ': { en: 'Active', ru: 'Активен' },
  'Inactiv': { en: 'Inactive', ru: 'Неактивен' },
  'Copiază': { en: 'Copy', ru: 'Копировать' },
  'Copiat!': { en: 'Copied!', ru: 'Скопировано!' },
  'Reîmprospătează': { en: 'Refresh', ru: 'Обновить' },
  'Descarcă': { en: 'Download', ru: 'Скачать' },
  'Încarcă': { en: 'Upload', ru: 'Загрузить' },
  
  // Auth
  'Prenume': { en: 'First name', ru: 'Имя' },
  'Introdu prenumele': { en: 'Enter your first name', ru: 'Введите ваше имя' },
  'Introdu numele': { en: 'Enter your last name', ru: 'Введите вашу фамилию' },
  'Introdu adresa de email': { en: 'Enter your email address', ru: 'Введите ваш email' },
  'Introdu parola': { en: 'Enter your password', ru: 'Введите пароль' },
  'Minim 6 caractere': { en: 'Minimum 6 characters', ru: 'Минимум 6 символов' },
  'Autentificare': { en: 'Sign in', ru: 'Вход' },
  'Înregistrare': { en: 'Sign up', ru: 'Регистрация' },
  'Se autentifică...': { en: 'Signing in...', ru: 'Вход...' },
  'Se înregistrează...': { en: 'Signing up...', ru: 'Регистрация...' },
  'sau continuă cu': { en: 'or continue with', ru: 'или продолжить с' },
  'Resetează parola': { en: 'Reset password', ru: 'Сбросить пароль' },
  'Trimite link de resetare': { en: 'Send reset link', ru: 'Отправить ссылку' },
  'Link trimis!': { en: 'Link sent!', ru: 'Ссылка отправлена!' },
  'Verifică email-ul pentru instrucțiuni': { en: 'Check your email for instructions', ru: 'Проверьте email для инструкций' },
  'Înapoi la autentificare': { en: 'Back to login', ru: 'Вернуться к входу' },
  'Verifică email-ul': { en: 'Verify email', ru: 'Подтвердите email' },
  'Am trimis un link de verificare la adresa ta de email': { en: 'We sent a verification link to your email', ru: 'Мы отправили ссылку для подтверждения на ваш email' },
  'Retrimite email-ul': { en: 'Resend email', ru: 'Отправить повторно' },
  'Email trimis!': { en: 'Email sent!', ru: 'Email отправлен!' },
  'Verifică și folderul de spam': { en: 'Check your spam folder too', ru: 'Проверьте папку спам' },
  'Bine ai revenit': { en: 'Welcome back', ru: 'С возвращением' },
  'Bine ai venit la Kallina': { en: 'Welcome to Kallina', ru: 'Добро пожаловать в Kallina' },
  'Continuă cu email': { en: 'Continue with email', ru: 'Продолжить с email' },
  'Se conectează...': { en: 'Connecting...', ru: 'Подключение...' },
  'Te rugăm să îți confirmi adresa de email pentru a continua.': { en: 'Please confirm your email address to continue.', ru: 'Пожалуйста, подтвердите ваш email для продолжения.' },
  'Adresa de email': { en: 'Email address', ru: 'Адрес электронной почты' },
  'Trimite link': { en: 'Send link', ru: 'Отправить ссылку' },
  '📧 Ți-am trimis un email cu instrucțiuni pentru resetarea parolei!': { en: '📧 We sent you an email with password reset instructions!', ru: '📧 Мы отправили вам email с инструкциями по сбросу пароля!' },
  '📧 Email-ul de confirmare a fost retrimis! Verifică inbox-ul.': { en: '📧 Confirmation email resent! Check your inbox.', ru: '📧 Письмо с подтверждением отправлено повторно! Проверьте почту.' },
  '📧 Ți-am trimis un email de confirmare! Verifică inbox-ul (și folderul spam) și dă click pe link pentru a-ți activa contul.': { en: '📧 We sent you a confirmation email! Check your inbox (and spam folder) and click the link to activate your account.', ru: '📧 Мы отправили вам письмо для подтверждения! Проверьте почту (и папку спам) и нажмите на ссылку для активации аккаунта.' },
  
  // Auth errors
  'Te rugăm să introduci o adresă de email validă': { en: 'Please enter a valid email address', ru: 'Пожалуйста, введите корректный email' },
  'Parola trebuie să aibă cel puțin 8 caractere': { en: 'Password must be at least 8 characters', ru: 'Пароль должен содержать минимум 8 символов' },
  'Parola trebuie să conțină cel puțin o literă mare, o literă mică și o cifră': { en: 'Password must contain at least one uppercase letter, one lowercase letter, and one digit', ru: 'Пароль должен содержать минимум одну заглавную букву, одну строчную и одну цифру' },
  'Prenumele și numele sunt obligatorii': { en: 'First name and last name are required', ru: 'Имя и фамилия обязательны' },
  'Email sau parolă incorectă': { en: 'Invalid email or password', ru: 'Неверный email или пароль' },
  'Te rugăm să îți confirmi email-ul înainte de autentificare. Verifică inbox-ul sau folderul spam.': { en: 'Please confirm your email before signing in. Check your inbox or spam folder.', ru: 'Пожалуйста, подтвердите email перед входом. Проверьте почту или папку спам.' },
  'Un utilizator cu acest email există deja. Încearcă să te autentifici sau resetează parola.': { en: 'A user with this email already exists. Try signing in or reset your password.', ru: 'Пользователь с таким email уже существует. Попробуйте войти или сбросить пароль.' },
  'Eroare de bază de date. Te rugăm să încerci din nou.': { en: 'Database error. Please try again.', ru: 'Ошибка базы данных. Попробуйте снова.' },
  'Eroare la conectarea cu Google': { en: 'Error connecting with Google', ru: 'Ошибка подключения через Google' },
  'Eroare neașteptată': { en: 'Unexpected error', ru: 'Неожиданная ошибка' },
  'Eroare la autentificare': { en: 'Login error', ru: 'Ошибка входа' },
  'Eroare la înregistrare': { en: 'Signup error', ru: 'Ошибка регистрации' },
  'Eroare la trimiterea email-ului': { en: 'Error sending email', ru: 'Ошибка отправки email' },
  
  // Dashboard
  'Ieșire': { en: 'Sign out', ru: 'Выход' },
  'Agent creat': { en: 'Agent created', ru: 'Агент создан' },
  'Apel către': { en: 'Call to', ru: 'Звонок на' },
  'Conversație cu': { en: 'Conversation with', ru: 'Разговор с' },
  'Timp vorbire': { en: 'Talk time', ru: 'Время разговора' },
  
  // Agents
  'Se încarcă agenții...': { en: 'Loading agents...', ru: 'Загрузка агентов...' },
  'Nu ai încă agenți': { en: 'You don\'t have agents yet', ru: 'У вас ещё нет агентов' },
  'Creează primul tău agent AI pentru a începe': { en: 'Create your first AI agent to get started', ru: 'Создайте своего первого AI агента для начала' },
  'Creează Agent Nou': { en: 'Create New Agent', ru: 'Создать нового агента' },
  'Niciun agent găsit': { en: 'No agents found', ru: 'Агенты не найдены' },
  'Niciun agent nu corespunde căutării': { en: 'No agents match your search', ru: 'Нет агентов по вашему запросу' },
  'Șterge căutarea': { en: 'Clear search', ru: 'Очистить поиск' },
  'Dezactivează': { en: 'Deactivate', ru: 'Деактивировать' },
  'Activează': { en: 'Activate', ru: 'Активировать' },
  'Duplică': { en: 'Duplicate', ru: 'Дублировать' },
  'Se șterge...': { en: 'Deleting...', ru: 'Удаление...' },
  'Confirmă ștergerea': { en: 'Confirm deletion', ru: 'Подтвердите удаление' },
  'Ești sigur că vrei să ștergi agentul': { en: 'Are you sure you want to delete the agent', ru: 'Вы уверены, что хотите удалить агента' },
  ' Această acțiune este ireversibilă.': { en: ' This action cannot be undone.', ru: ' Это действие необратимо.' },
  'Testează Audio': { en: 'Test Audio', ru: 'Тест аудио' },
  'Agent ID': { en: 'Agent ID', ru: 'ID агента' },
  'Voce': { en: 'Voice', ru: 'Голос' },
  'Creat la': { en: 'Created at', ru: 'Создан' },
  
  // Quiz
  'Configurare cont': { en: 'Account setup', ru: 'Настройка аккаунта' },
  'Câteva întrebări pentru a personaliza experiența': { en: 'A few questions to personalize your experience', ru: 'Несколько вопросов для персонализации' },
  'Ajută-ne să personalizăm experiența ta': { en: 'Help us personalize your experience', ru: 'Помогите нам персонализировать ваш опыт' },
  'Cum te numești?': { en: 'What\'s your name?', ru: 'Как вас зовут?' },
  'Număr de telefon pentru contact': { en: 'Contact phone number', ru: 'Контактный номер телефона' },
  '+373 XX XXX XXX': { en: '+1 XXX XXX XXXX', ru: '+7 XXX XXX XX XX' },
  'Care este limba ta preferată?': { en: 'What is your preferred language?', ru: 'Какой язык вы предпочитаете?' },
  'Cum ai aflat despre Kallina?': { en: 'How did you hear about Kallina?', ru: 'Как вы узнали о Kallina?' },
  'Alege una sau mai multe opțiuni': { en: 'Choose one or more options', ru: 'Выберите один или несколько вариантов' },
  'Pasul': { en: 'Step', ru: 'Шаг' },
  'din': { en: 'of', ru: 'из' },
  'Informațiile tale sunt confidențiale și folosite doar pentru personalizarea experienței.': { en: 'Your information is confidential and used only for personalizing your experience.', ru: 'Ваша информация конфиденциальна и используется только для персонализации.' },
  'Prieteni sau Școală': { en: 'Friends or School', ru: 'Друзья или школа' },
  'De la serviciu': { en: 'From work', ru: 'От работы' },
  'Podcast': { en: 'Podcast', ru: 'Подкаст' },
  'Newsletter sau Blog': { en: 'Newsletter or Blog', ru: 'Рассылка или блог' },
  'În știri': { en: 'In the news', ru: 'В новостях' },
  'X (Twitter)': { en: 'X (Twitter)', ru: 'X (Twitter)' },
  'YouTube': { en: 'YouTube', ru: 'YouTube' },
  'Instagram': { en: 'Instagram', ru: 'Instagram' },
  'Google': { en: 'Google', ru: 'Google' },
  'TikTok': { en: 'TikTok', ru: 'TikTok' },
  'LinkedIn': { en: 'LinkedIn', ru: 'LinkedIn' },
  'Facebook': { en: 'Facebook', ru: 'Facebook' },
  'Nu îmi amintesc': { en: 'I don\'t remember', ru: 'Не помню' },
  'Altele': { en: 'Other', ru: 'Другое' },
  'Română': { en: 'Romanian', ru: 'Румынский' },
  'English': { en: 'English', ru: 'Английский' },
  'Русский': { en: 'Russian', ru: 'Русский' },
  'Cum se numește compania ta?': { en: 'What is your company name?', ru: 'Как называется ваша компания?' },
  'Ne ajută să personalizăm experiența': { en: 'Helps us personalize the experience', ru: 'Помогает нам персонализировать опыт' },
  'ex: Firma Mea SRL': { en: 'e.g.: My Company LLC', ru: 'например: Моя Компания ООО' },
  'În ce industrie activezi?': { en: 'What industry are you in?', ru: 'В какой отрасли вы работаете?' },
  'Ne ajută să îți oferim soluții relevante': { en: 'Helps us offer you relevant solutions', ru: 'Помогает нам предложить релевантные решения' },
  'Imobiliare': { en: 'Real Estate', ru: 'Недвижимость' },
  'Auto': { en: 'Automotive', ru: 'Автомобили' },
  'Sănătate': { en: 'Healthcare', ru: 'Здравоохранение' },
  'Finanțe': { en: 'Finance', ru: 'Финансы' },
  'Retail': { en: 'Retail', ru: 'Розничная торговля' },
  'Servicii': { en: 'Services', ru: 'Услуги' },
  'Tehnologie': { en: 'Technology', ru: 'Технологии' },
  'Educație': { en: 'Education', ru: 'Образование' },
  'Câte apeluri estimezi lunar?': { en: 'How many calls do you estimate monthly?', ru: 'Сколько звонков вы планируете в месяц?' },
  'Ne ajută să recomandăm planul potrivit': { en: 'Helps us recommend the right plan', ru: 'Помогает нам рекомендовать подходящий план' },
  'Sub 100 apeluri': { en: 'Under 100 calls', ru: 'Менее 100 звонков' },
  '100-500 apeluri': { en: '100-500 calls', ru: '100-500 звонков' },
  '500-1000 apeluri': { en: '500-1000 calls', ru: '500-1000 звонков' },
  '1000-5000 apeluri': { en: '1000-5000 calls', ru: '1000-5000 звонков' },
  'Peste 5000 apeluri': { en: 'Over 5000 calls', ru: 'Более 5000 звонков' },
  'Care este bugetul lunar pentru telefonie?': { en: 'What is your monthly telephony budget?', ru: 'Какой ваш месячный бюджет на телефонию?' },
  'Ajută la recomandarea planului optim': { en: 'Helps recommend the optimal plan', ru: 'Помогает рекомендовать оптимальный план' },
  'Sub $25': { en: 'Under $25', ru: 'До $25' },
  '$25 - $100': { en: '$25 - $100', ru: '$25 - $100' },
  '$100 - $250': { en: '$100 - $250', ru: '$100 - $250' },
  '$250 - $1000': { en: '$250 - $1000', ru: '$250 - $1000' },
  'Peste $1000': { en: 'Over $1000', ru: 'Более $1000' },
  'Câți angajați are compania ta?': { en: 'How many employees does your company have?', ru: 'Сколько сотрудников в вашей компании?' },
  'Ne ajută să înțelegem dimensiunea echipei': { en: 'Helps us understand team size', ru: 'Помогает понять размер команды' },
  'Doar eu': { en: 'Just me', ru: 'Только я' },
  '2-10 angajați': { en: '2-10 employees', ru: '2-10 сотрудников' },
  '11-50 angajați': { en: '11-50 employees', ru: '11-50 сотрудников' },
  '51-200 angajați': { en: '51-200 employees', ru: '51-200 сотрудников' },
  'Peste 200 angajați': { en: 'Over 200 employees', ru: 'Более 200 сотрудников' },
  'Cum ai aflat despre noi?': { en: 'How did you hear about us?', ru: 'Как вы о нас узнали?' },
  'Ne ajută să îmbunătățim marketingul': { en: 'Helps us improve marketing', ru: 'Помогает улучшить маркетинг' },
  'Căutare Google': { en: 'Google Search', ru: 'Поиск Google' },
  'Rețele sociale': { en: 'Social media', ru: 'Социальные сети' },
  'Recomandare': { en: 'Referral', ru: 'Рекомендация' },
  'Publicitate': { en: 'Advertising', ru: 'Реклама' },
  'Eveniment': { en: 'Event', ru: 'Мероприятие' },
  'Eroare la trimiterea emailului de verificare': { en: 'Error sending verification email', ru: 'Ошибка отправки письма подтверждения' },
  'Eroare la salvarea răspunsurilor': { en: 'Error saving responses', ru: 'Ошибка сохранения ответов' },
  
  // Contacts
  'Baza de Date Contacte': { en: 'Contacts Database', ru: 'База данных контактов' },
  'Gestionează toate contactele și istoricul interacțiunilor': { en: 'Manage all contacts and interaction history', ru: 'Управление контактами и историей взаимодействий' },
  'Contact Nou': { en: 'New Contact', ru: 'Новый контакт' },
  'Editează Contact': { en: 'Edit Contact', ru: 'Редактировать контакт' },
  'Șterge Contact': { en: 'Delete Contact', ru: 'Удалить контакт' },
  'Căutare și Filtrare': { en: 'Search and Filter', ru: 'Поиск и фильтрация' },
  'Caută după nume, telefon sau email...': { en: 'Search by name, phone or email...', ru: 'Поиск по имени, телефону или email...' },
  'Filtrează după status': { en: 'Filter by status', ru: 'Фильтр по статусу' },
  'Blocat': { en: 'Blocked', ru: 'Заблокирован' },
  'Istoric Interacțiuni': { en: 'Interaction History', ru: 'История взаимодействий' },
  'Nu există contacte': { en: 'No contacts', ru: 'Нет контактов' },
  'Adaugă primul tău contact': { en: 'Add your first contact', ru: 'Добавьте первый контакт' },
  'Total contacte': { en: 'Total contacts', ru: 'Всего контактов' },
  'Contacte active': { en: 'Active contacts', ru: 'Активных контактов' },
  'Interacțiuni recente': { en: 'Recent interactions', ru: 'Недавние взаимодействия' },
  'Ultimul contact': { en: 'Last contact', ru: 'Последний контакт' },
  
  // Analytics
  'Analiză Conversații': { en: 'Conversation Analytics', ru: 'Аналитика разговоров' },
  'Vizualizează și analizează toate conversațiile tale': { en: 'View and analyze all your conversations', ru: 'Просмотр и анализ всех ваших разговоров' },
  'Caută după telefon, nume sau sumar...': { en: 'Search by phone, name or summary...', ru: 'Поиск по телефону, имени или описанию...' },
  'După': { en: 'After', ru: 'После' },
  'Înainte': { en: 'Before', ru: 'До' },
  'Durată': { en: 'Duration', ru: 'Длительность' },
  'Scurt (0-30s)': { en: 'Short (0-30s)', ru: 'Короткий (0-30с)' },
  'Mediu (30s-2m)': { en: 'Medium (30s-2m)', ru: 'Средний (30с-2м)' },
  'Lung (2m+)': { en: 'Long (2m+)', ru: 'Длинный (2м+)' },
  'Scor AI': { en: 'AI Score', ru: 'Оценка AI' },
  'Etichete AI': { en: 'AI Tags', ru: 'Теги AI' },
  'Contact': { en: 'Contact', ru: 'Контакт' },
  'Cost': { en: 'Cost', ru: 'Стоимость' },
  'Concluzie': { en: 'Conclusion', ru: 'Заключение' },
  'Scor': { en: 'Score', ru: 'Оценка' },
  'Etichete': { en: 'Tags', ru: 'Теги' },
  'Sumar': { en: 'Summary', ru: 'Краткое описание' },
  'Nu există conversații': { en: 'No conversations', ru: 'Нет разговоров' },
  'Se încarcă conversațiile...': { en: 'Loading conversations...', ru: 'Загрузка разговоров...' },
  'Export CSV': { en: 'Export CSV', ru: 'Экспорт CSV' },
  'Telefoane unice': { en: 'Unique phones', ru: 'Уникальных номеров' },
  'Total conversații': { en: 'Total conversations', ru: 'Всего разговоров' },
  
  // Heatmap
  'Heatmap Activitate Apeluri': { en: 'Call Activity Heatmap', ru: 'Тепловая карта звонков' },
  'Volum Apeluri': { en: 'Call Volume', ru: 'Объём звонков' },
  'Rata Succes': { en: 'Success Rate', ru: 'Успешность' },
  'Ora de Vârf': { en: 'Peak Hour', ru: 'Пиковый час' },
  'Ziua de Vârf': { en: 'Peak Day', ru: 'Пиковый день' },
  'Nu sunt apeluri': { en: 'No calls', ru: 'Нет звонков' },
  'Nu există date disponibile pentru heatmap.': { en: 'No data available for heatmap.', ru: 'Нет данных для тепловой карты.' },
  'Legendă': { en: 'Legend', ru: 'Легенда' },
  'Nicio activitate': { en: 'No activity', ru: 'Нет активности' },
  'Scăzut': { en: 'Low', ru: 'Низкий' },
  'Ridicat': { en: 'High', ru: 'Высокий' },
  'Foarte ridicat': { en: 'Very high', ru: 'Очень высокий' },
  'Recomandări Inteligente': { en: 'Smart Recommendations', ru: 'Умные рекомендации' },
  'Ziua Optimă': { en: 'Optimal Day', ru: 'Оптимальный день' },
  'Programează în': { en: 'Schedule for', ru: 'Запланируйте на' },
  'pentru volum maxim': { en: 'for maximum volume', ru: 'для максимального объёма' },
  'Ora Optimă': { en: 'Optimal Hour', ru: 'Оптимальный час' },
  'la': { en: 'at', ru: 'в' },
  'pentru cel mai bun contact': { en: 'for best contact', ru: 'для лучшего контакта' },
  'Evită Perioada': { en: 'Avoid Period', ru: 'Избегайте периода' },
  'Evită': { en: 'Avoid', ru: 'Избегайте' },
  'activitate scăzută': { en: 'low activity', ru: 'низкая активность' },
  
  // Agent Comparison
  'Comparare Performanță Agenți AI': { en: 'AI Agents Performance Comparison', ru: 'Сравнение производительности AI агентов' },
  'Nu există date disponibile pentru agenții tăi.': { en: 'No data available for your agents.', ru: 'Нет данных для ваших агентов.' },
  'Apeluri': { en: 'Calls', ru: 'Звонки' },
  'Timp Total': { en: 'Total Time', ru: 'Общее время' },
  'Durată Medie': { en: 'Average Duration', ru: 'Средняя длительность' },
  'Cost Total': { en: 'Total Cost', ru: 'Общая стоимость' },
  'Cost Mediu': { en: 'Average Cost', ru: 'Средняя стоимость' },
  
  // Modals
  'Test Apel': { en: 'Test Call', ru: 'Тестовый звонок' },
  'Numărul tău de telefon': { en: 'Your phone number', ru: 'Ваш номер телефона' },
  '+40712345678': { en: '+1 555 123 4567', ru: '+7 999 123 4567' },
  'Agentul te va suna pe acest număr pentru a testa conversația': { en: 'The agent will call you on this number to test the conversation', ru: 'Агент позвонит вам по этому номеру для тестирования' },
  'Alege de pe ce număr să sune:': { en: 'Choose which number to call from:', ru: 'Выберите номер для звонка:' },
  'Apel Gratuit de Test': { en: 'Free Test Call', ru: 'Бесплатный тестовый звонок' },
  'GRATUIT': { en: 'FREE', ru: 'БЕСПЛАТНО' },
  'Numerele mele': { en: 'My numbers', ru: 'Мои номера' },
  'numere': { en: 'numbers', ru: 'номеров' },
  'Număr': { en: 'Number', ru: 'Номер' },
  'apeluri rămase/oră': { en: 'calls remaining/hour', ru: 'звонков осталось/час' },
  'Se încarcă numerele...': { en: 'Loading numbers...', ru: 'Загрузка номеров...' },
  'Nu ai numere de telefon în cont': { en: 'You don\'t have phone numbers in your account', ru: 'У вас нет номеров телефона в аккаунте' },
  'Selectează număr...': { en: 'Select number...', ru: 'Выберите номер...' },
  'Se Inițiază...': { en: 'Initiating...', ru: 'Запуск...' },
  'Limită atinsă': { en: 'Limit reached', ru: 'Лимит достигнут' },
  'Selectează număr': { en: 'Select number', ru: 'Выберите номер' },
  'Inițiază Test': { en: 'Start Test', ru: 'Начать тест' },
  'Nu s-a putut încărca': { en: 'Could not load', ru: 'Не удалось загрузить' },
  'Testează Vocea': { en: 'Test Voice', ru: 'Тест голоса' },
  'Ascultă cum sună vocea agentului': { en: 'Listen to how the agent voice sounds', ru: 'Послушайте, как звучит голос агента' },
  'Confirmare': { en: 'Confirmation', ru: 'Подтверждение' },
  'Ești sigur?': { en: 'Are you sure?', ru: 'Вы уверены?' },
  'Această acțiune nu poate fi anulată.': { en: 'This action cannot be undone.', ru: 'Это действие нельзя отменить.' },
  
  // Errors
  'A apărut o eroare. Te rugăm să încerci din nou.': { en: 'An error occurred. Please try again.', ru: 'Произошла ошибка. Попробуйте снова.' },
  'Eroare de rețea. Verifică conexiunea la internet.': { en: 'Network error. Check your internet connection.', ru: 'Ошибка сети. Проверьте подключение к интернету.' },
  'Nu ești autorizat să efectuezi această acțiune.': { en: 'You are not authorized to perform this action.', ru: 'У вас нет прав для выполнения этого действия.' },
  'Resursa nu a fost găsită.': { en: 'Resource not found.', ru: 'Ресурс не найден.' },
  'Eroare de server. Te rugăm să încerci mai târziu.': { en: 'Server error. Please try again later.', ru: 'Ошибка сервера. Попробуйте позже.' },
  'Datele introduse nu sunt valide.': { en: 'The entered data is not valid.', ru: 'Введённые данные недействительны.' },
  'Nu am putut iniția apelul de test. Încearcă din nou.': { en: 'Could not initiate test call. Try again.', ru: 'Не удалось начать тестовый звонок. Попробуйте снова.' },
  'Nu am putut încărca configurația pentru apeluri de test.': { en: 'Could not load test call configuration.', ru: 'Не удалось загрузить конфигурацию тестовых звонков.' },
  
  // Success
  'Salvat cu succes!': { en: 'Saved successfully!', ru: 'Успешно сохранено!' },
  'Șters cu succes!': { en: 'Deleted successfully!', ru: 'Успешно удалено!' },
  'Actualizat cu succes!': { en: 'Updated successfully!', ru: 'Успешно обновлено!' },
  'Creat cu succes!': { en: 'Created successfully!', ru: 'Успешно создано!' },
  'Copiat în clipboard!': { en: 'Copied to clipboard!', ru: 'Скопировано в буфер!' },
  'Trimis cu succes!': { en: 'Sent successfully!', ru: 'Успешно отправлено!' },
  'Apel inițiat': { en: 'Call initiated', ru: 'Звонок начат' },
  'Apelul de test a fost inițiat cu succes!': { en: 'Test call was initiated successfully!', ru: 'Тестовый звонок успешно начат!' },
  
  // Pagination
  'Anterior': { en: 'Previous', ru: 'Назад' },
  'Următor': { en: 'Next', ru: 'Далее' },
  'Pagina': { en: 'Page', ru: 'Страница' },
  'Se afișează': { en: 'Showing', ru: 'Показано' },
  'rezultate': { en: 'results', ru: 'результатов' },
  'Elemente pe pagină': { en: 'Items per page', ru: 'Элементов на странице' },
  
  // Calendar days
  'Lun': { en: 'Mon', ru: 'Пн' },
  'Mar': { en: 'Tue', ru: 'Вт' },
  'Mie': { en: 'Wed', ru: 'Ср' },
  'Joi': { en: 'Thu', ru: 'Чт' },
  'Vin': { en: 'Fri', ru: 'Пт' },
  'Sâm': { en: 'Sat', ru: 'Сб' },
  'Dum': { en: 'Sun', ru: 'Вс' },
  
  // Calendar months
  'Ianuarie': { en: 'January', ru: 'Январь' },
  'Februarie': { en: 'February', ru: 'Февраль' },
  'Martie': { en: 'March', ru: 'Март' },
  'Aprilie': { en: 'April', ru: 'Апрель' },
  'Mai': { en: 'May', ru: 'Май' },
  'Iunie': { en: 'June', ru: 'Июнь' },
  'Iulie': { en: 'July', ru: 'Июль' },
  'August': { en: 'August', ru: 'Август' },
  'Septembrie': { en: 'September', ru: 'Сентябрь' },
  'Octombrie': { en: 'October', ru: 'Октябрь' },
  'Noiembrie': { en: 'November', ru: 'Ноябрь' },
  'Decembrie': { en: 'December', ru: 'Декабрь' },
};

// Replace [TODO] with proper translations
function replaceTodoTranslations(obj, lang) {
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      replaceTodoTranslations(obj[key], lang);
    } else if (typeof obj[key] === 'string' && obj[key].startsWith('[TODO]')) {
      const roText = obj[key].replace('[TODO] ', '');
      
      if (TRANSLATIONS[roText]) {
        obj[key] = TRANSLATIONS[roText][lang];
        console.log(`  ✅ ${lang.toUpperCase()}: "${roText}" → "${obj[key]}"`);
      } else {
        console.log(`  ⚠️  ${lang.toUpperCase()}: No translation for "${roText}"`);
      }
    }
  }
}

// Load and save JSON
function loadJSON(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(content);
}

function saveJSON(filepath, data) {
  const content = JSON.stringify(data, null, 2);
  fs.writeFileSync(filepath, content + '\n', 'utf-8');
}

// Main
console.log('🌍 Completing translations...\n');

const enPath = path.join(LOCALES_DIR, 'en.json');
const ruPath = path.join(LOCALES_DIR, 'ru.json');

const en = loadJSON(enPath);
const ru = loadJSON(ruPath);

console.log('📝 Processing English translations:');
replaceTodoTranslations(en, 'en');

console.log('\n📝 Processing Russian translations:');
replaceTodoTranslations(ru, 'ru');

saveJSON(enPath, en);
console.log(`\n✅ Saved: ${enPath}`);

saveJSON(ruPath, ru);
console.log(`✅ Saved: ${ruPath}`);

console.log('\n✨ Translation complete!');

import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  X,
  MapPin,
  Plus,
  Trash2,
  Database,
  FileText,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
  Upload,
  Download,
  Search,
  ArrowLeft,
  Play,
  Loader2,
  Save,
} from 'lucide-react';
import { N8NNodeIOPanel } from './N8NNodeIOPanel';
import { toast } from 'sonner';

interface CityEntry {
  point_id: number;
  point_latin_name: string;
  // Extended fields from XML
  point_ru_name?: string;
  point_ua_name?: string;
  point_name?: string;
  country_name?: string;
  country_kod?: string;
  country_kod_two?: string;
  country_id?: number;
  latitude?: number;
  longitude?: number;
  population?: number;
  currency?: string;
}

interface NodeData {
  nodeName: string;
  nodeIcon?: string;
  data: any;
  itemCount?: number;
}

interface N8NCityLookupConfigProps {
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    config?: {
      query?: string;
      database?: string;
      databaseEntries?: CityEntry[];
    };
  };
  onClose: () => void;
  onSave: (config: any) => void;
  onExecutionUpdate?: (nodeId: string, data: { input?: any; output?: any }) => void;
  inputData?: any;
  outputData?: any;
  previousNodeLabel?: string;
  nodeSources?: NodeData[];
}

// Default database with cities - hardcoded for quick loading
const DEFAULT_CITY_DATABASE: CityEntry[] = [
  { point_id: 6, point_latin_name: 'Kyiv', point_ru_name: 'Киев', point_ua_name: 'Київ', point_name: 'Kiev', country_name: 'Ucraina', country_kod: 'UKR', country_kod_two: 'UA', country_id: 2, latitude: 50.440684, longitude: 30.490012, population: 2952301, currency: 'UAH' },
  { point_id: 143, point_latin_name: 'Bucuresti', point_ru_name: 'Бухарест', point_ua_name: 'Бухарест', point_name: 'Bucuresti', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 44.398153, longitude: 26.043196, population: 2354510, currency: 'RON' },
  { point_id: 15, point_latin_name: 'Odesa', point_ru_name: 'Одесса', point_ua_name: 'Одеса', point_name: 'Odesa', country_name: 'Ucraina', country_kod: 'UKR', country_kod_two: 'UA', country_id: 2, latitude: 46.476661066769, longitude: 30.708502253967, population: 1017022, currency: 'UAH' },
  { point_id: 333, point_latin_name: 'Zaporizhzhia', point_ru_name: 'Запорожье', point_ua_name: 'Запоріжжя', point_name: 'Zaporizhia', country_name: 'Ucraina', country_kod: 'UKR', country_kod_two: 'UA', country_id: 2, latitude: 47.804485812135, longitude: 35.185510218246, population: 766736, currency: 'UAH' },
  { point_id: 7, point_latin_name: 'Lviv', point_ru_name: 'Львов', point_ua_name: 'Львів', point_name: 'Lviv', country_name: 'Ucraina', country_kod: 'UKR', country_kod_two: 'UA', country_id: 2, latitude: 49.84033794386, longitude: 23.995424062014, population: 717273, currency: 'UAH' },
  { point_id: 40, point_latin_name: 'Chisinau', point_ru_name: 'Кишинев', point_ua_name: 'Кишинів', point_name: 'Chișinău', country_name: 'Moldova', country_kod: 'MDA', country_kod_two: 'MD', country_id: 3, latitude: 47.0251476441091, longitude: 28.8620001615295, population: 674500, currency: 'MDL' },
  { point_id: 14, point_latin_name: 'Vinnytsia', point_ru_name: 'Винница', point_ua_name: 'Вінниця', point_name: 'Vinnytsia', country_name: 'Ucraina', country_kod: 'UKR', country_kod_two: 'UA', country_id: 2, latitude: 49.236528873971, longitude: 28.483317509262, population: 369860, currency: 'UAH' },
  { point_id: 4673, point_latin_name: 'Iasi', point_ru_name: 'Яссы', point_ua_name: 'Ясси', point_name: 'Iași', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 47.159871, longitude: 27.589699, population: 340580, currency: 'RON' },
  { point_id: 386, point_latin_name: 'Cluj-Napoca', point_ru_name: 'Клуж-Напока', point_ua_name: 'Клуж-Напока', point_name: 'Cluj-Napoca', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 46.7861010081634, longitude: 23.5802722232651, population: 318027, currency: 'RON' },
  { point_id: 8, point_latin_name: 'Zhytomyr', point_ru_name: 'Житомир', point_ua_name: 'Житомир', point_name: 'Zhytomyr', country_name: 'Ucraina', country_kod: 'UKR', country_kod_two: 'UA', country_id: 2, latitude: 50.268700573235, longitude: 28.692102626984, population: 270046, currency: 'UAH' },
  { point_id: 95, point_latin_name: 'Chernivtsi', point_ru_name: 'Черновцы', point_ua_name: 'Чернівці', point_name: 'Cernăuți', country_name: 'Ucraina', country_kod: 'UKR', country_kod_two: 'UA', country_id: 2, latitude: 48.264862715885, longitude: 25.952039915344, population: 255084, currency: 'UAH' },
  { point_id: 13, point_latin_name: 'Ternopil', point_ru_name: 'Тернополь', point_ua_name: 'Тернопіль', point_name: 'Ternopil', country_name: 'Ucraina', country_kod: 'UKR', country_kod_two: 'UA', country_id: 2, latitude: 49.543898711386, longitude: 25.596731093254, population: 225004, currency: 'UAH' },
  { point_id: 16, point_latin_name: 'Ivano-Frankivsk', point_ru_name: 'Ивано-Франковск', point_ua_name: 'Івано-Франківськ', point_name: 'Ivano-Frankivsk', country_name: 'Ucraina', country_kod: 'UKR', country_kod_two: 'UA', country_id: 2, latitude: 48.944046, longitude: 24.690987, population: 223165, currency: 'UAH' },
  { point_id: 4032, point_latin_name: 'Bila Tserkva', point_ru_name: 'Белая Церковь', point_ua_name: 'Біла Церква', point_name: 'Bila Țerkva', country_name: 'Ucraina', country_kod: 'UKR', country_kod_two: 'UA', country_id: 2, latitude: 49.795331, longitude: 30.113746, population: 211205, currency: 'UAH' },
  { point_id: 385, point_latin_name: 'Oradea', point_ru_name: 'Орадя', point_ua_name: 'Орадя', point_name: 'Oradea', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 47.0735813129531, longitude: 21.9352195194183, population: 206527, currency: 'RON' },
  { point_id: 4653, point_latin_name: 'Bacău', point_ru_name: 'Бакэу', point_ua_name: 'Бакеу', point_name: 'Bacău', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 46.572953, longitude: 26.908259, population: 204500, currency: 'RON' },
  { point_id: 477, point_latin_name: 'Targu-Mures', point_ru_name: 'Тыргу-Муреш', point_ua_name: 'Тиргу-Муреш', point_name: 'Târgu-Mureș', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 46.5303083352019, longitude: 24.5474581718445, population: 149577, currency: 'RON' },
  { point_id: 54, point_latin_name: 'Balti', point_ru_name: 'Бельцы', point_ua_name: 'Бєльці', point_name: 'Balti', country_name: 'Moldova', country_kod: 'MDA', country_kod_two: 'MD', country_id: 3, latitude: 47.7700312044965, longitude: 27.9418145829743, population: 144900, currency: 'MDL' },
  { point_id: 4661, point_latin_name: 'Buzau', point_ru_name: 'Бузэу', point_ua_name: 'Бузеу', point_name: 'Buzău', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 45.142894, longitude: 26.825867, population: 133116, currency: 'RON' },
  { point_id: 4657, point_latin_name: 'Botosani', point_ru_name: 'Ботошани', point_ua_name: 'Ботошані', point_name: 'Botoșani', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 47.748394, longitude: 26.669421, population: 115344, currency: 'RON' },
  { point_id: 389, point_latin_name: 'Suceava', point_ru_name: 'Сучава', point_ua_name: 'Сучава', point_name: 'Suceava', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 47.6470703673538, longitude: 26.2601797283417, population: 106138, currency: 'RON' },
  { point_id: 33, point_latin_name: 'Uman', point_ru_name: 'Умань', point_ua_name: 'Умань', point_name: 'Uman', country_name: 'Ucraina', country_kod: 'UKR', country_kod_two: 'UA', country_id: 2, latitude: 48.761187666009, longitude: 30.219583339148, population: 81525, currency: 'UAH' },
  { point_id: 388, point_latin_name: 'Bistrita', point_ru_name: 'Бистрица', point_ua_name: 'Бистриця', point_name: 'Bistrita', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 47.144207334029, longitude: 24.493156618896, population: 75076, currency: 'RON' },
  { point_id: 29, point_latin_name: 'Stryi', point_ru_name: 'Стрый', point_ua_name: 'Стрий', point_name: 'Stryi', country_name: 'Ucraina', country_kod: 'UKR', country_kod_two: 'UA', country_id: 2, latitude: 49.240326, longitude: 23.835912, population: 59425, currency: 'UAH' },
  { point_id: 390, point_latin_name: 'Mohyliv-Podilskyi', point_ru_name: 'Могилёв-Подольский', point_ua_name: 'Могилів-Подільський', point_name: 'Moghilău', country_name: 'Ucraina', country_kod: 'UKR', country_kod_two: 'UA', country_id: 2, latitude: 48.458537, longitude: 27.776077, population: 29925, currency: 'UAH' },
  { point_id: 134, point_latin_name: 'Truskavets', point_ru_name: 'Трускавец', point_ua_name: 'Трускавець', point_name: 'Truskaveț', country_name: 'Ucraina', country_kod: 'UKR', country_kod_two: 'UA', country_id: 2, latitude: 49.288533731515, longitude: 23.505222166934, population: 28287, currency: 'UAH' },
  { point_id: 20063, point_latin_name: 'Campulung Moldovenesc', point_ru_name: 'Кымпулунг-Молдовенеск', point_ua_name: 'Кимпулунг-Молдовенеск', point_name: 'Campulung Moldovenesc', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 47.5256, longitude: 25.5604, population: 19730, currency: 'RON' },
  { point_id: 4435, point_latin_name: 'Morshyn', point_ru_name: 'Моршин', point_ua_name: 'Моршин', point_name: 'Morșîn', country_name: 'Ucraina', country_kod: 'UKR', country_kod_two: 'UA', country_id: 2, latitude: 49.149962, longitude: 23.874712, population: 7714, currency: 'UAH' },
  { point_id: 5539, point_latin_name: 'Otaci', point_ru_name: 'Отачь', point_ua_name: 'Атаки', point_name: 'Otaci', country_name: 'Moldova', country_kod: 'MDA', country_kod_two: 'MD', country_id: 3, latitude: 48.436446, longitude: 27.794166, population: 6043, currency: 'MDL' },
  { point_id: 12300, point_latin_name: 'Maiaky', point_ru_name: 'Маяки', point_ua_name: 'Маяки', point_name: 'Maiakî', country_name: 'Ucraina', country_kod: 'UKR', country_kod_two: 'UA', country_id: 2, latitude: 46.414955, longitude: 30.272502, population: 5937, currency: 'UAH' },
  { point_id: 12327, point_latin_name: 'Starokozache', point_ru_name: 'Староказачье', point_ua_name: 'Старокозаче', point_name: 'Starokozache', country_name: 'Ucraina', country_kod: 'UKR', country_kod_two: 'UA', country_id: 2, latitude: 46.339345, longitude: 29.982234, population: 5278, currency: 'UAH' },
  { point_id: 15792, point_latin_name: 'Mamalyha', point_ru_name: 'Мамалыга', point_ua_name: 'Мамалига', point_name: 'Mămăliga', country_name: 'Ucraina', country_kod: 'UKR', country_kod_two: 'UA', country_id: 2, latitude: 48.255556, longitude: 26.5875, population: 2589, currency: 'UAH' },
  { point_id: 29760, point_latin_name: 'Criva', point_ru_name: 'Крива', point_ua_name: 'Крива', point_name: 'Criva', country_name: 'Moldova', country_kod: 'MDA', country_kod_two: 'MD', country_id: 3, latitude: 48.269384, longitude: 26.662595, population: 1431, currency: 'MDL' },
  { point_id: 30403, point_latin_name: 'Albita', point_ru_name: 'Албица', point_ua_name: 'Албіца', point_name: 'Albita', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 46.798016, longitude: 28.143551, currency: 'RON' },
  { point_id: 6015, point_latin_name: 'Anenii Noi', point_ru_name: 'Анений-Ной', point_ua_name: 'Аненій-Ной', point_name: 'Anenii Noi', country_name: 'Moldova', country_kod: 'MDA', country_kod_two: 'MD', country_id: 3, latitude: 46.878747, longitude: 29.228546, currency: 'MDL' },
  { point_id: 406, point_latin_name: 'Barlad', point_ru_name: 'Бырлад', point_ua_name: 'Бирлад', point_name: 'Bârlad', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 46.215766, longitude: 27.672607, currency: 'RON' },
  { point_id: 61847, point_latin_name: 'Bicaz', point_ru_name: 'Биказ', point_ua_name: 'Біказ', point_name: 'Bicaz', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 46.909583, longitude: 26.0853919, currency: 'RON' },
  { point_id: 111, point_latin_name: 'Brasov', point_ru_name: 'Брашов', point_ua_name: 'Брашов', point_name: 'Brașov', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 45.659837, longitude: 25.569922, currency: 'RON' },
  { point_id: 144, point_latin_name: 'Briceni', point_ru_name: 'Бричаны', point_ua_name: 'Бричани', point_name: 'Briceni', country_name: 'Moldova', country_kod: 'MDA', country_kod_two: 'MD', country_id: 3, latitude: 48.3574635898428, longitude: 27.0915890296219, currency: 'MDL' },
  { point_id: 36221, point_latin_name: 'Bucuresti airport Otopeni', point_ru_name: 'Бухарест аэропорт Отопени', point_ua_name: 'Бухарест аеропорт Отопені', point_name: 'Bucuresti Otopeni airport', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 44.571472, longitude: 26.076929, currency: 'RON' },
  { point_id: 5546, point_latin_name: 'Calaraşi', point_ru_name: 'Калараш', point_ua_name: 'Калараш', point_name: 'Calarashi', country_name: 'Moldova', country_kod: 'MDA', country_kod_two: 'MD', country_id: 3, latitude: 47.251325, longitude: 28.30495, currency: 'MDL' },
  { point_id: 4414, point_latin_name: 'Causeni', point_ru_name: 'Каушаны', point_ua_name: 'Каушани', point_name: 'Căușeni', country_name: 'Moldova', country_kod: 'MDA', country_kod_two: 'MD', country_id: 3, latitude: 46.641739, longitude: 29.409156, currency: 'MDL' },
  { point_id: 8131, point_latin_name: 'Chișinău aeroport', point_ru_name: 'Кишинев аэропорт', point_ua_name: 'Кишинів аеропорт', point_name: 'Chișinău aeroport', country_name: 'Moldova', country_kod: 'MDA', country_kod_two: 'MD', country_id: 3, latitude: 46.936147, longitude: 28.934624, currency: 'MDL' },
  { point_id: 50347, point_latin_name: 'Costesti', point_ru_name: 'Костешты', point_ua_name: 'Костешть', point_name: 'Costești', country_name: 'Moldova', country_kod: 'MDA', country_kod_two: 'MD', country_id: 3, latitude: 47.855264, longitude: 27.251306, currency: 'MDL' },
  { point_id: 387, point_latin_name: 'Dej', point_ru_name: 'Деж', point_ua_name: 'Деж', point_name: 'Dej', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 47.1283217212264, longitude: 23.8811202856446, currency: 'RON' },
  { point_id: 65, point_latin_name: 'Edinet', point_ru_name: 'Единец', point_ua_name: 'Єдинці', point_name: 'Edineț', country_name: 'Moldova', country_kod: 'MDA', country_kod_two: 'MD', country_id: 3, latitude: 48.1624211975657, longitude: 27.3257417995803, currency: 'MDL' },
  { point_id: 5541, point_latin_name: 'Florești', point_ru_name: 'Флорешты', point_ua_name: 'Флорешти', point_name: 'Florești', country_name: 'Moldova', country_kod: 'MDA', country_kod_two: 'MD', country_id: 3, latitude: 47.893468, longitude: 28.301962, currency: 'MDL' },
  { point_id: 4670, point_latin_name: 'Focsani', point_ru_name: 'Фокшаны', point_ua_name: 'Фокшани', point_name: 'Focșani', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 45.700752, longitude: 27.170152, currency: 'RON' },
  { point_id: 484, point_latin_name: 'Gheorgheni', point_ru_name: 'Георгени', point_ua_name: 'Георгені', point_name: 'Gheorgheni', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 46.721236942994, longitude: 25.582821051104, currency: 'RON' },
  { point_id: 34314, point_latin_name: 'Gura Humorului', point_ru_name: 'Гурагумора', point_ua_name: 'Ґурагумора', point_name: 'Gura Humorului', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 47.552169, longitude: 25.885999, currency: 'RON' },
  { point_id: 473, point_latin_name: 'Huedin', point_ru_name: 'Хуедин', point_ua_name: 'Гуєдін', point_name: 'Huedin', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 46.8615717138139, longitude: 23.0200769218598, currency: 'RON' },
  { point_id: 159, point_latin_name: 'Husi', point_ru_name: 'Хуши', point_ua_name: 'Хуші', point_name: 'Husi', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 46.6767, longitude: 28.043662, currency: 'RON' },
  { point_id: 91812, point_latin_name: 'Iasi airport', point_ru_name: 'Яссы аэропорт', point_ua_name: 'Ясси аеропорт', point_name: 'Aeroportul Iași', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 47.177164294, longitude: 27.617318867, currency: 'RON' },
  { point_id: 30404, point_latin_name: 'Leuseni', point_ru_name: 'Леушены', point_ua_name: 'Леушень', point_name: 'Leușeni', country_name: 'Moldova', country_kod: 'MDA', country_kod_two: 'MD', country_id: 3, latitude: 46.82106, longitude: 28.192342, currency: 'MDL' },
  { point_id: 4283, point_latin_name: 'Liubashivka', point_ru_name: 'Любашевка', point_ua_name: 'Любашівка', point_name: 'Liubashivka', country_name: 'Ucraina', country_kod: 'UKR', country_kod_two: 'UA', country_id: 2, latitude: 47.845776, longitude: 30.26923, currency: 'UAH' },
  { point_id: 37661, point_latin_name: 'Maiaky-Udobne', point_ru_name: 'Маяки-Удобне', point_ua_name: 'Маяки-Удобне', point_name: 'Maiaky-Udobne', country_name: 'Ucraina', country_kod: 'UKR', country_kod_two: 'UA', country_id: 2, latitude: 46.383882, longitude: 30.086194, currency: 'UAH' },
  { point_id: 403, point_latin_name: 'Onesti', point_ru_name: 'Онешти', point_ua_name: 'Онешті', point_name: 'Onești', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 46.258434, longitude: 26.778268, currency: 'RON' },
  { point_id: 454, point_latin_name: 'Orhei', point_ru_name: 'Орхей', point_ua_name: 'Оргіїв', point_name: 'Orhei', country_name: 'Moldova', country_kod: 'MDA', country_kod_two: 'MD', country_id: 3, latitude: 47.3781172111799, longitude: 28.8185335174744, currency: 'MDL' },
  { point_id: 4415, point_latin_name: 'Palanca', point_ru_name: 'Паланка', point_ua_name: 'Паланка', point_name: 'Palanca', country_name: 'Moldova', country_kod: 'MDA', country_kod_two: 'MD', country_id: 3, latitude: 46.409924, longitude: 30.093293, currency: 'MDL' },
  { point_id: 4679, point_latin_name: 'Piatra Neamt', point_ru_name: 'Пьятра-Нямц', point_ua_name: 'Пятра-Нямц', point_name: 'Piatra Neamt', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 46.927428, longitude: 26.360643, currency: 'RON' },
  { point_id: 112, point_latin_name: 'Ploiesti', point_ru_name: 'Плоешти', point_ua_name: 'Плоєшті', point_name: 'Ploiesti', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 44.9232367722548, longitude: 26.0149742650985, currency: 'RON' },
  { point_id: 479, point_latin_name: 'Praid', point_ru_name: 'Праид', point_ua_name: 'Праид', point_name: 'Praid', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 46.5512174304539, longitude: 25.1271534904297, currency: 'RON' },
  { point_id: 4681, point_latin_name: 'Ramnicu Sarat', point_ru_name: 'Рымнику-Сэрат', point_ua_name: 'Римніку-Серат', point_name: 'Ramnicu Sarat', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 45.379444, longitude: 27.057878, currency: 'RON' },
  { point_id: 37920, point_latin_name: 'Rezina', point_ru_name: 'Резина', point_ua_name: 'Резина', point_name: 'Rezina', country_name: 'Moldova', country_kod: 'MDA', country_kod_two: 'MD', country_id: 3, latitude: 47.747445, longitude: 28.96246, currency: 'MDL' },
  { point_id: 6018, point_latin_name: 'Rîbniţa', point_ru_name: 'Рыбница', point_ua_name: 'Рибниця', point_name: 'Rîbnița', country_name: 'Moldova', country_kod: 'MDA', country_kod_two: 'MD', country_id: 3, latitude: 47.766627, longitude: 28.991321, currency: 'MDL' },
  { point_id: 452, point_latin_name: 'Riscani', point_ru_name: 'Рышканы', point_ua_name: 'Ришкани', point_name: 'Riscani', country_name: 'Moldova', country_kod: 'MDA', country_kod_two: 'MD', country_id: 3, latitude: 47.9489087244331, longitude: 27.567019560852, currency: 'MDL' },
  { point_id: 50348, point_latin_name: 'Stânca', point_ru_name: 'Стынка', point_ua_name: 'Стинка', point_name: 'Stânca', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 47.823368, longitude: 27.204702, currency: 'RON' },
  { point_id: 5806, point_latin_name: 'Roman', point_ru_name: 'Роман', point_ua_name: 'Роман', point_name: 'Roman', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 46.934919, longitude: 26.920087, currency: 'RON' },
  { point_id: 86453, point_latin_name: 'Sculeni', point_ru_name: 'Скуляны', point_ua_name: 'Скулень', point_name: 'Sculeni', country_name: 'Moldova', country_kod: 'MDA', country_kod_two: 'MD', country_id: 3, latitude: 47.330284, longitude: 27.627439, currency: 'MDL' },
  { point_id: 132, point_latin_name: 'Sniatyn', point_ru_name: 'Снятын', point_ua_name: 'Снятин', point_name: 'Sniatyn', country_name: 'Ucraina', country_kod: 'UKR', country_kod_two: 'UA', country_id: 2, latitude: 48.450212, longitude: 25.566773, currency: 'UAH' },
  { point_id: 37921, point_latin_name: 'Șoldănești', point_ru_name: 'Шолданешты', point_ua_name: 'Шолданешти', point_name: 'Șoldănești', country_name: 'Moldova', country_kod: 'MDA', country_kod_two: 'MD', country_id: 3, latitude: 47.81384, longitude: 28.790201, currency: 'MDL' },
  { point_id: 5540, point_latin_name: 'Soroca', point_ru_name: 'Сороки', point_ua_name: 'Сороки', point_name: 'Soroca', country_name: 'Moldova', country_kod: 'MDA', country_kod_two: 'MD', country_id: 3, latitude: 48.165316, longitude: 28.298164, currency: 'MDL' },
  { point_id: 478, point_latin_name: 'Sovata', point_ru_name: 'Совата', point_ua_name: 'Совата', point_name: 'Sovata', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 46.5971450381495, longitude: 25.0701555477851, currency: 'RON' },
  { point_id: 405, point_latin_name: 'Tecuci', point_ru_name: 'Текуч', point_ua_name: 'Текуч', point_name: 'Tecuci', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 45.840386, longitude: 27.430875, currency: 'RON' },
  { point_id: 79255, point_latin_name: 'Tudora', point_ru_name: 'Тудора', point_ua_name: 'Тудора', point_name: 'Tudora', country_name: 'Moldova', country_kod: 'MDA', country_kod_two: 'MD', country_id: 3, latitude: 46.433048612, longitude: 30.042087331, currency: 'MDL' },
  { point_id: 474, point_latin_name: 'Turda', point_ru_name: 'Турда', point_ua_name: 'Турда', point_name: 'Turda', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 46.562296686476, longitude: 23.78587639679, currency: 'RON' },
  { point_id: 4699, point_latin_name: 'Vaslui', point_ru_name: 'Васлуй', point_ua_name: 'Васлуй', point_name: 'Vaslui', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 46.639869, longitude: 27.729673, currency: 'RON' },
  { point_id: 34304, point_latin_name: 'Vatra Dornei', point_ru_name: 'Ватра-Дорней', point_ua_name: 'Ватра-Дорней', point_name: 'Vatra Dornei', country_name: 'România', country_kod: 'ROU', country_kod_two: 'RO', country_id: 9, latitude: 47.344882, longitude: 25.350888, currency: 'RON' },
];

// City Lookup Icon component
const CityLookupIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <div
    className="flex items-center justify-center rounded"
    style={{
      width: size,
      height: size,
      backgroundColor: '#3B82F6',
    }}
  >
    <MapPin className="text-white" style={{ width: size * 0.6, height: size * 0.6 }} />
  </div>
);

export const N8NCityLookupConfig: React.FC<N8NCityLookupConfigProps> = ({
  node,
  onClose,
  onSave,
  onExecutionUpdate,
  inputData,
  outputData,
  previousNodeLabel,
  nodeSources,
}) => {
  // Parse database text - supports multiple formats (CSV, XML, JSON)
  function parseDatabaseText(text: string): CityEntry[] {
    if (!text || !text.trim()) return [];

    const result: CityEntry[] = [];
    const trimmedText = text.trim();

    // Check if it's XML format (contains <point_id> tags)
    if (trimmedText.includes('<point_id>') && trimmedText.includes('<point_latin_name>')) {
      console.log('[CityLookup XML Parser] Detected XML format');

      // Helper to extract tag value
      const getTagValue = (content: string, tagName: string): string | null => {
        const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'i');
        const match = regex.exec(content);
        return match ? match[1].trim() : null;
      };

      // Helper to extract entry from content block
      const extractEntry = (content: string): CityEntry | null => {
        const pointId = getTagValue(content, 'point_id');
        const pointLatinName = getTagValue(content, 'point_latin_name');

        if (!pointId || !pointLatinName) return null;

        const id = parseInt(pointId, 10);
        if (isNaN(id)) return null;

        const entry: CityEntry = {
          point_id: id,
          point_latin_name: pointLatinName,
        };

        // Extract all optional fields
        const pointRuName = getTagValue(content, 'point_ru_name');
        if (pointRuName) entry.point_ru_name = pointRuName;

        const pointUaName = getTagValue(content, 'point_ua_name');
        if (pointUaName) entry.point_ua_name = pointUaName;

        const pointName = getTagValue(content, 'point_name');
        if (pointName) entry.point_name = pointName;

        const countryName = getTagValue(content, 'country_name');
        if (countryName) entry.country_name = countryName;

        const countryKod = getTagValue(content, 'country_kod');
        if (countryKod) entry.country_kod = countryKod;

        const countryKodTwo = getTagValue(content, 'country_kod_two');
        if (countryKodTwo) entry.country_kod_two = countryKodTwo;

        const countryId = getTagValue(content, 'country_id');
        if (countryId) entry.country_id = parseInt(countryId, 10);

        const latitude = getTagValue(content, 'latitude');
        if (latitude) entry.latitude = parseFloat(latitude);

        const longitude = getTagValue(content, 'longitude');
        if (longitude) entry.longitude = parseFloat(longitude);

        const population = getTagValue(content, 'population');
        if (population) entry.population = parseInt(population, 10);

        const currency = getTagValue(content, 'currency');
        if (currency) entry.currency = currency;

        return entry;
      };

      // Try parsing with <item> tags first
      if (trimmedText.includes('<item>')) {
        const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
        let itemMatch;
        while ((itemMatch = itemRegex.exec(trimmedText)) !== null) {
          const entry = extractEntry(itemMatch[1]);
          if (entry && !result.some(e => e.point_id === entry.point_id)) {
            result.push(entry);
          }
        }
      }

      // Also try splitting by <point_id> tags to catch any items that might have been missed
      // This handles XML without <item> wrappers OR items that weren't captured by the regex
      const segments = trimmedText.split(/<point_id>/i).filter(s => s.trim());
      console.log('[CityLookup XML Parser] Split into', segments.length, 'segments by <point_id>');

      for (const segment of segments) {
        // Re-add the <point_id> tag that was removed by split
        const content = '<point_id>' + segment;
        const entry = extractEntry(content);
        if (entry) {
          console.log('[CityLookup XML Parser] Extracted entry:', entry.point_id, entry.point_latin_name, 'country:', entry.country_name);
          if (!result.some(e => e.point_id === entry.point_id)) {
            result.push(entry);
          }
        }
      }

      console.log('[CityLookup XML Parser] Total entries parsed:', result.length);

      return result;
    }

    // Original CSV/TXT parsing logic
    const normalizedText = trimmedText.replace(/[\t]+/g, ' ').replace(/  +/g, ' ').trim();
    const hasNewlines = normalizedText.includes('\n');

    let items: string[];

    if (hasNewlines) {
      items = normalizedText.split('\n').map(line => line.trim()).filter(Boolean);
    } else {
      items = normalizedText.split(' ').filter(Boolean);
    }

    for (const item of items) {
      const trimmed = item.trim();
      if (!trimmed) continue;

      // Skip header
      if (trimmed.toLowerCase() === 'point_id,point_latin_name' ||
          trimmed.toLowerCase().startsWith('point_id,') ||
          trimmed.toLowerCase() === 'id,name') {
        continue;
      }

      const commaIndex = trimmed.indexOf(',');
      if (commaIndex === -1) continue;

      const idStr = trimmed.substring(0, commaIndex).trim();
      const name = trimmed.substring(commaIndex + 1).trim();
      const id = parseInt(idStr, 10);

      if (!isNaN(id) && name) {
        if (!result.some(e => e.point_id === id)) {
          result.push({ point_id: id, point_latin_name: name });
        }
      }
    }

    return result;
  }

  const [query, setQuery] = useState(node.config?.query || '{{ $json.body.query }}');
  const [databaseText, setDatabaseText] = useState(node.config?.database || '');
  const [entries, setEntries] = useState<CityEntry[]>(() => {
    if (node.config?.databaseEntries?.length) {
      return node.config.databaseEntries;
    }
    return parseDatabaseText(node.config?.database || '');
  });
  const [newEntryId, setNewEntryId] = useState('');
  const [newEntryName, setNewEntryName] = useState('');
  const [showRawEditor, setShowRawEditor] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'database'>('settings');
  const [searchFilter, setSearchFilter] = useState('');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [isDragOverQuery, setIsDragOverQuery] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert entries to text
  const entriesToText = (entries: CityEntry[]): string => {
    return entries.map(e => `${e.point_id},${e.point_latin_name}`).join('\n');
  };

  // Sync entries with text - only from raw editor changes, not from file imports
  // This is disabled to prevent losing extended fields when databaseText changes
  // File imports and JSON imports set entries directly
  // The raw editor only works for simple CSV format

  // Auto-save on config change
  useEffect(() => {
    console.log('[CityLookup] Auto-saving config:', {
      query,
      entriesCount: entries.length,
      databaseTextLength: databaseText.length,
    });
    onSave({
      query,
      database: databaseText,
      databaseEntries: entries,
    });
  }, [query, databaseText, entries]);

  const handleAddEntry = () => {
    const id = parseInt(newEntryId, 10);
    if (isNaN(id) || !newEntryName.trim()) return;

    if (entries.some(e => e.point_id === id)) {
      setImportStatus({ type: 'error', message: `ID ${id} există deja` });
      setTimeout(() => setImportStatus({ type: null, message: '' }), 3000);
      return;
    }

    const newEntries = [...entries, { point_id: id, point_latin_name: newEntryName.trim() }];
    setEntries(newEntries);
    setDatabaseText(entriesToText(newEntries));
    setNewEntryId('');
    setNewEntryName('');
  };

  const handleRemoveEntry = (index: number) => {
    const newEntries = entries.filter((_, i) => i !== index);
    setEntries(newEntries);
    setDatabaseText(entriesToText(newEntries));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;

      try {
        if (file.name.endsWith('.json')) {
          const jsonData = JSON.parse(content);
          let newEntries: CityEntry[] = [];

          if (Array.isArray(jsonData)) {
            newEntries = jsonData.filter(item =>
              typeof item.point_id === 'number' &&
              typeof item.point_latin_name === 'string'
            );
          }

          if (newEntries.length > 0) {
            setEntries(newEntries);
            // Keep original JSON content for raw editor
            setDatabaseText(content);
            setImportStatus({ type: 'success', message: `Importate ${newEntries.length} locații din JSON` });
            toast.success(`Importate ${newEntries.length} locații. Apasă "Save" în workflow pentru a salva permanent.`);
          } else {
            setImportStatus({ type: 'error', message: 'Fișierul JSON nu conține date valide' });
            toast.error('Fișierul JSON nu conține date valide');
          }
        } else {
          const parsed = parseDatabaseText(content);

          if (parsed.length > 0) {
            setEntries(parsed);
            // For XML files, keep original content to preserve structure; for CSV use entriesToText
            const isXml = content.includes('<point_id>');
            setDatabaseText(isXml ? content : entriesToText(parsed));
            setImportStatus({ type: 'success', message: `Importate ${parsed.length} locații` });
            toast.success(`Importate ${parsed.length} locații. Apasă "Save" în workflow pentru a salva permanent.`);
          } else {
            setImportStatus({ type: 'error', message: 'Nu s-au găsit date valide în fișier' });
            toast.error('Nu s-au găsit date valide în fișier');
          }
        }
      } catch (error) {
        const parsed = parseDatabaseText(content);
        if (parsed.length > 0) {
          setEntries(parsed);
          // For XML files, keep original content to preserve structure
          const isXml = content.includes('<point_id>');
          setDatabaseText(isXml ? content : entriesToText(parsed));
          setImportStatus({ type: 'success', message: `Importate ${parsed.length} locații` });
          toast.success(`Importate ${parsed.length} locații. Apasă "Save" în workflow pentru a salva permanent.`);
        } else {
          setImportStatus({ type: 'error', message: 'Eroare la parsarea fișierului' });
          toast.error('Eroare la parsarea fișierului');
        }
      }

      setTimeout(() => setImportStatus({ type: null, message: '' }), 4000);
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  const handleExportCSV = () => {
    // Export all fields as CSV
    const headers = 'point_id,point_latin_name,point_ru_name,point_ua_name,point_name,country_name,country_kod,country_kod_two,country_id,latitude,longitude,population,currency';
    const rows = entries.map(e =>
      [
        e.point_id,
        e.point_latin_name,
        e.point_ru_name || '',
        e.point_ua_name || '',
        e.point_name || '',
        e.country_name || '',
        e.country_kod || '',
        e.country_kod_two || '',
        e.country_id || '',
        e.latitude || '',
        e.longitude || '',
        e.population || '',
        e.currency || '',
      ].join(',')
    ).join('\n');
    const csvContent = headers + '\n' + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'city_database.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const jsonContent = JSON.stringify(entries, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'city_database.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Helper to get nested value from path like "body.phone" or "lookupResults[0].pointId"
  const getValueFromPath = (obj: any, path: string): any => {
    if (!obj || !path) return undefined;

    // Handle array access like lookupResults[0].pointId
    const parts = path.split(/\.(?![^\[]*\])/); // Split by dots not inside brackets
    let value = obj;

    for (let part of parts) {
      if (value === undefined || value === null) return undefined;

      // Check for array access like "lookupResults[0]"
      const arrayMatch = part.match(/^([^\[]+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayName, indexStr] = arrayMatch;
        const index = parseInt(indexStr, 10);
        value = value[arrayName];
        if (Array.isArray(value)) {
          value = value[index];
        } else {
          return undefined;
        }
      } else {
        value = value[part];
      }
    }
    return value;
  };

  // Resolve n8n-style expressions to actual values
  // Supports:
  // - {{ $json.field }} - access previous node's data
  // - {{ $json.array[0].field }} - array access
  // - {{ $('NodeName').item.json.field }} - access specific node's data
  // - {{ $('NodeName').item.json['path.to.field'] }} - bracket notation
  const resolveExpression = (expression: string): string | null => {
    if (!expression || !expression.includes('{{')) return null;

    let resolved = expression;

    // Get data from inputData
    const data = Array.isArray(inputData) ? inputData[0] : inputData;

    // 1. Handle {{ $('NodeName').item.json.path }} or {{ $('NodeName').item.json['path'] }}
    resolved = resolved.replace(/\{\{\s*\$\(['"]([^'"]+)['"]\)\.item\.json(?:\.([^}]+)|\['([^']+)'\])\s*\}\}/g,
      (match, nodeName, dotPath, bracketPath) => {
        const path = dotPath || bracketPath;
        const nodeSource = nodeSources?.find(n => n.nodeName === nodeName);
        if (nodeSource) {
          const nodeData = Array.isArray(nodeSource.data) ? nodeSource.data[0] : nodeSource.data;
          const value = path ? getValueFromPath(nodeData, path.trim()) : nodeData;
          if (value !== undefined) {
            return typeof value === 'object' ? JSON.stringify(value) : String(value);
          }
        }
        return match;
      });

    // 2. Handle {{ $('NodeName').first().json.path }}
    resolved = resolved.replace(/\{\{\s*\$\(['"]([^'"]+)['"]\)\.first\(\)\.json\.([^}]+)\s*\}\}/g,
      (match, nodeName, path) => {
        const nodeSource = nodeSources?.find(n => n.nodeName === nodeName);
        if (nodeSource) {
          const nodeData = Array.isArray(nodeSource.data) ? nodeSource.data[0] : nodeSource.data;
          const value = getValueFromPath(nodeData, path.trim());
          if (value !== undefined) {
            return typeof value === 'object' ? JSON.stringify(value) : String(value);
          }
        }
        return match;
      });

    // 3. Handle {{ $json.path }} or {{ $json.array[0].field }}
    resolved = resolved.replace(/\{\{\s*\$json\.([^}]+)\s*\}\}/g, (match, path) => {
      const value = getValueFromPath(data, path.trim());
      if (value !== undefined) {
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
      return match;
    });

    // 4. Handle {{ $input.item.json.path }}
    resolved = resolved.replace(/\{\{\s*\$input\.item\.json\.([^}]+)\s*\}\}/g, (match, path) => {
      const value = getValueFromPath(data, path.trim());
      if (value !== undefined) {
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
      return match;
    });

    // If still contains {{ }}, it wasn't resolved
    if (resolved.includes('{{')) return null;

    return resolved;
  };

  const resolvedQuery = resolveExpression(query);

  // Handle drag & drop on query field
  const handleQueryDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverQuery(false);

    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        const field = JSON.parse(jsonData);
        // Use the expression from the drag data
        const expression = field.expression || `{{ $json.${field.path} }}`;
        setQuery(expression);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  // Test execution
  const executeTest = async () => {
    if (!query || entries.length === 0) {
      setExecutionError('Query și database sunt necesare');
      return;
    }

    setIsExecuting(true);
    setExecutionResult(null);
    setExecutionError(null);

    try {
      // Use the already-resolved query if available (it handles nested paths correctly)
      // Otherwise fall back to trying to resolve it manually
      let testQuery = resolvedQuery || query;

      // If resolvedQuery wasn't available and we have an expression, try to resolve it
      if (!resolvedQuery && query.includes('{{')) {
        const data = Array.isArray(inputData) ? inputData[0] : inputData;
        if (data) {
          testQuery = query.replace(/\{\{\s*\$json\.(\w+(?:\.\w+)*)\s*\}\}/g, (match, path) => {
            const parts = path.split('.');
            let value = data;
            for (const part of parts) {
              value = value?.[part];
            }
            return value !== undefined ? String(value) : match;
          });

          // Also handle $('nodeName').item.json['path'] pattern with nested path support
          testQuery = testQuery.replace(/\{\{\s*\$\('([^']+)'\)\.item\.json\['([^']+)'\]\s*\}\}/g, (match, nodeName, path) => {
            const nodeSource = nodeSources?.find(n => n.nodeName === nodeName);
            if (nodeSource) {
              const nodeData = Array.isArray(nodeSource.data) ? nodeSource.data[0] : nodeSource.data;
              // Handle nested path like 'body.message'
              const parts = path.split('.');
              let value = nodeData;
              for (const part of parts) {
                value = value?.[part];
              }
              return value !== undefined ? String(value) : match;
            }
            return match;
          });
        }
      }

      // Simulate the city lookup logic
      const normalizeText = (text: string): string => {
        return text
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/ă/g, 'a')
          .replace(/â/g, 'a')
          .replace(/î/g, 'i')
          .replace(/ș/g, 's')
          .replace(/ț/g, 't')
          .replace(/[^a-z0-9\s-]/g, '')
          .trim();
      };

      const isValidDate = (str: string): boolean => {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        return dateRegex.test(str);
      };

      // City name aliases - common alternative spellings
      const cityAliases: Record<string, string[]> = {
        'kyiv': ['kiev', 'kiew', 'киев', 'київ'],
        'kiev': ['kyiv', 'kiew', 'киев', 'київ'],
        'chisinau': ['kishinev', 'kishinau', 'кишинев', 'кишинэу', 'chișinău', 'chisineu'],
        'bucuresti': ['bucharest', 'bukarest', 'бухарест', 'bucurești'],
        'bucharest': ['bucuresti', 'bukarest', 'bucurești'],
        'odessa': ['odesa', 'одесса', 'одеса'],
        'odesa': ['odessa', 'одесса', 'одеса'],
        'moscow': ['moskva', 'moscova', 'москва', 'moskau'],
        'moskva': ['moscow', 'moscova', 'москва', 'moskau'],
        'minsk': ['минск'],
        'warsaw': ['warszawa', 'varsovia', 'варшава'],
        'warszawa': ['warsaw', 'varsovia', 'варшава'],
        'prague': ['praha', 'praga', 'прага'],
        'praha': ['prague', 'praga', 'прага'],
        'vienna': ['wien', 'viena', 'вена'],
        'wien': ['vienna', 'viena', 'вена'],
        'berlin': ['берлин'],
        'paris': ['париж'],
        'london': ['лондон'],
        'rome': ['roma', 'рим'],
        'roma': ['rome', 'рим'],
        'saint-petersburg': ['sankt-peterburg', 'st petersburg', 'санкт-петербург', 'spb', 'piter'],
        'sankt-peterburg': ['saint-petersburg', 'st petersburg', 'санкт-петербург'],
        'lviv': ['lvov', 'lwow', 'lemberg', 'львов', 'львів'],
        'lvov': ['lviv', 'lwow', 'lemberg', 'львов', 'львів'],
        'kharkiv': ['kharkov', 'харьков', 'харків'],
        'kharkov': ['kharkiv', 'харьков', 'харків'],
        'dnipro': ['dnepropetrovsk', 'dnepr', 'днепр', 'дніпро'],
        'istanbul': ['constantinople', 'стамбул'],
        'tbilisi': ['tiflis', 'тбилиси'],
        'riga': ['рига'],
        'vilnius': ['vilna', 'вильнюс'],
        'tallinn': ['таллин', 'таллинн'],
        'helsinki': ['хельсинки'],
        'stockholm': ['стокгольм'],
        'copenhagen': ['kobenhavn', 'копенгаген'],
        'amsterdam': ['амстердам'],
        'brussels': ['brussel', 'bruxelles', 'брюссель'],
        'budapest': ['будапешт'],
        'sofia': ['софия'],
        'athens': ['athina', 'афины'],
        'belgrade': ['beograd', 'белград'],
        'zagreb': ['загреб'],
      };

      // Levenshtein distance calculation
      const levenshteinDistance = (a: string, b: string): number => {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix: number[][] = [];
        for (let i = 0; i <= b.length; i++) {
          matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
          matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
          for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
              matrix[i][j] = matrix[i - 1][j - 1];
            } else {
              matrix[i][j] = Math.min(
                matrix[i - 1][j - 1] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j] + 1
              );
            }
          }
        }
        return matrix[b.length][a.length];
      };

      const findCity = (name: string): CityEntry | null => {
        const normalizedSearch = normalizeText(name);

        // 1. Exact match first
        const exactMatch = entries.find(e =>
          normalizeText(e.point_latin_name) === normalizedSearch
        );
        if (exactMatch) return exactMatch;

        // 2. Check aliases - if search term has known aliases, try them
        const searchAliases = cityAliases[normalizedSearch] || [];
        for (const alias of searchAliases) {
          const aliasNormalized = normalizeText(alias);
          const aliasMatch = entries.find(e =>
            normalizeText(e.point_latin_name) === aliasNormalized ||
            normalizeText(e.point_latin_name).includes(aliasNormalized) ||
            aliasNormalized.includes(normalizeText(e.point_latin_name))
          );
          if (aliasMatch) return aliasMatch;
        }

        // 3. Check if any database entry has the search term as an alias
        for (const entry of entries) {
          const entryNormalized = normalizeText(entry.point_latin_name);
          const entryAliases = cityAliases[entryNormalized] || [];
          if (entryAliases.some(alias => normalizeText(alias) === normalizedSearch)) {
            return entry;
          }
        }

        // 4. City starts with search term
        const startsWithMatch = entries.find(e =>
          normalizeText(e.point_latin_name).startsWith(normalizedSearch)
        );
        if (startsWithMatch) return startsWithMatch;

        // 5. Search term starts with city name
        const searchStartsWithCity = entries.find(e =>
          normalizedSearch.startsWith(normalizeText(e.point_latin_name))
        );
        if (searchStartsWithCity) return searchStartsWithCity;

        // 6. City contains search term
        const containsMatch = entries.find(e =>
          normalizeText(e.point_latin_name).includes(normalizedSearch)
        );
        if (containsMatch) return containsMatch;

        // 7. Search term contains city name
        const searchContainsCity = entries.find(e =>
          normalizedSearch.includes(normalizeText(e.point_latin_name))
        );
        if (searchContainsCity) return searchContainsCity;

        // 8. Levenshtein distance - find best match with small edit distance
        let bestMatch: CityEntry | null = null;
        let bestDistance = Infinity;
        const maxDistance = Math.max(2, Math.floor(normalizedSearch.length * 0.35));

        for (const entry of entries) {
          const cityName = normalizeText(entry.point_latin_name);
          const distance = levenshteinDistance(normalizedSearch, cityName);

          if (distance < bestDistance && distance <= maxDistance) {
            bestDistance = distance;
            bestMatch = entry;
          }
        }

        return bestMatch;
      };

      // Parse query
      const parts = testQuery.split(/\s+/).filter(p => p.trim());
      const cityNames: string[] = [];
      let date = '';

      for (const part of parts) {
        if (isValidDate(part)) {
          date = part;
        } else {
          cityNames.push(part);
        }
      }

      // Find cities
      const foundCities: Array<{ name: string; entry: CityEntry | null }> = [];
      for (const name of cityNames) {
        foundCities.push({ name, entry: findCity(name) });
      }

      const allFound = foundCities.every(c => c.entry !== null);
      const cityIds = foundCities.map(c => c.entry?.point_id || 0);
      const formattedOutput = [...cityIds, date].filter(Boolean).join(',');

      const result = {
        success: allFound,
        query: testQuery,
        parsedCities: cityNames,
        parsedDate: date || 'none',
        lookupResults: foundCities.map(c => ({
          searchTerm: c.name,
          found: c.entry !== null,
          pointId: c.entry?.point_id || null,
          pointName: c.entry?.point_latin_name || null,
          // Include all extended data if found
          pointRuName: c.entry?.point_ru_name || null,
          pointUaName: c.entry?.point_ua_name || null,
          countryName: c.entry?.country_name || null,
          countryCode: c.entry?.country_kod_two || null,
          latitude: c.entry?.latitude || null,
          longitude: c.entry?.longitude || null,
          population: c.entry?.population || null,
          currency: c.entry?.currency || null,
        })),
        formattedOutput,
        _executedAt: new Date().toISOString(),
      };

      setExecutionResult(result);

      // Update execution data so next nodes can access this output
      if (onExecutionUpdate) {
        onExecutionUpdate(node.id, { output: result });
      }
    } catch (error: any) {
      setExecutionError(error.message || 'Eroare la execuție');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSave = () => {
    onSave({
      query,
      database: databaseText,
      databaseEntries: entries,
    });
    toast.success(`Configurație salvată cu ${entries.length} locații. Apasă butonul "Salvează" din toolbar pentru a persista.`);
    onClose();
  };

  // Normalize text for fuzzy search - remove diacritics and special chars
  const normalizeForSearch = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
      .replace(/ă/g, 'a')
      .replace(/â/g, 'a')
      .replace(/î/g, 'i')
      .replace(/ș/g, 's')
      .replace(/ț/g, 't')
      .replace(/ё/g, 'e')
      .replace(/[^a-z0-9\s]/g, '') // Remove remaining special chars
      .trim();
  };

  // Filter entries with fuzzy matching
  const filteredEntries = searchFilter
    ? (() => {
        const normalizedSearch = normalizeForSearch(searchFilter);

        // First: exact normalized match
        const exactMatches = entries.filter(e =>
          normalizeForSearch(e.point_latin_name) === normalizedSearch
        );
        if (exactMatches.length > 0) return exactMatches;

        // Second: starts with normalized search
        const startsWithMatches = entries.filter(e =>
          normalizeForSearch(e.point_latin_name).startsWith(normalizedSearch)
        );
        if (startsWithMatches.length > 0) return startsWithMatches;

        // Third: contains normalized search or ID match
        return entries.filter(e =>
          normalizeForSearch(e.point_latin_name).includes(normalizedSearch) ||
          e.point_id.toString().includes(searchFilter)
        );
      })()
    : entries;

  const sortedEntries = [...filteredEntries].sort((a, b) => a.point_id - b.point_id);

  // Prepare output data - prioritize test execution result over workflow output
  const currentOutputData = executionResult || outputData || null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        backgroundColor: '#131419',
        backgroundImage: 'radial-gradient(#2a2a2a 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleSave();
      }}
    >
      {/* Back to canvas button */}
      <button
        onClick={handleSave}
        className="absolute top-4 left-4 flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors bg-[#2d2f36] border border-[#3e4149] px-3 py-1.5 rounded z-10"
      >
        <ArrowLeft className="w-3 h-3" />
        Back to canvas
      </button>

      {/* 3-panel layout */}
      <div
        className="flex items-stretch"
        style={{
          height: '85vh',
          maxWidth: '98vw',
          width: '95%',
        }}
      >
        {/* INPUT Panel - Left */}
        <div
          className="hidden lg:flex flex-col overflow-hidden"
          style={{
            flex: 1,
            minWidth: '350px',
            backgroundColor: 'rgba(19, 20, 25, 0.6)',
            backdropFilter: 'blur(5px)',
            borderTopLeftRadius: '8px',
            borderBottomLeftRadius: '8px',
            borderRight: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div className="flex-1 overflow-auto">
            {(!inputData && (!nodeSources || nodeSources.length === 0)) ? (
              <div className="p-4 text-center">
                <div className="text-gray-500 text-sm mb-2">INPUT</div>
                <div className="text-gray-600 text-xs">
                  Execută workflow-ul pentru a vedea datele de intrare.
                  <br />
                  Poți trage câmpuri din INPUT în Query Input.
                </div>
              </div>
            ) : (
              <N8NNodeIOPanel
                title="INPUT"
                data={inputData}
                enableDrag={true}
                nodeSources={nodeSources}
              />
            )}
          </div>
        </div>

        {/* Main Config Panel - Center */}
        <div
          className="flex flex-col"
          style={{
            width: '600px',
            flexShrink: 0,
            backgroundColor: '#2b2b2b',
            boxShadow: '0 0 60px rgba(0,0,0,0.8), 0 0 0 1px #4a4a4a',
            borderRadius: '8px',
            zIndex: 5,
            transform: 'scale(1.01)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: '#3B82F6' }}
          >
            <div className="flex items-center gap-3">
              <CityLookupIcon size={28} />
              <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>
                City Lookup
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={executeTest}
                disabled={!query || entries.length === 0 || isExecuting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={{
                  backgroundColor: query && entries.length > 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  cursor: query && entries.length > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                Test
              </button>
              <button onClick={handleSave} className="p-1 hover:bg-white/10 rounded transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: '#333', backgroundColor: '#222' }}>
            {(['settings', 'database'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 px-4 py-2 text-xs font-medium transition-colors"
                style={{
                  color: activeTab === tab ? '#fff' : '#888',
                  borderBottom: activeTab === tab ? '2px solid #3B82F6' : '2px solid transparent',
                }}
              >
                {tab === 'settings' ? 'Settings' : `Database (${entries.length})`}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#1a1a1a' }}>
            {activeTab === 'settings' && (
              <div className="p-4 space-y-4">
                {/* Query Input with drag & drop */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: '#fff' }}>
                    Query Input
                  </label>
                  <div
                    className={`relative ${isDragOverQuery ? 'ring-2 ring-green-500' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOverQuery(true); }}
                    onDragLeave={() => setIsDragOverQuery(false)}
                    onDrop={handleQueryDrop}
                  >
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Exemplu: Chisinau Bucuresti 2026-01-22"
                      className="w-full px-3 py-2.5 rounded-lg text-sm font-mono"
                      style={{
                        backgroundColor: '#252525',
                        border: '1px solid #333',
                        color: '#fff',
                      }}
                    />
                  </div>
                  {isDragOverQuery && (
                    <p className="text-xs text-green-400">
                      Drop field to use as query input
                    </p>
                  )}

                  {/* Show resolved value */}
                  {query && query.includes('{{') && (
                    <div
                      className="mt-2 p-3 rounded-lg"
                      style={{
                        backgroundColor: resolvedQuery ? '#1a2e1a' : '#2a2a1a',
                        border: `1px solid ${resolvedQuery ? '#2d5a2d' : '#5a5a2d'}`,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium" style={{ color: resolvedQuery ? '#4ade80' : '#fbbf24' }}>
                          {resolvedQuery ? '✓ Valoare rezolvată:' : '⚠ Nu s-a putut rezolva expresia'}
                        </span>
                      </div>
                      {resolvedQuery ? (
                        <code
                          className="block text-sm font-mono p-2 rounded"
                          style={{ backgroundColor: '#0d1f0d', color: '#4ade80' }}
                        >
                          {resolvedQuery}
                        </code>
                      ) : (
                        <p className="text-xs" style={{ color: '#9CA3AF' }}>
                          Execută workflow-ul sau adaugă date în Webhook pentru a vedea valoarea.
                        </p>
                      )}
                    </div>
                  )}

                  <p className="text-xs" style={{ color: '#888' }}>
                    Format: "Oraș1 Oraș2 YYYY-MM-DD" sau expresie template
                  </p>
                </div>

                {/* How it works */}
                <div
                  className="rounded-lg p-4 space-y-2"
                  style={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                >
                  <h4 className="font-medium flex items-center gap-2 text-sm" style={{ color: '#60A5FA' }}>
                    <FileText className="w-4 h-4" />
                    Cum funcționează
                  </h4>
                  <ul className="text-xs space-y-1 list-disc list-inside" style={{ color: '#9CA3AF' }}>
                    <li>Parseză input-ul pentru a extrage numele orașelor și data</li>
                    <li>Caută fiecare oraș în baza de date folosind fuzzy matching</li>
                    <li>Ignoră diacriticele: Chișinău = Chisinau, București = Bucuresti</li>
                    <li>Returnează ID-urile găsite în format: "40,143,2026-01-22"</li>
                  </ul>
                </div>

                {/* Example */}
                <div
                  className="rounded-lg p-4 space-y-3"
                  style={{ backgroundColor: '#252525', border: '1px solid #333' }}
                >
                  <h4 className="font-medium text-sm" style={{ color: '#fff' }}>Exemplu</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span style={{ color: '#888' }}>Input:</span>
                      <code
                        className="block mt-1 p-2 rounded text-xs"
                        style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#4ade80' }}
                      >
                        "Chisinau Bucuresti 2026-01-22"
                      </code>
                    </div>
                    <div>
                      <span style={{ color: '#888' }}>Output formatted:</span>
                      <code
                        className="block mt-1 p-2 rounded text-xs"
                        style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#4ade80' }}
                      >
                        "40,143,2026-01-22"
                      </code>
                    </div>
                  </div>
                </div>

                {/* Execution Error */}
                {executionError && (
                  <div
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: '#3d1f1f', border: '1px solid #7f1d1d' }}
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-400">Eroare</p>
                        <p className="text-xs text-red-300 mt-1">{executionError}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Execution Result Preview */}
                {executionResult && !executionError && (
                  <div
                    className="rounded-lg p-4 space-y-2"
                    style={{
                      backgroundColor: executionResult.success ? '#1a3d1a' : '#3d3d1a',
                      border: `1px solid ${executionResult.success ? '#2d5a2d' : '#5a5a2d'}`
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {executionResult.success ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                      )}
                      <span className={`text-sm font-medium ${executionResult.success ? 'text-green-400' : 'text-yellow-400'}`}>
                        {executionResult.success ? 'Toate orașele găsite!' : 'Unele orașe nu au fost găsite'}
                      </span>
                    </div>
                    <div className="text-xs space-y-1" style={{ color: '#9CA3AF' }}>
                      <p>Query: <span className="text-white">{executionResult.query}</span></p>
                      <p>Output: <span className="text-green-400 font-mono">{executionResult.formattedOutput}</span></p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'database' && (
              <div className="p-4 space-y-4">
                {/* Import/Export Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt,.json,.xml"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                    style={{ backgroundColor: '#333', color: '#fff', border: '1px solid #444' }}
                  >
                    <Upload className="w-3 h-3" />
                    Încarcă fișier
                  </button>
                  <button
                    onClick={() => {
                      setEntries(DEFAULT_CITY_DATABASE);
                      setDatabaseText(''); // Clear raw text since we're using structured data
                      toast.success(`Încărcate ${DEFAULT_CITY_DATABASE.length} locații din baza de date default`);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                    style={{ backgroundColor: '#3B82F6', color: '#fff', border: '1px solid #2563EB' }}
                  >
                    <Database className="w-3 h-3" />
                    Default ({DEFAULT_CITY_DATABASE.length})
                  </button>
                  <button
                    onClick={handleExportCSV}
                    disabled={entries.length === 0}
                    className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: entries.length > 0 ? '#333' : '#222',
                      color: entries.length > 0 ? '#fff' : '#666',
                      border: '1px solid #444'
                    }}
                  >
                    <Download className="w-3 h-3" />
                    Export CSV
                  </button>
                  <button
                    onClick={handleExportJSON}
                    disabled={entries.length === 0}
                    className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: entries.length > 0 ? '#333' : '#222',
                      color: entries.length > 0 ? '#fff' : '#666',
                      border: '1px solid #444'
                    }}
                  >
                    <Download className="w-3 h-3" />
                    Export JSON
                  </button>

                  {/* Delete All Button */}
                  <button
                    onClick={() => {
                      if (window.confirm(`Sigur vrei să ștergi toate cele ${entries.length} locații?`)) {
                        setEntries([]);
                        setDatabaseText('');
                        toast.success('Toate locațiile au fost șterse');
                      }
                    }}
                    disabled={entries.length === 0}
                    className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ml-auto"
                    style={{
                      backgroundColor: entries.length > 0 ? '#7f1d1d' : '#222',
                      color: entries.length > 0 ? '#fca5a5' : '#666',
                      border: '1px solid #991b1b'
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                    Șterge tot ({entries.length})
                  </button>

                  {importStatus.type && (
                    <span className={`text-xs ml-auto flex items-center gap-1 ${importStatus.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                      {importStatus.type === 'success' ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {importStatus.message}
                    </span>
                  )}
                </div>

                <p className="text-xs" style={{ color: '#888' }}>
                  Formate suportate: CSV, TXT, JSON, XML. Exemplu: <code className="px-1 rounded" style={{ backgroundColor: '#333' }}>90,Moskva 2,Minsk 257,London</code> sau XML cu tag-uri <code className="px-1 rounded" style={{ backgroundColor: '#333' }}>&lt;point_id&gt;</code> și <code className="px-1 rounded" style={{ backgroundColor: '#333' }}>&lt;point_latin_name&gt;</code>
                </p>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#666' }} />
                  <input
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Caută după ID sau nume..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
                    style={{
                      backgroundColor: '#252525',
                      border: '1px solid #333',
                      color: '#fff',
                    }}
                  />
                </div>

                {/* Add New Entry */}
                <div className="flex items-end gap-2">
                  <div className="w-24">
                    <label className="text-xs" style={{ color: '#888' }}>ID</label>
                    <input
                      type="number"
                      value={newEntryId}
                      onChange={(e) => setNewEntryId(e.target.value)}
                      placeholder="40"
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        backgroundColor: '#252525',
                        border: '1px solid #333',
                        color: '#fff',
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs" style={{ color: '#888' }}>Nume locație</label>
                    <input
                      value={newEntryName}
                      onChange={(e) => setNewEntryName(e.target.value)}
                      placeholder="Chisinau"
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        backgroundColor: '#252525',
                        border: '1px solid #333',
                        color: '#fff',
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddEntry()}
                    />
                  </div>
                  <button
                    onClick={handleAddEntry}
                    disabled={!newEntryId || !newEntryName.trim()}
                    className="px-3 py-2 rounded-lg transition-colors"
                    style={{
                      backgroundColor: newEntryId && newEntryName.trim() ? '#3B82F6' : '#333',
                      color: '#fff',
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Entries List */}
                <div
                  className="rounded-lg overflow-hidden"
                  style={{ border: '1px solid #333' }}
                >
                  <div
                    className="px-3 py-2 flex items-center gap-1 text-xs font-medium"
                    style={{ backgroundColor: '#252525', color: '#888', borderBottom: '1px solid #333' }}
                  >
                    <span className="w-12">ID</span>
                    <span className="w-24">LATIN</span>
                    <span className="w-24">RU</span>
                    <span className="w-24">UA</span>
                    <span className="w-20">ORIGINAL</span>
                    <span className="w-20">ȚARA</span>
                    <span className="w-10">COD</span>
                    <span className="flex-1 text-right">POP.</span>
                    <span className="w-8"></span>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto" style={{ backgroundColor: '#1a1a1a' }}>
                    {sortedEntries.map((entry, index) => (
                      <div
                        key={`${entry.point_id}-${index}`}
                        className="px-3 py-2 flex items-center gap-1 hover:bg-[#252525] transition-colors text-xs"
                        style={{ borderBottom: '1px solid #2a2a2a' }}
                      >
                        <span className="w-12 font-mono" style={{ color: '#60A5FA' }}>{entry.point_id}</span>
                        <span className="w-24 truncate" style={{ color: '#fff' }} title={entry.point_latin_name}>{entry.point_latin_name}</span>
                        <span className="w-24 truncate" style={{ color: '#f59e0b' }} title={entry.point_ru_name}>{entry.point_ru_name || '-'}</span>
                        <span className="w-24 truncate" style={{ color: '#3b82f6' }} title={entry.point_ua_name}>{entry.point_ua_name || '-'}</span>
                        <span className="w-20 truncate" style={{ color: '#a78bfa' }} title={entry.point_name}>{entry.point_name || '-'}</span>
                        <span className="w-20 truncate" style={{ color: '#9CA3AF' }} title={entry.country_name}>{entry.country_name || '-'}</span>
                        <span className="w-10 font-mono" style={{ color: '#10b981' }}>{entry.country_kod_two || '-'}</span>
                        <span className="flex-1 text-right font-mono" style={{ color: '#9CA3AF' }}>
                          {entry.population ? entry.population.toLocaleString() : '-'}
                        </span>
                        <button
                          onClick={() => handleRemoveEntry(entries.indexOf(entry))}
                          className="p-1 rounded opacity-50 hover:opacity-100 hover:bg-red-900/30 transition-all"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    ))}
                    {sortedEntries.length === 0 && (
                      <div className="px-4 py-8 text-center">
                        <Database className="w-8 h-8 mx-auto mb-2" style={{ color: '#444' }} />
                        <p className="text-sm" style={{ color: '#888' }}>
                          {searchFilter ? 'Nu s-au găsit rezultate' : 'Încarcă un fișier cu locații'}
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#666' }}>
                          Format: point_id,point_latin_name
                        </p>
                      </div>
                    )}
                  </div>
                  {entries.length > 0 && (
                    <div
                      className="px-4 py-2 text-xs"
                      style={{ backgroundColor: '#252525', color: '#888', borderTop: '1px solid #333' }}
                    >
                      {searchFilter
                        ? `${sortedEntries.length} din ${entries.length} locații`
                        : `Total: ${entries.length} locații`
                      }
                    </div>
                  )}
                </div>

                {/* Raw Text Editor */}
                <div className="space-y-2">
                  <button
                    onClick={() => setShowRawEditor(!showRawEditor)}
                    className="flex items-center gap-2 text-xs transition-colors"
                    style={{ color: '#888' }}
                  >
                    {showRawEditor ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    Editor text raw
                  </button>
                  {showRawEditor && (
                    <textarea
                      value={databaseText}
                      onChange={(e) => setDatabaseText(e.target.value)}
                      onBlur={(e) => {
                        // Parse the raw text when user finishes editing
                        const parsed = parseDatabaseText(e.target.value);
                        if (parsed.length > 0) {
                          setEntries(parsed);
                        }
                      }}
                      placeholder="Paste text here: 90,Moskva 2,Minsk 257,London ..."
                      className="w-full h-40 px-3 py-2 rounded-lg text-xs font-mono resize-none"
                      style={{
                        backgroundColor: '#252525',
                        border: '1px solid #333',
                        color: '#fff',
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between gap-3 px-4 py-3 border-t"
            style={{ borderColor: '#333', backgroundColor: '#222' }}
          >
            {/* Database info */}
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">
                {entries.length > 0 ? (
                  <span className="text-green-400">{entries.length} locații încărcate</span>
                ) : (
                  <span className="text-yellow-400">Nicio locație. Încarcă un fișier în tab-ul Database.</span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: '#333', color: '#fff' }}
              >
                Close
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: '#3B82F6', color: '#fff' }}
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>

        {/* OUTPUT Panel - Right */}
        <div
          className="hidden lg:flex flex-col overflow-hidden"
          style={{
            flex: 1,
            minWidth: '350px',
            backgroundColor: 'rgba(19, 20, 25, 0.6)',
            backdropFilter: 'blur(5px)',
            borderTopRightRadius: '8px',
            borderBottomRightRadius: '8px',
            borderLeft: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div className="flex-1 overflow-auto">
            <N8NNodeIOPanel
              title="OUTPUT"
              data={currentOutputData}
              isLoading={isExecuting}
              error={executionError}
              enableDrag={false}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default N8NCityLookupConfig;

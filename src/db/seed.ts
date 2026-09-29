import { getDb, notifyChange } from './index';
import { now } from '../utils';

/**
 * A small starter constellation so the galaxy is alive on first launch.
 * Only well documented facts, everything is editable or deletable.
 */
type SeedArtist = [id: string, name: string, latin: string, tradition: 'persian' | 'classical', born: string | null, died: string | null, instruments: string | null, bio: string];

const ARTISTS: SeedArtist[] = [
  ['sd_vaziri', 'علی‌نقی وزیری', 'Ali-Naqi Vaziri', 'persian', '1887', '1979', 'تار', 'نظریه‌پرداز و آهنگساز، بنیان‌گذار مدرسهٔ عالی موسیقی و از نخستین کسانی که موسیقی ایرانی را با خط نت نوشت و آموزش داد.'],
  ['sd_saba', 'ابوالحسن صبا', 'Abolhasan Saba', 'persian', '1902', '1957', 'ویولن، سه‌تار، سنتور', 'نوازنده و آموزگار بزرگ موسیقی ایرانی؛ ردیف‌ها و دوره‌های آموزشی او هنوز پایهٔ آموزش ویولن و سنتور ایرانی است.'],
  ['sd_khaleghi', 'روح‌الله خالقی', 'Ruhollah Khaleghi', 'persian', '1906', '1965', 'ویولن', 'آهنگساز و پژوهشگر، شاگرد وزیری و بنیان‌گذار هنرستان موسیقی ملی؛ سازندهٔ سرود «ای ایران».'],
  ['sd_tajvidi', 'علی تجویدی', 'Ali Tajvidi', 'persian', '1919', '2006', 'ویولن', 'آهنگساز و ویولن‌نواز، شاگرد صبا و از آهنگسازان پرکار برنامه‌های گل‌ها.'],
  ['sd_khaledi', 'مهدی خالدی', 'Mehdi Khaledi', 'persian', '1919', '1990', 'ویولن', 'ویولن‌نواز و آهنگساز، شاگرد صبا؛ بسیاری از ترانه‌های دلکش را ساخت.'],
  ['sd_badiei', 'حبیب‌الله بدیعی', 'Habibollah Badiei', 'persian', '1933', '2015', 'ویولن', 'ویولن‌نواز و آهنگساز، شاگرد صبا و از نوازندگان برجستهٔ رادیو و گل‌ها.'],
  ['sd_khorram', 'همایون خرم', 'Homayoun Khorram', 'persian', '1930', '2016', 'ویولن', 'آهنگساز و ویولن‌نواز، شاگرد صبا و سازندهٔ آثار ماندگار بسیاری برای خوانندگان گل‌ها.'],
  ['sd_mahjubi', 'مرتضی محجوبی', 'Morteza Mahjubi', 'persian', '1900', '1965', 'پیانو', 'نوازندهٔ بی‌همتای پیانو در موسیقی ایرانی، همراه همیشگی بسیاری از اجراهای گل‌ها.'],
  ['sd_rahi', 'رهی معیری', 'Rahi Moayeri', 'persian', '1909', '1968', null, 'شاعر و غزل‌سرا؛ شعرهایش در برنامه‌های گل‌ها با صدای خوانندگان بزرگ جاودانه شد.'],
  ['sd_banan', 'غلامحسین بنان', 'Gholam-Hossein Banan', 'persian', '1911', '1986', 'آواز', 'از صداهای بی‌مانند آواز ایرانی، با اجرایی آرام، دقیق و پرمعنا.'],
  ['sd_delkash', 'دلکش', 'Delkash', 'persian', '1924', '2004', 'آواز', 'عصمت باقرپور، خوانندهٔ پرآوازهٔ دهه‌های سی و چهل با صدایی گرم و پرتوان.'],
  ['sd_marzieh', 'مرضیه', 'Marzieh', 'persian', '1924', '2010', 'آواز', 'اشرف مرتضایی، از خوانندگان برجستهٔ برنامه‌های گل‌ها.'],
  ['sd_elaheh', 'الهه', 'Elaheh', 'persian', '1934', '2007', 'آواز', 'از خوانندگان محبوب برنامه‌های رادیو و گل‌ها.'],
  ['sd_parvin', 'پروین', 'Parvin', 'persian', null, null, 'آواز', 'از خوانندگان نسل طلایی رادیو.'],
  ['sd_qamar', 'قمرالملوک وزیری', 'Qamar-ol-Moluk Vaziri', 'persian', '1905', '1959', 'آواز', 'نخستین زن ایرانی که در کنسرتی عمومی آواز خواند؛ ملکهٔ آواز ایران.'],
  ['sd_bach', 'یوهان سباستین باخ', 'Johann Sebastian Bach', 'classical', '1685', '1750', 'ارگ، کلاویه', 'آهنگساز باروک آلمانی و استاد کنترپوان؛ پایهٔ بسیاری از موسیقی غرب.'],
  ['sd_haydn', 'یوزف هایدن', 'Joseph Haydn', 'classical', '1732', '1809', null, '«پدر سمفونی» و «پدر کوارتت زهی»، از ستون‌های دورهٔ کلاسیک.'],
  ['sd_mozart', 'ولفگانگ آمادئوس موتسارت', 'Wolfgang Amadeus Mozart', 'classical', '1756', '1791', 'پیانو، ویولن', 'نابغهٔ دورهٔ کلاسیک با بیش از ششصد اثر در همهٔ قالب‌ها.'],
  ['sd_salieri', 'آنتونیو سالیری', 'Antonio Salieri', 'classical', '1750', '1825', null, 'آهنگساز و آموزگار دربار وین؛ شاگردانی چون بتهوون، شوبرت و لیست داشت.'],
  ['sd_beethoven', 'لودویگ فان بتهوون', 'Ludwig van Beethoven', 'classical', '1770', '1827', 'پیانو', 'پلی میان دورهٔ کلاسیک و رمانتیک؛ نُه سمفونی و ۳۲ سونات پیانو.'],
  ['sd_schubert', 'فرانتس شوبرت', 'Franz Schubert', 'classical', '1797', '1828', 'پیانو', 'استاد آواز هنری (لید) با بیش از ششصد ترانه در عمری کوتاه.'],
  ['sd_chopin', 'فردریک شوپن', 'Frédéric Chopin', 'classical', '1810', '1849', 'پیانو', 'شاعر پیانو؛ نوکتورن‌ها، اتودها و بالادهایش قلب رمانتیسم‌اند.'],
  ['sd_liszt', 'فرانتس لیست', 'Franz Liszt', 'classical', '1811', '1886', 'پیانو', 'پیانیست افسانه‌ای و آفرینندهٔ پوئم سمفونیک.'],
  ['sd_rschumann', 'روبرت شومان', 'Robert Schumann', 'classical', '1810', '1856', 'پیانو', 'آهنگساز و منتقد رمانتیک آلمانی.'],
  ['sd_cschumann', 'کلارا شومان', 'Clara Schumann', 'classical', '1819', '1896', 'پیانو', 'از بزرگ‌ترین پیانیست‌های قرن نوزدهم و آهنگساز.'],
  ['sd_brahms', 'یوهانس برامس', 'Johannes Brahms', 'classical', '1833', '1897', 'پیانو', 'آهنگساز رمانتیک آلمانی با چهار سمفونی ماندگار.'],
  ['sd_tchaikovsky', 'پیوتر ایلیچ چایکوفسکی', 'Pyotr Ilyich Tchaikovsky', 'classical', '1840', '1893', null, 'آهنگساز روس؛ دریاچهٔ قو، فندق‌شکن و سمفونی پاتتیک.'],
  ['sd_debussy', 'کلود دبوسی', 'Claude Debussy', 'classical', '1862', '1918', 'پیانو', 'چهرهٔ اصلی امپرسیونیسم در موسیقی؛ «مهتاب» و «دریا».'],
];

type SeedRel = [from: string, to: string, kind: string];
const RELATIONS: SeedRel[] = [
  ['sd_vaziri', 'sd_saba', 'teacher'],
  ['sd_vaziri', 'sd_khaleghi', 'teacher'],
  ['sd_saba', 'sd_tajvidi', 'teacher'],
  ['sd_saba', 'sd_khaledi', 'teacher'],
  ['sd_saba', 'sd_badiei', 'teacher'],
  ['sd_saba', 'sd_khorram', 'teacher'],
  ['sd_khaleghi', 'sd_banan', 'collaborator'],
  ['sd_mahjubi', 'sd_banan', 'collaborator'],
  ['sd_khaledi', 'sd_delkash', 'collaborator'],
  ['sd_rahi', 'sd_delkash', 'collaborator'],
  ['sd_haydn', 'sd_beethoven', 'teacher'],
  ['sd_salieri', 'sd_beethoven', 'teacher'],
  ['sd_salieri', 'sd_schubert', 'teacher'],
  ['sd_salieri', 'sd_liszt', 'teacher'],
  ['sd_haydn', 'sd_mozart', 'friend'],
  ['sd_mozart', 'sd_beethoven', 'influence'],
  ['sd_bach', 'sd_chopin', 'influence'],
  ['sd_chopin', 'sd_liszt', 'friend'],
  ['sd_rschumann', 'sd_cschumann', 'family'],
  ['sd_rschumann', 'sd_brahms', 'influence'],
  ['sd_cschumann', 'sd_brahms', 'friend'],
  ['sd_mozart', 'sd_tchaikovsky', 'influence'],
  ['sd_chopin', 'sd_debussy', 'influence'],
];

type SeedWork = [id: string, title: string, latin: string | null, tradition: string, form: string | null, catalog: string | null, year: string | null, credits: [string, string][]];
const WORKS: SeedWork[] = [
  ['sdw_eyiran', 'ای ایران', 'Ey Iran', 'persian', 'سرود', null, '1944', [['sd_khaleghi', 'composer'], ['sd_banan', 'vocalist']]],
  ['sdw_moonlight', 'سونات مهتاب', 'Piano Sonata No. 14 "Moonlight"', 'classical', 'سونات', 'Op. 27 No. 2', '1801', [['sd_beethoven', 'composer']]],
  ['sdw_elise', 'برای الیزه', 'Für Elise', 'classical', null, 'WoO 59', '1810', [['sd_beethoven', 'composer']]],
  ['sdw_eine', 'سرناد کوچک شبانه', 'Eine kleine Nachtmusik', 'classical', 'سرناد', 'K. 525', '1787', [['sd_mozart', 'composer']]],
  ['sdw_nocturne', 'نوکتورن در می‌بمل ماژور', 'Nocturne in E-flat major', 'classical', 'نوکتورن', 'Op. 9 No. 2', '1832', [['sd_chopin', 'composer']]],
  ['sdw_clair', 'مهتاب', 'Clair de lune', 'classical', null, 'L. 75/3', '1905', [['sd_debussy', 'composer']]],
  ['sdw_cello', 'سوئیت شمارهٔ ۱ ویولنسل', 'Cello Suite No. 1', 'classical', 'سوئیت', 'BWV 1007', null, [['sd_bach', 'composer']]],
  ['sdw_swan', 'دریاچهٔ قو', 'Swan Lake', 'classical', 'باله', 'Op. 20', '1876', [['sd_tchaikovsky', 'composer']]],
];

export async function seedStarter(): Promise<void> {
  const db = await getDb();
  const t = now();
  await db.withTransactionAsync(async () => {
    for (const [id, name, latin, tradition, born, died, instruments, bio] of ARTISTS) {
      await db.runAsync(
        `INSERT OR IGNORE INTO artists (id, name, nameLatin, tradition, kind, born, died, instruments, bio, gallery, source, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 'person', ?, ?, ?, ?, '[]', 'نمونهٔ آغازین نغمه', ?, ?)`,
        [id, name, latin, tradition, born, died, instruments, bio, t, t],
      );
    }
    let i = 0;
    for (const [from, to, kind] of RELATIONS) {
      await db.runAsync('INSERT OR IGNORE INTO relations (id, fromId, toId, kind, createdAt) VALUES (?, ?, ?, ?, ?)', [`sdr_${i++}`, from, to, kind, t]);
    }
    for (const [id, title, latin, tradition, form, catalog, year, credits] of WORKS) {
      await db.runAsync(
        `INSERT OR IGNORE INTO works (id, title, titleLatin, tradition, form, catalog, year, sheetImages, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, ?)`,
        [id, title, latin, tradition, form, catalog, year, t, t],
      );
      for (const [artistId, role] of credits) {
        await db.runAsync('INSERT OR IGNORE INTO credits (id, artistId, role, workId, createdAt) VALUES (?, ?, ?, ?, ?)', [`sdc_${id}_${artistId}_${role}`, artistId, role, id, t]);
      }
    }
  });
  notifyChange();
}

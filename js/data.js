// ────────────────────────────────────────────────────────────────────────────
// DATA — Indian students in Germany, from official statistics only.
//
// "Indian students" = enrolled students with Indian citizenship (Destatis
// definition of "ausländische Studierende"), unless a figure says otherwise.
// Every number carries a `source` key that resolves in SOURCES below.
// Figures that no official body publishes are left as null — never estimated.
// ────────────────────────────────────────────────────────────────────────────

const META = {
  updated: '9 Oct 2026',
  latestSemester: 'WS 2025/26',
  baselineSemester: 'WS 2024/25',
};

const SOURCES = {
  'destatis-2526': {
    publisher: 'Destatis (Federal Statistical Office)',
    title: 'Statistik der Studierenden, Wintersemester 2025/2026 – Statistischer Bericht (tables 21311-01, -12, -19, -20, -22)',
    date: '13 Aug 2026',
    url: 'https://www.statistischebibliothek.de/mir/receive/DEHeft_mods_00174131',
  },
  'bmftr-2533': {
    publisher: 'BMFTR Datenportal (data: Destatis)',
    title: 'Tabelle 2.5.33 – Ausländische Studierende in Deutschland nach Hochschularten und Herkunftsstaaten',
    date: '2026',
    url: 'https://www.datenportal.bmftr.bund.de/portal/de/Tabelle-2.5.33.pdf',
  },
  'bundestag-21-7380': {
    publisher: 'Deutscher Bundestag (data: Destatis)',
    title: 'Drucksache 21/7380 – Antwort der Bundesregierung, Anlagen 1 & 2',
    date: '27 Jul 2026',
    url: 'https://dserver.bundestag.de/btd/21/073/2107380.pdf',
  },
  'wiwe-2026': {
    publisher: 'DAAD & DZHW (data: Destatis)',
    title: 'Wissenschaft weltoffen kompakt 2026 – Abb. 13: Internationale Studierende nach Bundesland',
    date: '2026',
    url: 'https://www.wissenschaft-weltoffen.de/de/daten/',
  },
  'by-2526': {
    publisher: 'Bayerisches Landesamt für Statistik',
    title: 'Ausländische Studierende in Bayern im Wintersemester 2025/26 nach Kontinenten und ausgewählten Ländern',
    date: '15 Jul 2026',
    url: 'https://www.statistik.bayern.de/mam/statistik/bildung_soziales/hochschulen/0202_ausl%C3%A4ndische_studierende_im_wintersemester_kontinente.pdf',
  },
  'by-2425': {
    publisher: 'Bayerisches Landesamt für Statistik',
    title: 'Statistischer Bericht B3120C 202400 – Studierende an den Hochschulen in Bayern, WS 2024/25 (Tabelle 9)',
    date: '2025',
    url: 'https://statistik.bayern.de/mam/produkte/veroffentlichungen/statistische_berichte/b3120c_202400.pdf',
  },
  'nw-2425': {
    publisher: 'IT.NRW (Statistical Office of North Rhine-Westphalia)',
    title: 'Press release: 701.358 Studierende im Wintersemester 2024/25',
    date: '21 Jul 2025',
    url: 'https://www.it.nrw/nrw-weiterer-rueckgang-der-studierendenzahl-rekordhoch-auslaendischen-studierenden-im',
  },
  'bw-2425': {
    publisher: 'Statistisches Landesamt Baden-Württemberg',
    title: 'Statistischer Bericht B III 1 - j/25 – Studierende an baden-württembergischen Hochschulen im WS 2024/25 (Tabelle 7)',
    date: '23 Oct 2025',
    url: 'https://www.statistik-bw.de/fileadmin/user_upload/Service/Veroeff/Statistische_Berichte/323425001.pdf',
  },
  'he-2425': {
    publisher: 'Hessisches Statistisches Landesamt',
    title: 'Statistischer Bericht B III 1 / B III 11 - j – Studierende in Hessen im WS 2024/2025 (Tabelle 10)',
    date: 'Jan 2026',
    url: 'https://statistik.hessen.de/sites/statistik.hessen.de/files/2026-01/biii1_biii11_j_ws24-25.pdf',
  },
  'sn-2425': {
    publisher: 'Statistisches Landesamt des Freistaates Sachsen',
    title: 'Medieninformation 29/2025 – Studierende im Wintersemester 2024/25',
    date: '2025',
    url: 'https://www.statistik.sachsen.de/download/presse-2025/mi_statistik-sachsen-029-2025_studierende-wintersemester-2024-2025.pdf',
  },
  'sn-2526': {
    publisher: 'Statistisches Landesamt des Freistaates Sachsen',
    title: 'Medieninformation 064/2026 – Studierende im Wintersemester 2025/26',
    date: '2026',
    url: 'https://www.statistik.sachsen.de/download/presse-2026/mi_statistik-sachsen-064-2026_studierende_wintersemester_2025_2026.pdf',
  },
  'mv-2425': {
    publisher: 'Statistisches Amt Mecklenburg-Vorpommern',
    title: 'Statistischer Bericht B313 2024 00 – Studierende an Hochschulen in M-V, WS 2024/25',
    date: '27 Oct 2025',
    url: 'https://www.statistischebibliothek.de/mir/servlets/MCRFileNodeServlet/MVHeft_derivate_00007998/B313%202024%2000.pdf',
  },
  'th-2324': {
    publisher: 'Thüringer Landesamt für Statistik',
    title: 'Statistischer Bericht B III - j/24 – Studierende und Personal an den Hochschulen in Thüringen 2023/24 (Tabelle 8)',
    date: '2024',
    url: 'https://statistik.thueringen.de/webshop/pdf/2024/02301_2024_00.pdf',
  },
  'bebb-2425': {
    publisher: 'Amt für Statistik Berlin-Brandenburg (special evaluation, 19 Sep 2025), as published by Minor – Projektkontor für Bildung und Forschung',
    title: 'Zuwanderung indischer Staatsangehöriger nach Berlin – Kurzbericht',
    date: 'Dec 2025',
    url: 'https://minor-kontor.de/wp-content/uploads/2025/12/Minor_ELLaB_Kurzbericht_Zuwanderung-indischer-Staatsangehoeriger.pdf',
  },
  'muc-2425': {
    publisher: 'Statistisches Amt der Landeshauptstadt München',
    title: 'Jahrestabelle – Studierende an Münchner Hochschulen nach Staatsangehörigkeit, WS 2024/25',
    date: '2026',
    url: 'https://lhm.muenchen.swm.de/dam/jcr:c723563b-de5e-4a3d-9eba-17d55b2b6d55/jt260316.pdf',
  },
  'passau-2425': {
    publisher: 'Universität Passau',
    title: 'Wintersemester 2024/25 – Herkunft nach Staatsangehörigkeit (preliminary, 8 Oct 2024)',
    date: 'Oct 2024',
    url: 'https://uni-passau.de/fileadmin/dokumente/beschaeftigte/kommunikation_marketing/Zahlen_Daten_Fakten/WiSe_24_Staatsangeh%C3%B6rigkeit_Internet.pdf',
  },
  'tudo-2025': {
    publisher: 'TU Dortmund University',
    title: 'News: Growing Community of Students from India',
    date: '28 Mar 2025',
    url: 'https://www.tu-dortmund.de/en/newsdetail/steady-influx-of-students-from-india-50981/',
  },
  'siegen-2425': {
    publisher: 'Universität Siegen',
    title: 'Studierende nach Staatsangehörigkeit, WiSe 2024/2025 (Report 310)',
    date: '15 Jan 2025',
    url: 'https://www.uni-siegen.de/start/die_universitaet/ueber_uns/daten/studierendenstatistiken/auslaendisches_studierende/herkunftsland/2025-01-15-report_310-n-herkunftsland.pdf',
  },
  'rwth-2526': {
    publisher: 'RWTH Aachen University',
    title: 'Studierendenzahlen Kompakt WS 2025/26 (reference date 1 Dec 2025)',
    date: '2026',
    url: 'https://www.rwth-aachen.de/cms/root/die-rwth/profil/~enw/daten-fakten/',
  },
  'ulm-2425': {
    publisher: 'Universität Ulm',
    title: 'Studierendenstatistik WS 2024/25 – Statistik 7 (Staatsangehörigkeit)',
    date: '2024',
    url: 'https://uni-ulm.de/fileadmin/website_uni_ulm/studium/Studierendenstatistik/WS2024/Statistik_7_WS_24_25.pdf',
  },
  'jena-2425': {
    publisher: 'Friedrich-Schiller-Universität Jena',
    title: 'Tabelle 12 – Internationale Studierende im WS 2024/25 nach Herkunftsländern',
    date: '31 Oct 2024',
    url: 'https://hanfried.uni-jena.de/vhbmedia/30217/wise2024-25-tab12.pdf',
  },
  'oldenburg-2526': {
    publisher: 'Carl von Ossietzky Universität Oldenburg',
    title: 'Ausländische Studierende nach Staatsangehörigkeit, WiSe 2025/26',
    date: '9 Dec 2025',
    url: 'https://uol.de/fileadmin/referatplanung/Akademisches_Controlling/01_Studium_Lehre/02_Studierende/Stud-SUE6_Ausl-Staatsang_20252_251209_EV.pdf',
  },
  'viadrina-2425': {
    publisher: 'Europa-Universität Viadrina',
    title: 'Studierende nach Staatsangehörigkeit, Wintersemester 2024/25',
    date: '31 Oct 2024',
    url: 'https://europa-uni.de/de/universitaet/einrichtungen/verwaltung/dezernat-1/studierendenstatistik/_dateien-statistik/887-2024-Wintersemester/stat-5-herkunftslaender.pdf',
  },
  'greifswald-2526': {
    publisher: 'Universität Greifswald',
    title: 'Studierende (Ausländer) nach Staatsangehörigkeit, Wintersemester 2025/2026',
    date: '2025',
    url: 'https://www.uni-greifswald.de/storages/uni-greifswald/1_Universitaet/1.1_Information/1.1.6_Zahlen_und_Fakten/Grunddaten_und_Kennzahlen/2025/WS_25_Statistik_Auslaender_Staatenherkunft.pdf',
  },
  'saarland-2526': {
    publisher: 'Universität des Saarlandes',
    title: 'Studierendenstatistik WS 2025/26 nach Herkunft (Tabelle 2: Bildungsausländer nach Staat der HZB)',
    date: '30 Nov 2025',
    url: 'https://www.uni-saarland.de/fileadmin/upload/universitaet/statistik/2025-ws/herkunft.pdf',
  },
};

// ── Germany as a whole ───────────────────────────────────────────────────────
const NATIONAL = {
  latest: {
    semester: 'WS 2025/26',
    indians: 69816, male: 48149, female: 21667,
    firstSemester: 14828,            // new entrants in their 1st university semester
    universities: 37156,
    appliedSciences: 32599,          // Fachhochschulen / HAW (excl. public-administration colleges)
    otherTypes: 61,                  // art, theological, teacher-training, administration
    foreignTotal: 516820, studentsTotal: 2864160,
    source: 'destatis-2526',
  },
  previous: {
    semester: 'WS 2024/25',
    indians: 59419, publicHE: 48181, privateHE: 11238,
    source: 'bundestag-21-7380',
  },
  // Students with Indian citizenship, all German universities (winter semesters)
  trend: [
    { sem: '2013/14', v: 9619 },  { sem: '2014/15', v: 11860 }, { sem: '2015/16', v: 13740 },
    { sem: '2016/17', v: 15529 }, { sem: '2017/18', v: 17570 }, { sem: '2018/19', v: 20810 },
    { sem: '2019/20', v: 25149 }, { sem: '2020/21', v: 28905 }, { sem: '2021/22', v: 34134 },
    { sem: '2022/23', v: 42997 }, { sem: '2023/24', v: 49483 }, { sem: '2024/25', v: 59419 },
    { sem: '2025/26', v: 69816 },
  ],
  trendSource: 'bmftr-2533',
  // Field of first subject, WS 2025/26 (Destatis 21311-20); groups merged for readability
  subjects: [
    { name: 'Engineering', v: 42486 },
    { name: 'Law, economics & social sciences', v: 14605 },   // law 243 + economics 13,256 + social sciences & sport 1,106
    { name: 'Mathematics & natural sciences', v: 8463 },
    { name: 'Agriculture, forestry & nutrition', v: 1714 },
    { name: 'Other fields', v: 2548 },                         // humanities 1,232 + medicine/health 844 + art 428 + other 44
  ],
  subjectSource: 'destatis-2526',
  // Largest countries of origin among foreign students, WS 2025/26 (Destatis 21311-19)
  origins: [
    { name: 'India', v: 69816 }, { name: 'China', v: 42547 }, { name: 'Türkiye', v: 36807 },
    { name: 'Iran', v: 19277 }, { name: 'Syria', v: 18503 },
  ],
  // Degrees passed by Indian nationals, by exam year (Bundestag Drs. 21/7380, Anlage 2)
  graduates: [ { year: 2015, v: 2266 }, { year: 2020, v: 4330 }, { year: 2024, v: 8952 } ],
  graduatesSource: 'bundestag-21-7380',
};

// ── States ───────────────────────────────────────────────────────────────────
// india.base   → figure for the comparison semester (WS 2024/25 where published)
// india.latest → a newer official figure, if the state has already published one
// context      → all-nationality figures that exist for every state
//   students / foreign : WS 2025/26, Destatis 21311-01
//   intl2425 / intl1920 / intlShare : international students (foreign citizens
//                        with a foreign school-leaving certificate), DZHW Abb. 13
const STATES = [
  { id:'BY', en:'Bavaria', de:'Bayern',
    india: {
      base:   { v: 11933, sem: 'WS 2024/25', source: 'by-2425' },
      latest: { v: 13109, sem: 'WS 2025/26', female: 3635, male: 9474, source: 'by-2526' },
      subjects: { sem: 'WS 2024/25', source: 'by-2425', counts: { eng: 8136, les: 1826, mat: 1578, oth: 393 } },
    },
    context: { students: 401154, foreign: 88639, intl2425: 72483, intl1920: 46059, intlShare: 17.7 },
    notes: [ 'India is the largest country of origin among foreign students in Bavaria.' ],
    universities: [
      { name: 'All universities in Munich (city total)', v: 2631, sem: 'WS 2024/25', lat: 48.137, lon: 11.575, source: 'muc-2425' },
      { name: 'Universität Passau', v: 118, sem: 'WS 2024/25 (preliminary)', lat: 48.567, lon: 13.452, source: 'passau-2425' },
    ],
    topForeign: [
      { name: 'TU München', foreign: 21729, students: 52292 },
      { name: 'LMU München', foreign: 11338, students: 51737 },
      { name: 'FAU Erlangen-Nürnberg', foreign: 9962, students: 39209 },
      { name: 'TH Deggendorf', foreign: 4744, students: 9345 },
      { name: 'TH Ingolstadt', foreign: 3261, students: 8579 },
    ],
  },
  { id:'NW', en:'North Rhine-Westphalia', short:'NRW', de:'Nordrhein-Westfalen',
    india: { base: { v: 8821, sem: 'WS 2024/25', source: 'nw-2425' } },
    context: { students: 712295, foreign: 113075, intl2425: 81954, intl1920: 72287, intlShare: 11.6 },
    notes: [ 'In WS 2024/25 India became the second most common foreign nationality in NRW for the first time (Türkiye 10,594 · India 8,821 · China 8,609).' ],
    universities: [
      { name: 'TU Dortmund University', v: 466, sem: 'Mar 2025', lat: 51.492, lon: 7.413, source: 'tudo-2025', note: 'Largest international group on campus; about 90% are in Master’s programmes and about 30% are women.' },
      { name: 'Universität Siegen', v: 444, sem: 'WS 2024/25', female: 144, male: 300, lat: 50.906, lon: 8.029, source: 'siegen-2425' },
      { name: 'RWTH Aachen University', v: null, sem: 'WS 2025/26', lat: 50.778, lon: 6.078, source: 'rwth-2526', note: 'India is the 2nd-largest nationality (after China) among 15,881 international students; RWTH publishes the ranking as a chart without exact counts.' },
    ],
    topForeign: [
      { name: 'RWTH Aachen', foreign: 15939, students: 44587 },
      { name: 'Universität Duisburg-Essen', foreign: 7643, students: 37276 },
      { name: 'FernUniversität in Hagen', foreign: 7480, students: 68447 },
      { name: 'Ruhr-Universität Bochum', foreign: 6715, students: 37716 },
      { name: 'Universität Bonn', foreign: 6479, students: 34652 },
    ],
  },
  { id:'BW', en:'Baden-Württemberg', short:'Baden-Württ.', de:'Baden-Württemberg',
    india: { base: { v: 4658, sem: 'WS 2024/25', female: 1677, source: 'bw-2425' } },
    context: { students: 348743, foreign: 51270, intl2425: 37917, intl1920: 36580, intlShare: 10.8 },
    notes: [],
    universities: [
      { name: 'Universität Ulm', v: 150, sem: 'WS 2024/25', female: 52, male: 98, lat: 48.422, lon: 9.956, source: 'ulm-2425' },
    ],
    topForeign: [
      { name: 'Universität Heidelberg', foreign: 6265, students: 31417 },
      { name: 'KIT Karlsruhe', foreign: 5600, students: 22404 },
      { name: 'Universität Stuttgart', foreign: 4778, students: 20309 },
      { name: 'Universität Tübingen', foreign: 4365, students: 27750 },
      { name: 'Universität Freiburg', foreign: 4349, students: 24212 },
    ],
  },
  { id:'BE', en:'Berlin', de:'Berlin',
    india: {
      base: { v: 4545, sem: 'WS 2024/25', source: 'bebb-2425' },
      subjects: { sem: 'WS 2024/25', source: 'bebb-2425', shares: { les: 48.9, eng: 39.3 } },
    },
    context: { students: 202558, foreign: 52484, intl2425: 42721, intl1920: 35864, intlShare: 21.3 },
    notes: [
      'Indian students are the largest group of international students in Berlin.',
      '61.4% of Indian students in Berlin are enrolled at private universities — compared with about one in five nationwide.',
    ],
    universities: [],
    topForeign: [
      { name: 'TU Berlin', foreign: 10424, students: 34475 },
      { name: 'FU Berlin', foreign: 8736, students: 38748 },
      { name: 'Humboldt-Universität', foreign: 6198, students: 35526 },
      { name: 'HTW Berlin', foreign: 4077, students: 16028 },
      { name: 'University of Europe for Applied Sciences (Berlin campus)', foreign: 2938, students: 3204 },
    ],
  },
  { id:'HE', en:'Hesse', de:'Hessen',
    india: { base: { v: 4015, sem: 'WS 2024/25', female: 1465, male: 2550, source: 'he-2425' } },
    context: { students: 240325, foreign: 45066, intl2425: 32596, intl1920: 26471, intlShare: 13.4 },
    notes: [ 'Of the 4,015 Indian students, 2,672 study at universities and 1,331 at universities of applied sciences.' ],
    universities: [],
    topForeign: [
      { name: 'TU Darmstadt', foreign: 7847, students: 24465 },
      { name: 'Goethe-Universität Frankfurt', foreign: 6049, students: 40749 },
      { name: 'Universität Marburg', foreign: 4180, students: 20278 },
      { name: 'Frankfurt University of Applied Sciences', foreign: 3918, students: 15061 },
      { name: 'Universität Gießen', foreign: 3713, students: 24540 },
    ],
  },
  { id:'SN', en:'Saxony', de:'Sachsen',
    india: {
      base:   { v: 3345, sem: 'WS 2024/25', source: 'sn-2425' },
      latest: { v: 4031, sem: 'WS 2025/26', source: 'sn-2526' },
    },
    context: { students: 107636, foreign: 21113, intl2425: 18728, intl1920: 16963, intlShare: 18.1 },
    notes: [ 'India is the most common nationality among foreign students in Saxony (WS 2025/26: India 4,031 · China 1,972 · Austria 1,579).' ],
    universities: [],
    topForeign: [
      { name: 'TU Dresden', foreign: 5848, students: 27531 },
      { name: 'Universität Leipzig', foreign: 3459, students: 30337 },
      { name: 'TU Chemnitz', foreign: 2819, students: 8447 },
      { name: 'TU Bergakademie Freiberg', foreign: 2363, students: 4179 },
      { name: 'Hochschule Mittweida', foreign: 1458, students: 6350 },
    ],
  },
  { id:'BB', en:'Brandenburg', de:'Brandenburg',
    india: { base: { v: 2968, sem: 'WS 2024/25', source: 'bebb-2425' } },
    context: { students: 56483, foreign: 15685, intl2425: 12593, intl1920: 7391, intlShare: 23.9 },
    notes: [ 'Indian students are the largest group of non-German students in Brandenburg; private universities in Potsdam (e.g. UE, GISMA) are a major draw.' ],
    universities: [
      { name: 'Europa-Universität Viadrina', v: 196, sem: 'WS 2024/25', female: 71, male: 125, lat: 52.343, lon: 14.554, source: 'viadrina-2425' },
    ],
    topForeign: [
      { name: 'BTU Cottbus-Senftenberg', foreign: 3894, students: 7559 },
      { name: 'Universität Potsdam', foreign: 3060, students: 19652 },
      { name: 'GISMA University of Applied Sciences', foreign: 2139, students: 2154 },
      { name: 'University of Europe for Applied Sciences (Potsdam)', foreign: 1936, students: 1956 },
      { name: 'Europa-Universität Viadrina', foreign: 1638, students: 3841 },
    ],
  },
  { id:'TH', en:'Thuringia', de:'Thüringen',
    india: { base: { v: 5448, sem: 'WS 2023/24', female: 1600, source: 'th-2324', older: true } },
    context: { students: 155638, foreign: 27037, intl2425: 22819, intl1920: 9847, intlShare: 14.9 },
    notes: [
      'Thuringia’s latest published nationality breakdown is for WS 2023/24, one year older than the other states.',
      'IU International University is registered in Erfurt, so its students at campuses in other states (e.g. Berlin, Munich) are counted in Thuringia. This explains most of the state’s 132% rise in international students since 2019/20.',
    ],
    universities: [
      { name: 'Friedrich-Schiller-Universität Jena', v: 303, sem: 'WS 2024/25', lat: 50.929, lon: 11.590, source: 'jena-2425' },
    ],
    topForeign: [
      { name: 'IU International University (Erfurt)', foreign: 16595, students: 108463 },
      { name: 'Universität Jena', foreign: 2487, students: 16106 },
      { name: 'TU Ilmenau', foreign: 2150, students: 3968 },
      { name: 'Hochschule Schmalkalden', foreign: 1649, students: 2941 },
      { name: 'Bauhaus-Universität Weimar', foreign: 1190, students: 3825 },
    ],
  },
  { id:'MV', en:'Mecklenburg-Vorpommern', short:'Meckl.-Vorp.', de:'Mecklenburg-Vorpommern',
    india: {
      base: { v: 657, sem: 'WS 2024/25', female: 188, male: 469, source: 'mv-2425' },
      subjects: { sem: 'WS 2024/25', source: 'mv-2425', counts: { eng: 524, les: 40, mat: 60, oth: 33 } },
    },
    context: { students: 35639, foreign: 4101, intl2425: 3361, intl1920: 3594, intlShare: 9.3 },
    notes: [],
    universities: [
      { name: 'Universität Greifswald', v: 49, sem: 'WS 2025/26', female: 26, lat: 54.095, lon: 13.375, source: 'greifswald-2526' },
    ],
    topForeign: [
      { name: 'Universität Rostock', foreign: 1345, students: 12775 },
      { name: 'Hochschule Wismar', foreign: 1215, students: 7315 },
      { name: 'Universität Greifswald', foreign: 886, students: 9728 },
      { name: 'Hochschule Stralsund', foreign: 363, students: 1766 },
      { name: 'HMT Rostock', foreign: 166, students: 568 },
    ],
  },
  { id:'NI', en:'Lower Saxony', de:'Niedersachsen',
    india: null,
    context: { students: 185796, foreign: 27858, intl2425: 22408, intl1920: 20594, intlShare: 11.9 },
    notes: [],
    universities: [
      { name: 'Universität Oldenburg', v: 261, sem: 'WS 2025/26', female: 141, lat: 53.147, lon: 8.182, source: 'oldenburg-2526' },
    ],
    topForeign: [
      { name: 'Universität Göttingen', foreign: 5020, students: 26855 },
      { name: 'Leibniz Universität Hannover', foreign: 4344, students: 25377 },
      { name: 'TU Braunschweig', foreign: 3216, students: 15051 },
      { name: 'TU Clausthal', foreign: 1980, students: 2802 },
      { name: 'Universität Oldenburg', foreign: 1542, students: 14456 },
    ],
  },
  { id:'HH', en:'Hamburg', de:'Hamburg',
    india: null,
    context: { students: 122428, foreign: 18956, intl2425: 14396, intl1920: 10707, intlShare: 11.9 },
    notes: [],
    universities: [],
    topForeign: [
      { name: 'Universität Hamburg', foreign: 6029, students: 42585 },
      { name: 'HAW Hamburg', foreign: 3021, students: 16536 },
      { name: 'TU Hamburg', foreign: 2779, students: 8704 },
      { name: 'HFH Hamburger Fern-Hochschule', foreign: 2393, students: 13577 },
      { name: 'University of Europe for Applied Sciences (Hamburg campus)', foreign: 960, students: 1298 },
    ],
  },
  { id:'RP', en:'Rhineland-Palatinate', short:'Rhineland-Pal.', de:'Rheinland-Pfalz',
    india: null,
    context: { students: 109195, foreign: 18193, intl2425: 14084, intl1920: 12542, intlShare: 12.8 },
    notes: [],
    universities: [],
    topForeign: [
      { name: 'Universität Mainz', foreign: 3729, students: 29454 },
      { name: 'RPTU Kaiserslautern-Landau', foreign: 3182, students: 16047 },
      { name: 'Universität Trier', foreign: 1909, students: 10311 },
      { name: 'Hochschule Trier', foreign: 1839, students: 6510 },
      { name: 'Universität Koblenz', foreign: 1425, students: 9755 },
    ],
  },
  { id:'ST', en:'Saxony-Anhalt', de:'Sachsen-Anhalt',
    india: null,
    context: { students: 55113, foreign: 12109, intl2425: 10072, intl1920: 7565, intlShare: 18.3 },
    notes: [ 'The statistical office names India as the leading country of origin among international engineering students at Universität Magdeburg (WS 2025/26), but publishes no state-wide India figure.' ],
    universities: [],
    topForeign: [
      { name: 'Universität Magdeburg', foreign: 5315, students: 13121 },
      { name: 'Hochschule Anhalt', foreign: 2419, students: 6813 },
      { name: 'Universität Halle-Wittenberg', foreign: 1652, students: 18679 },
      { name: 'Hochschule Merseburg', foreign: 885, students: 3066 },
      { name: 'Steinbeis Hochschule (Magdeburg)', foreign: 618, students: 3484 },
    ],
  },
  { id:'SH', en:'Schleswig-Holstein', short:'Schleswig-Holst.', de:'Schleswig-Holstein',
    india: null,
    context: { students: 61900, foreign: 6662, intl2425: 4856, intl1920: 4266, intlShare: 7.7 },
    notes: [],
    universities: [],
    topForeign: [
      { name: 'Universität Kiel', foreign: 2544, students: 24438 },
      { name: 'Fachhochschule Kiel', foreign: 943, students: 7823 },
      { name: 'Universität zu Lübeck', foreign: 853, students: 6160 },
      { name: 'TH Lübeck', foreign: 701, students: 4832 },
      { name: 'Hochschule Flensburg', foreign: 530, students: 3002 },
    ],
  },
  { id:'SL', en:'Saarland', de:'Saarland',
    india: null,
    context: { students: 29625, foreign: 5810, intl2425: 4484, intl1920: 4016, intlShare: 15.1 },
    notes: [],
    universities: [
      { name: 'Universität des Saarlandes', v: 658, sem: 'WS 2025/26', female: 267, lat: 49.255, lon: 7.041, source: 'saarland-2526', note: 'Counted by country of school-leaving certificate (India), not by citizenship.' },
    ],
    topForeign: [
      { name: 'Universität des Saarlandes', foreign: 3955, students: 15644 },
      { name: 'htw saar', foreign: 1388, students: 6234 },
      { name: 'Hochschule für Musik Saar', foreign: 242, students: 523 },
      { name: 'DHfPG (private)', foreign: 117, students: 5886 },
      { name: 'HBK Saar', foreign: 100, students: 451 },
    ],
  },
  { id:'HB', en:'Bremen', de:'Bremen',
    india: null,
    context: { students: 39632, foreign: 8762, intl2425: 6611, intl1920: 5156, intlShare: 17.3 },
    notes: [],
    universities: [],
    topForeign: [
      { name: 'Universität Bremen', foreign: 3559, students: 18200 },
      { name: 'Constructor University (private)', foreign: 1896, students: 2001 },
      { name: 'Hochschule Bremen', foreign: 1711, students: 8596 },
      { name: 'Hochschule Bremerhaven', foreign: 756, students: 3036 },
      { name: 'HfK Bremen', foreign: 535, students: 1090 },
    ],
  },
];

// Sources behind every state's `context` and `topForeign` values
const CONTEXT_SOURCES = ['destatis-2526', 'wiwe-2026'];

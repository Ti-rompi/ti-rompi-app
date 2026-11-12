/*
 * Moteur de dates du calendrier copte orthodoxe.
 * Sans dépendance. Toutes les dates sont des numéros de jour julien (JDN, entiers),
 * ce qui évite tout problème de fuseau horaire. Les fonctions d'aide convertissent
 * depuis et vers les dates grégoriennes {y, m, d} (m de 1 à 12).
 *
 * Les règles marquées « À VALIDER » doivent être relues par un prêtre ou un diacre.
 */

// ---------------------------------------------------------------- calendriers

const MOIS_COPTES = ['Thout', 'Babah', 'Hatour', 'Kiahk', 'Toubah', 'Amshir', 'Baramhat',
  'Baramoudah', 'Bashans', 'Baounah', 'Abib', 'Misra', 'Nasie'];
const MOIS_GREGORIENS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
  'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

const fdiv = (a, b) => Math.floor(a / b);

/** Grégorien -> JDN */
function gregVersJdn(y, m, d) {
  const a = fdiv(14 - m, 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
  return d + fdiv(153 * mm + 2, 5) + 365 * yy + fdiv(yy, 4) - fdiv(yy, 100) + fdiv(yy, 400) - 32045;
}

/** JDN -> grégorien {y, m, d} */
function jdnVersGreg(j) {
  const a = j + 32044, b = fdiv(4 * a + 3, 146097), c = a - fdiv(146097 * b, 4);
  const d = fdiv(4 * c + 3, 1461), e = c - fdiv(1461 * d, 4), m = fdiv(5 * e + 2, 153);
  return { y: 100 * b + d - 4800 + fdiv(m, 10), m: m + 3 - 12 * fdiv(m, 10), d: e - fdiv(153 * m + 2, 5) + 1 };
}

/** Julien -> JDN */
function julienVersJdn(y, m, d) {
  const a = fdiv(14 - m, 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
  return d + fdiv(153 * mm + 2, 5) + 365 * yy + fdiv(yy, 4) - 32083;
}

const EPOQUE_COPTE = 1825030; // JDN du 1er Thout de l'an 1 des Martyrs (29 août 284, julien)

/** Une année copte est bissextile (Nasie de 6 jours) quand année % 4 === 3. */
const estBissextileCopte = (an) => ((an % 4) + 4) % 4 === 3;

/** Copte -> JDN (mois de 1 à 13) */
function copteVersJdn(an, mois, jour) {
  return EPOQUE_COPTE - 1 + 365 * (an - 1) + fdiv(an, 4) + 30 * (mois - 1) + jour;
}

/** JDN -> copte {an, mois, jour, nomMois} */
function jdnVersCopte(j) {
  const an = fdiv(4 * (j - EPOQUE_COPTE) + 1463, 1461);
  const mois = fdiv(j - copteVersJdn(an, 1, 1), 30) + 1;
  const jour = j - copteVersJdn(an, mois, 1) + 1;
  return { an, mois, jour, nomMois: MOIS_COPTES[mois - 1] };
}

/** Jour de la semaine : 0 = lundi … 6 = dimanche */
const jourSemaine = (j) => ((j % 7) + 7) % 7;

/** Pâques orthodoxe (calcul julien, règle d'Alexandrie) pour une année grégorienne -> JDN */
function paques(annee) {
  const a = annee % 4, b = annee % 7, c = annee % 19;
  const d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
  const mois = fdiv(d + e + 114, 31), jour = ((d + e + 114) % 31) + 1;
  return julienVersJdn(annee, mois, jour);
}

// ---------------------------------------------------------------- fêtes et périodes

/**
 * Nativité : 29 Kiahk, sauf l'année qui suit une année copte bissextile, où elle est
 * célébrée le 28 Kiahk pour rester le 7 janvier.
 */
function nativite(anCopte) {
  return copteVersJdn(anCopte, 4, estBissextileCopte(anCopte - 1) ? 28 : 29);
}

/** Paramoun : la veille ; si la fête tombe un dimanche ou un lundi, il commence le vendredi. (À VALIDER) */
function paramoun(jFete) {
  const dow = jourSemaine(jFete);
  const debut = dow === 6 ? jFete - 2 : dow === 0 ? jFete - 3 : jFete - 1;
  return [debut, jFete - 1];
}

/**
 * Tous les événements d'une année copte (du 1er Thout au dernier jour de Nasie).
 * Chaque événement : { id, nom, type, debut, fin } (JDN inclus).
 * type : 'fete-majeure' | 'fete' | 'fete-mois' | 'jeune' | 'careme' | 'semaine-sainte' | 'periode'
 */
function evenementsAnneeCopte(an) {
  const c = (m, d) => copteVersJdn(an, m, d);
  const E = paques(an + 284);            // Pâques tombe dans l'année copte qui commence en septembre précédent
  const nat = nativite(an);
  const theo = c(5, 11);                 // 11 Toubah (À VALIDER les années qui suivent une bissextile)
  const ev = [];
  const add = (id, nom, type, debut, fin = debut) => ev.push({ id, nom, type, debut, fin });

  // Fêtes fixes
  add('nayrouz', 'Nayrouz (Nouvel An copte)', 'fete', c(1, 1));
  add('croix-thout', 'Fête de la Croix', 'fete', c(1, 17), c(1, 19));
  add('michel', 'Fête de l’archange Michel', 'fete', c(3, 12));
  add('kiahk', 'Mois de Kiahk', 'periode', c(4, 1), c(4, 30));
  const [p1, p2] = paramoun(nat);
  add('paramoun-nativite', 'Paramoun de la Nativité', 'jeune', p1, p2);
  add('nativite', 'Nativité du Seigneur', 'fete-majeure', nat);
  add('circoncision', 'Circoncision', 'fete', c(5, 6));
  const [t1, t2] = paramoun(theo);
  add('paramoun-theophanie', 'Paramoun de la Théophanie', 'jeune', t1, t2);
  add('theophanie', 'Théophanie (Épiphanie)', 'fete-majeure', theo);
  add('cana', 'Noces de Cana', 'fete', c(5, 13));
  add('presentation', 'Présentation au Temple', 'fete', c(6, 8));
  add('croix-baramhat', 'Fête de la Croix', 'fete', c(7, 10));
  add('annonciation', 'Annonciation', 'fete-majeure', c(7, 29));
  add('egypte', 'Entrée du Christ en Égypte', 'fete', c(9, 24));
  add('fete-apotres', 'Fête des Apôtres', 'fete', c(11, 5));
  add('transfiguration', 'Transfiguration', 'fete', c(12, 13));
  add('assomption', 'Assomption de la Vierge Marie', 'fete', c(12, 16));

  // 29 de chaque mois : Annonciation, Nativité, Résurrection — sauf Kiahk (Nativité),
  // Toubah et Amshir, et sauf pendant le Carême et la Semaine sainte (À VALIDER)
  for (let m = 1; m <= 12; m++) {
    if ([4, 5, 6].includes(m)) continue;
    const j = c(m, 29);
    if (j >= E - 55 && j <= E - 1) continue;
    add('29-' + m, '29 du mois copte', 'fete-mois', j);
  }

  // Fêtes et périodes mobiles (autour de Pâques)
  add('ninive', 'Jeûne de Ninive', 'jeune', E - 69, E - 67);
  add('jonas', 'Pâque de Jonas', 'fete', E - 66);
  add('careme', 'Grand Carême', 'careme', E - 55, E - 9);
  add('lazare', 'Samedi de Lazare', 'careme', E - 8);
  add('rameaux', 'Dimanche des Rameaux', 'careme', E - 7);
  add('semaine-sainte', 'Semaine sainte', 'semaine-sainte', E - 6, E - 1);
  add('jeudi-saint', 'Jeudi saint', 'semaine-sainte', E - 3);
  add('vendredi-saint', 'Vendredi saint', 'semaine-sainte', E - 2);
  add('samedi-saint', 'Samedi saint', 'semaine-sainte', E - 1);
  add('paques', 'Fête de la Résurrection', 'fete-majeure', E);
  add('cinquantaine', 'Les cinquante jours', 'periode', E, E + 49);
  add('thomas', 'Dimanche de Thomas', 'fete', E + 7);
  add('ascension', 'Ascension', 'fete-majeure', E + 39);
  add('pentecote', 'Pentecôte', 'fete-majeure', E + 49);
  add('apotres', 'Jeûne des Apôtres', 'jeune', E + 50, c(11, 4));

  // Jeûnes fixes
  add('vierge', 'Jeûne de la Vierge Marie', 'jeune', c(12, 1), c(12, 15));
  add('nativite-jeune', 'Jeûne de la Nativité', 'jeune', nat - 43, nat - 1);

  return ev.sort((a, b) => a.debut - b.debut);
}

const cache = new Map();
function evenementsAutourDe(j) {
  const an = jdnVersCopte(j).an;
  const out = [];
  for (const a of [an - 1, an, an + 1]) {
    if (!cache.has(a)) cache.set(a, evenementsAnneeCopte(a));
    out.push(...cache.get(a));
  }
  return out;
}

/** Niveau de jeûne par type (À VALIDER) */
const NIVEAUX = {
  careme: 'Jeûne strict : sans produits animaux ni poisson',
  'semaine-sainte': 'Jeûne strict : sans produits animaux ni poisson',
  ninive: 'Jeûne strict : sans produits animaux ni poisson',
  apotres: 'Sans produits animaux, poisson permis',
  'nativite-jeune': 'Sans produits animaux, poisson permis',
  vierge: 'Sans produits animaux, poisson permis',
  paramoun: 'Jeûne strict',
  'mercredi-vendredi': 'Sans produits animaux ni poisson',
};

/**
 * Tout ce qu'il faut savoir d'un jour.
 * @param {number} j JDN
 */
function infoJour(j) {
  const evs = evenementsAutourDe(j).filter((e) => j >= e.debut && j <= e.fin);
  const ids = new Set(evs.map((e) => e.id));
  const dow = jourSemaine(j);
  const fetes = evs.filter((e) => e.type.startsWith('fete') && e.id !== 'cinquantaine');
  const cinquante = ids.has('cinquantaine');
  // Mercredi et vendredi : jeûne toute l'année, sauf les cinquante jours et si Noël ou la Théophanie tombent ce jour-là
  const mercrediVendredi = (dow === 2 || dow === 4) && !cinquante && !ids.has('nativite') && !ids.has('theophanie');
  let periodeJeune = null;
  for (const id of ['semaine-sainte', 'careme', 'lazare', 'rameaux', 'ninive', 'paramoun-nativite', 'paramoun-theophanie', 'nativite-jeune', 'apotres', 'vierge']) {
    if (ids.has(id)) { periodeJeune = evs.find((e) => e.id === id); break; }
  }
  const estFeteMajeure = fetes.some((e) => e.type === 'fete-majeure');
  const jeune = !!periodeJeune && !estFeteMajeure ? true : (mercrediVendredi && !estFeteMajeure);
  const cle = periodeJeune ? (periodeJeune.id.startsWith('paramoun') ? 'paramoun'
    : ['lazare', 'rameaux'].includes(periodeJeune.id) ? 'careme' : periodeJeune.id) : (jeune ? 'mercredi-vendredi' : null);
  return {
    jdn: j,
    greg: jdnVersGreg(j),
    copte: jdnVersCopte(j),
    jourSemaine: JOURS[dow],
    fetes: fetes.map((e) => e.nom),
    fetesIds: fetes.map((e) => e.id),
    periodeJeune: periodeJeune ? periodeJeune.nom : null,
    periodeJeuneId: periodeJeune ? periodeJeune.id : null,
    niveauCle: cle,
    jeune,
    niveau: cle ? NIVEAUX[cle] : null,
    // catégorie utile pour l'affichage (code couleur de l'appli)
    couleur: ids.has('paques') ? 'resurrection'
      : ids.has('semaine-sainte') ? 'semaine-sainte'
      : (ids.has('careme') || ids.has('lazare') || ids.has('rameaux')) ? 'careme'
      : (periodeJeune && !estFeteMajeure) ? 'jeune'
      : mercrediVendredi && !estFeteMajeure ? 'mercredi-vendredi' : null,
    cinquanteJours: cinquante,
    evenements: evs.map((e) => e.id),
  };
}

/** Aide : infos d'une date grégorienne */
const infoDate = (y, m, d) => infoJour(gregVersJdn(y, m, d));

/** Formate « mercredi 11 novembre 2026 » */
function formatGreg(j) {
  const g = jdnVersGreg(j);
  return `${JOURS[jourSemaine(j)]} ${g.d === 1 ? '1er' : g.d} ${MOIS_GREGORIENS[g.m - 1]} ${g.y}`;
}

/** Formate « 2 Hatour 1743 » */
function formatCopte(j) {
  const c = jdnVersCopte(j);
  return `${c.jour} ${c.nomMois} ${c.an}`;
}

// ---------------------------------------------------------------- jour liturgique

const VILLES = {
  paris: { nom: 'Paris', lat: 48.8566, lon: 2.3522, fuseau: 'Europe/Paris' },
  marseille: { nom: 'Marseille', lat: 43.2965, lon: 5.3698, fuseau: 'Europe/Paris' },
  lyon: { nom: 'Lyon', lat: 45.764, lon: 4.8357, fuseau: 'Europe/Paris' },
  lecaire: { nom: 'Le Caire', lat: 30.0444, lon: 31.2357, fuseau: 'Africa/Cairo' },
};

/**
 * Heure du coucher du soleil (algorithme de l'équation du lever et du coucher, précision ~1 à 2 min).
 * @returns {number} instant en millisecondes UTC
 */
function coucherDuSoleil(j, lat, lon) {
  const rad = Math.PI / 180;
  const n = j - 2451545 + 0.0008;
  const Js = n - lon / 360;
  const M = (357.5291 + 0.98560028 * Js) % 360;
  const C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
  const L = (M + C + 180 + 102.9372) % 360;
  const Jt = 2451545 + Js + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
  const dec = Math.asin(Math.sin(L * rad) * Math.sin(23.4397 * rad));
  const cosW = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec));
  const w = Math.acos(Math.max(-1, Math.min(1, cosW))) / rad;
  return (Jt + w / 360 - 2440587.5) * 86400000;
}

/** « 17 h 13 » dans le fuseau de la ville */
function heureLocale(ms, fuseau) {
  const p = new Intl.DateTimeFormat('fr-FR', { timeZone: fuseau, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms));
  const h = p.find((x) => x.type === 'hour').value, m = p.find((x) => x.type === 'minute').value;
  return `${+h} h ${m}`;
}

/**
 * Jour liturgique à un instant donné : après le coucher du soleil, l'Église est déjà
 * dans le jour suivant (la veille).
 * @param {number} j  JDN du jour civil
 * @param {number} ms instant (UTC, en ms)
 */
function jourLiturgique(j, ms, ville = VILLES.paris) {
  const coucher = coucherDuSoleil(j, ville.lat, ville.lon);
  const apres = ms >= coucher;
  return { jdn: apres ? j + 1 : j, veille: apres, coucher, heureCoucher: heureLocale(coucher, ville.fuseau) };
}

// ---------------------------------------------------------------- arabe

const MOIS_COPTES_AR = ['توت', 'بابه', 'هاتور', 'كيهك', 'طوبة', 'أمشير', 'برمهات', 'برمودة', 'بشنس', 'بؤونة', 'أبيب', 'مسرى', 'النسيء'];
const MOIS_GREGORIENS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const JOURS_AR = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];

/** Chiffres arabes orientaux : 1743 -> ١٧٤٣ */
const chiffresAr = (v) => String(v).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

/** Noms arabes des fêtes et périodes, par identifiant d'événement */
const NOMS_AR = {
  nayrouz: 'عيد النيروز (رأس السنة القبطية)', 'croix-thout': 'عيد الصليب', michel: 'عيد رئيس الملائكة ميخائيل',
  kiahk: 'شهر كيهك', 'paramoun-nativite': 'برامون عيد الميلاد', nativite: 'عيد الميلاد المجيد', circoncision: 'عيد الختان',
  'paramoun-theophanie': 'برامون عيد الغطاس', theophanie: 'عيد الغطاس المجيد', cana: 'عرس قانا الجليل',
  presentation: 'دخول المسيح الهيكل', 'croix-baramhat': 'عيد الصليب', annonciation: 'عيد البشارة المجيد',
  egypte: 'دخول المسيح أرض مصر', 'fete-apotres': 'عيد الرسل', transfiguration: 'عيد التجلي',
  assomption: 'عيد صعود جسد السيدة العذراء', ninive: 'صوم يونان', jonas: 'فصح يونان', careme: 'الصوم الكبير',
  lazare: 'سبت لعازر', rameaux: 'أحد الشعانين', 'semaine-sainte': 'أسبوع الآلام', 'jeudi-saint': 'خميس العهد',
  'vendredi-saint': 'الجمعة العظيمة', 'samedi-saint': 'سبت الفرح', paques: 'عيد القيامة المجيد',
  cinquantaine: 'الخماسين المقدسة', thomas: 'أحد توما', ascension: 'عيد الصعود المجيد', pentecote: 'عيد العنصرة',
  apotres: 'صوم الرسل', vierge: 'صوم السيدة العذراء', 'nativite-jeune': 'صوم الميلاد',
};
const nomAr = (id) => NOMS_AR[id] || (id.startsWith('29-') ? 'التذكار الشهري للأعياد السيدية' : id);

const NIVEAUX_AR = {
  careme: 'صوم انقطاعي بدون منتجات حيوانية أو سمك',
  'semaine-sainte': 'صوم انقطاعي بدون منتجات حيوانية أو سمك',
  ninive: 'صوم انقطاعي بدون منتجات حيوانية أو سمك',
  apotres: 'بدون منتجات حيوانية، مسموح بالسمك',
  'nativite-jeune': 'بدون منتجات حيوانية، مسموح بالسمك',
  vierge: 'بدون منتجات حيوانية، مسموح بالسمك',
  paramoun: 'صوم انقطاعي',
  'mercredi-vendredi': 'بدون منتجات حيوانية أو سمك',
};

function formatGregAr(j) {
  const g = jdnVersGreg(j);
  return `${JOURS_AR[jourSemaine(j)]} ${chiffresAr(g.d)} ${MOIS_GREGORIENS_AR[g.m - 1]} ${chiffresAr(g.y)}`;
}
function formatCopteAr(j) {
  const c = jdnVersCopte(j);
  return `${chiffresAr(c.jour)} ${MOIS_COPTES_AR[c.mois - 1]} ${chiffresAr(c.an)}`;
}

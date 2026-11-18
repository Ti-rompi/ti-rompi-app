"""Récupère les dernières vidéos YouTube du diocèse et des paroisses -> data/actus.json
Lancé par GitHub Actions (voir .github/workflows/actus.yml). Bibliothèque standard uniquement."""
import json, re, urllib.request, xml.etree.ElementTree as ET, datetime, os, sys
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCES = json.load(open(os.path.join(RACINE, 'actus', 'sources.json'), encoding='utf-8'))
UA = {'User-Agent': 'Mozilla/5.0 (Ti rompi; +https://ti-rompi.github.io)', 'Accept-Language': 'fr'}
NS = {'a': 'http://www.w3.org/2005/Atom', 'yt': 'http://www.youtube.com/xml/schemas/2015', 'media': 'http://search.yahoo.com/mrss/'}

def lire(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r: return r.read()

def identifiant(src):
    """Retrouve l'identifiant UC… de la chaîne à partir de son @nom (repli : identifiant connu)."""
    try:
        html = lire('https://www.youtube.com/' + src['handle']).decode('utf-8', 'ignore')
        m = re.search(r'<link rel="canonical" href="https://www\.youtube\.com/channel/(UC[\w-]{22})"', html) or re.search(r'"externalId":"(UC[\w-]{22})"', html)
        if m: return m.group(1)
    except Exception as e: print('identifiant', src['handle'], e, file=sys.stderr)
    return src.get('id')

sortie = {'maj': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'), 'chaines': {}}
for cle, src in SOURCES.items():
    cid = identifiant(src)
    try:
        racine = ET.fromstring(lire('https://www.youtube.com/feeds/videos.xml?channel_id=' + cid))
        videos = []
        for e in racine.findall('a:entry', NS)[:15]:
            videos.append({'id': e.find('yt:videoId', NS).text, 'titre': e.find('a:title', NS).text,
                           'date': e.find('a:published', NS).text})
        sortie['chaines'][cle] = {'nom': racine.find('a:title', NS).text, 'handle': src['handle'], 'id': cid, 'videos': videos}
        print(cle, cid, len(videos), 'vidéos')
    except Exception as e:
        print('flux', cle, cid, e, file=sys.stderr)
        # garder l'ancienne liste plutôt que de tout effacer
        try: sortie['chaines'][cle] = json.load(open(os.path.join(RACINE, 'data', 'actus.json'), encoding='utf-8'))['chaines'][cle]
        except Exception: pass
json.dump(sortie, open(os.path.join(RACINE, 'data', 'actus.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# ---------------------------------------------------------------------------
# Vidéos des saints patrons : pour chaque paroisse ayant une chaîne, on cherche
# dans sa chaîne les vidéos dont le titre cite le saint, et on garde les 3 plus récentes.
import unicodedata, time
SAINTS = json.load(open(os.path.join(RACINE, 'actus', 'saints.json'), encoding='utf-8'))
FICH_SV = os.path.join(RACINE, 'data', 'saints-videos.json')
def sans_accents(s): return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')
UNITES = {'second': 1, 'minute': 60, 'hour': 3600, 'day': 86400, 'week': 604800, 'month': 2629800, 'year': 31557600}
def date_video(titre, relatif):
    m = re.search(r'(\d{1,2})[/.-](\d{1,2})[/.-](20\d\d)', titre)
    if m:
        try: return datetime.datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)), 12, tzinfo=datetime.timezone.utc).isoformat()
        except ValueError: pass
    m = re.search(r'(\d+)\s+(second|minute|hour|day|week|month|year)', relatif or '')
    if m: return datetime.datetime.fromtimestamp(time.time() - int(m.group(1)) * UNITES[m.group(2)], datetime.timezone.utc).isoformat()
    return None
def chercher(handle, mot):
    url = 'https://www.youtube.com/' + handle + '/search?hl=en&query=' + urllib.request.quote(mot)
    html = lire(url).decode('utf-8', 'ignore')
    m = re.search(r'var ytInitialData = (\{.*?\});</script>', html)
    if not m: return []
    out = []
    def parcourir(o):
        if isinstance(o, dict):
            v = o.get('videoRenderer')
            if v and v.get('videoId'):
                titre = ''.join(r.get('text', '') for r in v.get('title', {}).get('runs', []))
                rel = (v.get('publishedTimeText') or {}).get('simpleText', '')
                out.append({'id': v['videoId'], 'titre': titre, 'date': date_video(titre, rel)})
            for x in o.values(): parcourir(x)
        elif isinstance(o, list):
            for x in o: parcourir(x)
    parcourir(json.loads(m.group(1)))
    return out
try: ancien = json.load(open(FICH_SV, encoding='utf-8'))
except Exception: ancien = {'maj': '', 'paroisses': {}}
age = time.time() - (datetime.datetime.fromisoformat(ancien['maj']).timestamp() if ancien.get('maj') else 0)
if age > 12 * 3600 or os.environ.get('FORCER_SAINTS'):
    nouveau = {'maj': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'), 'paroisses': {}}
    for cle, src in SOURCES.items():
        if not cle.startswith('p') or not src.get('saints'): continue
        res = {}
        for sk in src['saints']:
            mots = SAINTS.get(sk, {}).get('mots', [])
            vus, trouves = set(), []
            for v in src.get('manuel', {}).get(sk, []): vus.add(v['id']); trouves.append(v)
            for mot in mots[:2]:
                try:
                    for v in chercher(src['handle'], mot):
                        t = re.sub(r'(e|é)glise[^-|/:(]*', ' ', sans_accents(v['titre']))
                        if re.search(r'mariage|bapteme|funerailles|fiancailles', t): continue
                        if v['id'] in vus or not any(sans_accents(w) in t for w in mots): continue
                        vus.add(v['id']); trouves.append(v)
                except Exception as e: print('saint', cle, sk, mot, e, file=sys.stderr)
            trouves.sort(key=lambda v: v.get('date') or '', reverse=True)
            if trouves: res[sk] = trouves[:3]
            elif ancien.get('paroisses', {}).get(cle, {}).get(sk): res[sk] = ancien['paroisses'][cle][sk]
            print(cle, sk, len(trouves), 'vidéos')
        nouveau['paroisses'][cle] = res
    if nouveau['paroisses'] != ancien.get('paroisses'):
        json.dump(nouveau, open(FICH_SV, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

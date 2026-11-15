"""Récupère les dernières vidéos YouTube du diocèse et des paroisses -> data/actus.json
Lancé par GitHub Actions (voir .github/workflows/actus.yml). Bibliothèque standard uniquement."""
import json, re, urllib.request, xml.etree.ElementTree as ET, datetime, os, sys
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCES = json.load(open(os.path.join(RACINE, 'actus', 'sources.json'), encoding='utf-8'))
UA = {'User-Agent': 'Mozilla/5.0 (Ti rompi; +https://github.com/jessicasidhom06-cyber/ti-rompi-app)', 'Accept-Language': 'fr'}
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

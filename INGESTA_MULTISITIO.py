#!/usr/bin/env python3
"""
INGESTA_MULTISITIO.py
=====================
Ingesta manual de artículos para los 60 sitios en los 4 CMS.

Uso:
  python3 INGESTA_MULTISITIO.py [--fb-only] [--ingest-only]

El flujo completo hace:
  1. Scraping de artículos RSS vía /cron/scrape de cada CMS
  2. Espera a que se publiquen los artículos
  3. Publicación a Facebook con 10 min de gap por sitio
"""

import requests
import time
import json
import sys
from datetime import datetime

# ============================================================
# CONFIGURACIÓN — CMS y Sites
# ============================================================

CMS_WORKERS = {
    'cms-originaux': {
        'url': 'https://news-api.sebastianvernis.workers.dev/api',
        'sites': [
            'bitacoraurbana', 'cbnnoticias', 'centralmexico', 'mexicoinformado',
            'nodoinformativo', 'noticiasobjetivo', 'radiocinconoticias', 'reportecentralmx',
            'tvmexico', 'verticenoticias'
        ]
    },
    'cms-nuevos': {
        'url': 'https://cms-nuevos.sebastianvernis.workers.dev/api',
        'sites': [
            'boominformativo', 'capitalpress', 'diarioexpress', 'elpulsomexicano',
            'enfoquecapital', 'enfoquedirecto', 'formulacdmx', 'mexicantimes',
            'mexico360noticias', 'mradio', 'noticiashorizonte', 'pulsodiario',
            'puntoclave', 'puntonoticias', 'radarinformativo', 'reportediario', 'televisionabc'
        ]
    },
    'cms-nuevos2': {
        'url': 'https://cms-nuevos2.sebastianvernis.workers.dev/api',
        'sites': [
            'centronews', 'noticias123', 'breakingcentermexico', 'alavistanoticias',
            'socialmexiconews', 'tmznews', 'radioabc', 'noticiasintegra'
        ]
    },
    'cms-nuevos3': {
        'url': 'https://cms-nuevos3.sebastianvernis.workers.dev/api',
        'sites': [
            'enfoquemexicano', 'adnmexicano', 'pulsorepublicanonoticias', 'mexicannewsoftheworld',
            'expresomexicano', 'mexicodaily', 'aztecamexiconoticias', 'elanalisismexicano',
            'nacionalinstante', 'mexicoandtheworld', 'diariomexicano', 'politicasalvajealminuto',
            'elobservadorrepublicano', 'mexicoplus', 'actualidadsinfronteras', 'noticiasalinstante',
            'republicamx', 'diariomexico', 'financemarketsmx', 'monitorrepublicano',
            'elprofetamexicano', 'mexicoenresumen', 'radioredmx', 'perspectivamexicana', 'wenewsmexico'
        ]
    }
}

# RSS feeds a scrapear (artículos recientes de fuentes Mexicanas)
RSS_SOURCES = [
    # Jornada
    'https://www.jornada.com.mx/rss/edicion.xml?v=1',
    # El Informador
    'https://www.informador.mx/rss',
    # Proceso
    'https://www.proceso.com.mx/rss/feed.html?r=2',
    # Expansión
    'https://expansion.mx/rss',
    # El País México
    'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/mexico/portada',
    # Reforma
    'https://www.reforma.com/rss/portada.xml',
    # La Política Online
    'https://www.lapoliticaonline.com/files/rss/ultimasnoticias-mx.xml',
    # France24
    'https://www.france24.com/es/rss',
    # El Economista
    'https://www.eleconomista.com.mx/rss/ultimas-noticias',
]

# Token admin (del publish_facebook.py)
ADMIN_TOKEN = "17f616e5c86c4988d2f6a6955ba9a98bc3c7ddda4c3557286ba3b80f8aa76291"
FB_TOKEN = "17f616e5c86c4988d2f6a6955ba9a98bc3c7ddda4c3557286ba3b80f8aa76291"

# ============================================================
# FUNCIONES DE UTILIDAD
# ============================================================

def get_headers():
    return {"Authorization": f"Bearer {ADMIN_TOKEN}"}


def fetch_rss_urls(feed_url, max_articles=6):
    """Obtiene las URLs de artículos recientes de un feed RSS"""
    try:
        resp = requests.get(feed_url, timeout=15, headers={'User-Agent': 'Mozilla/5.0'})
        if resp.status_code != 200:
            return []

        xml = resp.text
        urls = []

        # Parse RSS items
        import re
        items = re.findall(r'<(?:item|entry)>([\s\S]*?)</(?:item|entry)>', xml, re.IGNORECASE)

        for item in items[:max_articles]:
            link_match = re.search(r'<link[^>]+href=["\']([^"\']+)["\']', item)
            if not link_match:
                link_match = re.search(r'<link>([\s\S]*?)</link>', item)
            if link_match:
                url = link_match.group(1).strip()
                if url.startswith('http'):
                    urls.append(url)

        return urls
    except Exception as e:
        print(f"  ⚠️ Error fetching {feed_url}: {e}")
        return []


def scrape_article(cms_url, article_url):
    """Hace scrape de un artículo vía el endpoint /cron/scrape del CMS"""
    try:
        resp = requests.post(
            f"{cms_url}/cron/scrape",
            headers=get_headers(),
            json={"urls": [article_url]},
            timeout=60
        )
        if resp.status_code == 200:
            return resp.json()
        else:
            return {"success": False, "error": f"HTTP {resp.status_code}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def publish_to_facebook(cms_url, site_slug):
    """Publica un artículo a Facebook para un sitio"""
    try:
        resp = requests.post(
            f"{cms_url}/facebook/force-publish/{site_slug}",
            headers={"Authorization": f"Bearer {FB_TOKEN}"},
            timeout=30
        )
        return resp.json()
    except Exception as e:
        return {"success": False, "error": str(e)}


def check_articles(cms_url, site_slug, min_articles=1):
    """Verifica que haya artículos pendientes con imagen válida"""
    try:
        resp = requests.get(
            f"{cms_url}/articles?site={site_slug}&limit=5",
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            articles = data.get('articles', [])
            # Filtrar los que tienen imagen válida
            valid = [a for a in articles if a.get('imageUrl') and not a['imageUrl'].endswith('logo.png')]
            return len(valid)
        return 0
    except:
        return 0


# ============================================================
# INGESTA DE ARTÍCULOS
# ============================================================

def ingest_articles():
    """Hace scraping de artículos RSS y los inserta en los CMS"""
    print("\n" + "="*70)
    print("FASE 1: INGESTA DE ARTÍCULOS DESDE RSS")
    print("="*70)

    total_urls = 0
    total_success = 0

    for cms_name, cms_data in CMS_WORKERS.items():
        print(f"\n📡 Procesando {cms_name} ({len(cms_data['sites'])} sitios)...")
        print(f"   API: {cms_data['url']}")

        cms_success = 0
        for feed_url in RSS_SOURCES:
            print(f"\n   📰 Feed: {feed_url[:60]}...")

            urls = fetch_rss_urls(feed_url, max_articles=3)
            if not urls:
                print(f"      ⚠️ No se pudieron extraer URLs")
                continue

            print(f"      → {len(urls)} URLs encontradas")

            for article_url in urls[:2]:  # Solo 2 por feed para no saturar
                print(f"         🔄 Scrape: {article_url[:70]}...")
                result = scrape_article(cms_data['url'], article_url)

                if result.get('success'):
                    successful = result.get('successful', 0)
                    cms_success += successful
                    total_success += successful
                    total_urls += 1
                    print(f"         ✅ {successful} artículo(s)插入ado(s)")
                else:
                    error = result.get('error', 'Unknown error')
                    print(f"         ⚠️ Error: {error}")

                time.sleep(2)  # Delay entre scrapes

        print(f"\n   📊 {cms_name}: {cms_success} artículos insertados")

    print(f"\n{'='*70}")
    print(f"📊 RESUMEN DE INGESTA: {total_success} artículos en {total_urls} requests")
    print(f"{'='*70}")

    return total_success


# ============================================================
# PUBLICACIÓN A FACEBOOK
# ============================================================

def publish_facebook():
    """Publica artículos a Facebook para todos los sitios con 10 min de gap"""
    print("\n" + "="*70)
    print("FASE 2: PUBLICACIÓN A FACEBOOK")
    print("="*70)
    print("⏱️  10 minutos entre cada sitio...")
    print()

    all_sites = []
    for cms_name, cms_data in CMS_WORKERS.items():
        for site in cms_data['sites']:
            all_sites.append({
                'cms': cms_name,
                'url': cms_data['url'],
                'site': site
            })

    total_fb = 0
    total_errors = 0
    start_time = datetime.now()

    for i, site_info in enumerate(all_sites):
        site = site_info['site']
        cms_url = site_info['url']
        cms_name = site_info['cms']

        elapsed = (datetime.now() - start_time).total_seconds()
        print(f"[{elapsed/60:.1f} min] 📤 {site} ({cms_name})")

        # Verificar que haya artículos
        pending = check_articles(cms_url, site)
        if pending == 0:
            print(f"   ⚠️ No hay artículos pendientes con imagen válida")
        else:
            print(f"   📋 {pending} artículos pendientes")

        # Publicar a Facebook
        result = publish_to_facebook(cms_url, site)

        if result.get('success'):
            post_id = result.get('fb_post_id', 'N/A')
            if len(str(post_id)) > 20:
                post_id = str(post_id)[:20] + '...'
            print(f"   ✅ FB: {post_id}")
            total_fb += 1
        else:
            error = result.get('error', 'Unknown')
            print(f"   ⚠️ FB: {error}")
            total_errors += 1

        # 10 minutos entre cada sitio
        if i < len(all_sites) - 1:
            print(f"   ⏳ Esperando 10 minutos...")
            time.sleep(600)  # 10 minutos

    print(f"\n{'='*70}")
    print(f"📊 RESUMEN FB: {total_fb} publicados, {total_errors} errores de {len(all_sites)} sitios")
    print(f"{'='*70}")

    return total_fb


# ============================================================
# MAIN
# ============================================================

def main():
    print("="*70)
    print("🚀 INGESTA MULTISITIO — 60 SITIOS EN 4 CMS")
    print("="*70)
    print(f"   Hora de inicio: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    mode = sys.argv[1] if len(sys.argv) > 1 else 'full'

    if mode == '--fb-only':
        publish_facebook()
    elif mode == '--ingest-only':
        ingest_articles()
    else:
        # Full mode: ingest + Facebook
        ingest_articles()

        print("\n\n⏳ Pause de 2 minutos para que los artículos se procesen...")
        time.sleep(120)

        publish_facebook()

    print(f"\n✅ PROCESO COMPLETADO — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()
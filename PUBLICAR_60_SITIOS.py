#!/usr/bin/env python3
"""
PUBLICAR_60_SITIOS.py
=====================
Publica un artículo a Facebook por sitio, con 10 min de gap.
Artículos deben tener imagen válida (no logo.png/fallback).

Uso: python3 PUBLICAR_60_SITIOS.py [--site-limit N]
"""
import requests, time, sys
from datetime import datetime

TOKEN = "17f616e5c86c4988d2f6a6955ba9a98bc3c7ddda4c3557286ba3b80f8aa76291"

# CMS con token FB válido
CMS_WORKERS = {
    'cms-originaux': 'https://news-api.sebastianvernis.workers.dev/api',
    'cms-nuevos':    'https://cms-nuevos.sebastianvernis.workers.dev/api',
    'cms-nuevos2':   'https://cms-nuevos2.sebastianvernis.workers.dev/api',
    'cms-nuevos3':   'https://cms-nuevos3.sebastianvernis.workers.dev/api',
}

# Total: 60 sitios (10 + 17 + 8 + 25)
SITES_BY_CMS = {
    'cms-originaux': [
        'bitacoraurbana', 'cbnnoticias', 'centralmexico', 'mexicoinformado',
        'nodoinformativo', 'noticiasobjetivo', 'radiocinconoticias',
        'reportecentralmx', 'tvmexico', 'verticenoticias'
    ],
    'cms-nuevos': [
        'boominformativo', 'capitalpress', 'diarioexpress', 'elpulsomexicano',
        'enfoquecapital', 'enfoquedirecto', 'formulacdmx', 'mexicantimes',
        'mexico360noticias', 'mradio', 'noticiashorizonte', 'pulsodiario',
        'puntoclave', 'puntonoticias', 'radarinformativo', 'reportediario', 'televisionabc'
    ],
    'cms-nuevos2': [
        'centronews', 'noticias123', 'breakingcentermexico', 'alavistanoticias',
        'socialmexiconews', 'tmznews', 'radioabc', 'noticiasintegra'
    ],
    'cms-nuevos3': [
        'enfoquemexicano', 'adnmexicano', 'pulsorepublicanonoticias', 'mexicannewsoftheworld',
        'expresomexicano', 'mexicodaily', 'aztecamexiconoticias', 'elanalisismexicano',
        'nacionalinstante', 'mexicoandtheworld', 'diariomexicano', 'politicasalvajealminuto',
        'elobservadorrepublicano', 'mexicoplus', 'actualidadsinfronteras', 'noticiasalinstante',
        'republicamx', 'diariomexico', 'financemarketsmx', 'monitorrepublicano',
        'elprofetamexicano', 'mexicoenresumen', 'radioredmx', 'perspectivamexicana', 'wenewsmexico'
    ],
}


def has_valid_image(cms_url, site):
    """Verifica que el sitio tenga al menos 1 artículo con imagen válida"""
    try:
        r = requests.get(f"{cms_url}/articles?site={site}&limit=3",
                        headers={"Authorization": f"Bearer {TOKEN}"}, timeout=15)
        if r.status_code != 200:
            return False, "API error"
        data = r.json()
        for a in data.get('articles', []):
            img = a.get('imageUrl', '') or ''
            if img and 'logo' not in img.lower() and 'fallback' not in img.lower():
                return True, img[:60]
        return False, "No valid image"
    except Exception as e:
        return False, str(e)[:30]


def publish(cms_url, site):
    """Publica un artículo a Facebook para el sitio"""
    try:
        r = requests.post(
            f"{cms_url}/facebook/force-publish/{site}",
            headers={"Authorization": f"Bearer {TOKEN}"},
            timeout=60
        )
        return r.json()
    except Exception as e:
        return {"success": False, "error": str(e)[:50]}


def main():
    print("="*70)
    print("🚀 PUBLICACIÓN FACEBOOK — 60 SITIOS (cms-originaux/cms-nuevos/cms-nuevos2/cms-nuevos3)")
    print(f"   Inicio: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70)

    # Verificar/articles con imagen primero
    print("\n📋 Verificando artículos con imagen válida...\n")

    all_sites = []
    for cms_name in ['cms-originaux', 'cms-nuevos', 'cms-nuevos2', 'cms-nuevos3']:
        cms_url = CMS_WORKERS[cms_name]
        for site in SITES_BY_CMS[cms_name]:
            valid, detail = has_valid_image(cms_url, site)
            all_sites.append({
                'cms': cms_name,
                'url': cms_url,
                'site': site,
                'valid': valid,
                'detail': detail
            })
            status = "✅" if valid else "⚠️"
            print(f"  {status} {cms_name:12} {site:25} {detail[:40]}")

    sites_with_img = [s for s in all_sites if s['valid']]
    sites_without_img = [s for s in all_sites if not s['valid']]
    print(f"\n📊 Resumen: {len(sites_with_img)} con imagen válida, {len(sites_without_img)} sin imagen")

    # Publicar
    print("\n" + "="*70)
    print("📤 PUBLICANDO A FACEBOOK (10 min gap por sitio)")
    print("="*70)

    total_ok = 0
    total_err = 0
    start_time = datetime.now()

    site_limit = int(sys.argv[1]) if len(sys.argv) > 1 else 999

    for i, site_info in enumerate(sites_with_img[:site_limit]):
        site = site_info['site']
        cms_url = site_info['url']
        cms_name = site_info['cms']
        elapsed = (datetime.now() - start_time).total_seconds() / 60

        print(f"\n[{elapsed:.1f} min] 📤 {cms_name}/{site}")

        result = publish(cms_url, site)

        if result.get('success'):
            fb_id = str(result.get('fb_post_id', ''))[:25]
            print(f"   ✅ FB: {fb_id}")
            total_ok += 1
        else:
            err = result.get('error', 'Unknown error')[:60]
            print(f"   ❌ Error: {err}")
            total_err += 1

        # 10 min gap entre sitios (excepto el último)
        if i < len(sites_with_img) - 1 and i < site_limit - 1:
            print(f"   ⏳ Esperando 10 minutos...")
            time.sleep(600)

    elapsed_total = (datetime.now() - start_time).total_seconds() / 60
    print(f"\n{'='*70}")
    print(f"📊 RESULTADO FINAL:")
    print(f"   Publicados: {total_ok}")
    print(f"   Errores:    {total_err}")
    print(f"   Tiempo:     {elapsed_total:.1f} min")
    if sites_without_img:
        print(f"   ⚠️  Sitios sin imagen ({len(sites_without_img)}):")
        for s in sites_without_img[:5]:
            print(f"       - {s['cms']}/{s['site']}: {s['detail']}")
    print(f"{'='*70}")
    print(f"✅ COMPLETADO: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()
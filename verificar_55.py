#!/usr/bin/env python3
"""Verifica imagen y fb_published de los 55 sitios."""
import requests

TOKEN = "17f616e5c86c4988d2f6a6955ba9a98bc3c7ddda4c3557286ba3b80f8aa76291"

CMS = {
    'cms-originaux': 'https://news-api.sebastianvernis.workers.dev/api',
    'cms-nuevos':    'https://cms-nuevos.sebastianvernis.workers.dev/api',
    'cms-nuevos2':   'https://cms-nuevos2.sebastianvernis.workers.dev/api',
    'cms-nuevos3':   'https://cms-nuevos3.sebastianvernis.workers.dev/api',
}

SITES_55 = {
    'cms-originaux': ['bitacoraurbana','cbnnoticias','centralmexico','mexicoinformado','nodoinformativo','noticiasobjetivo','radiocinconoticias','reportecentralmx','tvmexico','verticenoticias'],
    'cms-nuevos':    ['boominformativo','capitalpress','diarioexpress','elpulsomexicano','enfoquecapital','enfoquedirecto','formulacdmx','mexicantimes','mexico360noticias','mradio','noticiashorizonte','pulsodiario','puntoclave','puntonoticias','radarinformativo','reportediario','televisionabc'],
    'cms-nuevos2':   ['centronews','noticias123','breakingcentermexico','alavistanoticias','socialmexiconews','tmznews','radioabc','noticiasintegra'],
    'cms-nuevos3':   ['enfoquemexicano','adnmexicano','pulsorepublicanonoticias','mexicannewsoftheworld','expresomexicano','mexicodaily','aztecamexiconoticias','elanalisismexicano','nacionalinstante','mexicoandtheworld','diariomexicano','politicasalvajealminuto','elobservadorrepublicano','mexicoplus','actualidadsinfronteras','noticiasalinstante','republicamx','diariomexico','financemarketsmx','monitorrepublicano','elprofetamexicano','mexicoenresumen','radioredmx','perspectivamexicana','wenewsmexico'],
}

print("Verificando 55 sitios...\n")
print(f"{'CMS':<15} {'SITIO':<28} {'ARTICULOS':<5} {'IMG':<5} {'FB_OK':<5}")
print("-" * 60)

needs_ingest = []
needs_fb = []
all_good = []

for cms_name, cms_url in CMS.items():
    for site in SITES_55[cms_name]:
        try:
            r = requests.get(f"{cms_url}/articles?site={site}&limit=3",
                           headers={"Authorization": f"Bearer {TOKEN}"}, timeout=20)
            if r.status_code != 200:
                print(f"{cms_name:<15} {site:<28} ERROR {r.status_code}")
                continue
            data = r.json()
            articles = data.get('articles', [])
            if not articles:
                print(f"{cms_name:<15} {site:<28} 0 articles")
                needs_ingest.append((cms_name, site, cms_url))
                continue

            # Check first 3 articles
            has_img = False
            fb_ok = False
            for a in articles:
                img = a.get('imageUrl') or ''
                if img and 'logo' not in img.lower() and 'fallback' not in img.lower():
                    has_img = True
                if a.get('fb_published'):
                    fb_ok = True

            if not has_img:
                print(f"{cms_name:<15} {site:<28} {len(articles):<5} SIN IMG")
                needs_ingest.append((cms_name, site, cms_url))
            elif not fb_ok:
                print(f"{cms_name:<15} {site:<28} {len(articles):<5} OK     SIN FB")
                needs_fb.append((cms_name, site, cms_url))
            else:
                print(f"{cms_name:<15} {site:<28} {len(articles):<5} OK     OK")
                all_good.append((cms_name, site, cms_url))
        except Exception as e:
            print(f"{cms_name:<15} {site:<28} ERR: {str(e)[:30]}")

print(f"\n=== RESULTADO ===")
print(f"✅ Completos (img + fb): {len(all_good)}")
print(f"⚠️  Sin imagen (necesitan ingesta): {len(needs_ingest)}")
print(f"⚠️  Sin publicar FB: {len(needs_fb)}")
if needs_ingest:
    print(f"\n--- Sin imagen ({len(needs_ingest)}) ---")
    for cms, site, url in needs_ingest:
        print(f"  {cms}/{site}")
if needs_fb:
    print(f"\n--- Sin publicar FB ({len(needs_fb)}) ---")
    for cms, site, url in needs_fb:
        print(f"  {cms}/{site}")

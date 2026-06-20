#!/usr/bin/env python3
"""
PUBLICAR_55_GAP.py
==================
Publica a Facebook los 55 sitios que funcionan, con 10 min de gap.
"""
import requests, time
from datetime import datetime

TOKEN = "17f616e5c86c4988d2f6a6955ba9a98bc3c7ddda4c3557286ba3b80f8aa76291"
NO_PROXY = {'https': '', 'http': ''}

CMS = {
    'cms-originaux': 'https://news-api.sebastianvernis.workers.dev/api',
    'cms-nuevos':    'https://cms-nuevos.sebastianvernis.workers.dev/api',
    'cms-nuevos2':   'https://cms-nuevos2.sebastianvernis.workers.dev/api',
    'cms-nuevos3':   'https://cms-nuevos3.sebastianvernis.workers.dev/api',
}

# 55 sitios que funcionan (excluye enfoquedirecto, noticiashorizonte, tmznews, financemarketsmx, radioredmx)
SITES = {
    'cms-originaux': ['bitacoraurbana','cbnnoticias','centralmexico','mexicoinformado','nodoinformativo','noticiasobjetivo','radiocinconoticias','reportecentralmx','tvmexico','verticenoticias'],
    'cms-nuevos':    ['boominformativo','capitalpress','diarioexpress','elpulsomexicano','enfoquecapital','formulacdmx','mexicantimes','mexico360noticias','mradio','pulsodiario','puntoclave','puntonoticias','radarinformativo','reportediario','televisionabc'],
    'cms-nuevos2':   ['centronews','noticias123','breakingcentermexico','alavistanoticias','socialmexiconews','radioabc','noticiasintegra'],
    'cms-nuevos3':   ['enfoquemexicano','adnmexicano','pulsorepublicanonoticias','mexicannewsoftheworld','expresomexicano','mexicodaily','aztecamexiconoticias','elanalisismexicano','nacionalinstante','mexicoandtheworld','diariomexicano','politicasalvajealminuto','elobservadorrepublicano','mexicoplus','actualidadsinfronteras','noticiasalinstante','republicamx','diariomexico','monitorrepublicano','elprofetamexicano','mexicoenresumen','perspectivamexicana','wenewsmexico'],
}


def publish(cms_url, site):
    try:
        r = requests.post(
            f"{cms_url}/facebook/force-publish/{site}",
            headers={"Authorization": f"Bearer {TOKEN}"},
            timeout=30,
            proxies=NO_PROXY
        )
        return r.json()
    except Exception as e:
        return {"success": False, "error": str(e)[:50]}


def main():
    print("="*70)
    print("🚀 PUBLICACIÓN FACEBOOK — 55 SITIOS (gap 10 min)")
    print(f"   Inicio: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70)

    ok = fail = 0
    start = datetime.now()
    all_sites = []
    for cms, sites in SITES.items():
        for site in sites:
            all_sites.append((cms, CMS[cms], site))

    for i, (cms_name, cms_url, site) in enumerate(all_sites):
        elapsed = (datetime.now() - start).total_seconds() / 60
        print(f"\n[{elapsed:.1f} min] 📤 {cms_name}/{site}")

        result = publish(cms_url, site)

        if result.get('success'):
            fb_id = str(result.get('fb_post_id', ''))[:25]
            print(f"   ✅ {fb_id}")
            ok += 1
        else:
            err = result.get('error', '?')[:60]
            print(f"   ❌ {err}")
            fail += 1

        # 10 min gap (except last)
        if i < len(all_sites) - 1:
            print(f"   ⏳ Esperando 10 min...")
            time.sleep(600)

    elapsed_total = (datetime.now() - start).total_seconds() / 60
    print(f"\n{'='*70}")
    print(f"📊 RESULTADO: {ok} OK, {fail} FAIL ({len(all_sites)} total)")
    print(f"   Tiempo total: {elapsed_total:.0f} min")
    print(f"{'='*70}")


if __name__ == "__main__":
    main()

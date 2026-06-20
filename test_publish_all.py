#!/usr/bin/env python3
"""Quick test: publish to all 60 sites and report"""
import requests

TOKEN = "17f616e5c86c4988d2f6a6955ba9a98bc3c7ddda4c3557286ba3b80f8aa76291"

CMS = {
    'cms-originaux': 'https://news-api.sebastianvernis.workers.dev/api',
    'cms-nuevos':    'https://cms-nuevos.sebastianvernis.workers.dev/api',
    'cms-nuevos2':   'https://cms-nuevos2.sebastianvernis.workers.dev/api',
    'cms-nuevos3':   'https://cms-nuevos3.sebastianvernis.workers.dev/api',
}

SITES = {
    'cms-originaux': ['bitacoraurbana','cbnnoticias','centralmexico','mexicoinformado','nodoinformativo','noticiasobjetivo','radiocinconoticias','reportecentralmx','tvmexico','verticenoticias'],
    'cms-nuevos':    ['boominformativo','capitalpress','diarioexpress','elpulsomexicano','enfoquecapital','enfoquedirecto','formulacdmx','mexicantimes','mexico360noticias','mradio','noticiashorizonte','pulsodiario','puntoclave','puntonoticias','radarinformativo','reportediario','televisionabc'],
    'cms-nuevos2':   ['centronews','noticias123','breakingcentermexico','alavistanoticias','socialmexiconews','tmznews','radioabc','noticiasintegra'],
    'cms-nuevos3':   ['enfoquemexicano','adnmexicano','pulsorepublicanonoticias','mexicannewsoftheworld','expresomexicano','mexicodaily','aztecamexiconoticias','elanalisismexicano','nacionalinstante','mexicoandtheworld','diariomexicano','politicasalvajealminuto','elobservadorrepublicano','mexicoplus','actualidadsinfronteras','noticiasalinstante','republicamx','diariomexico','financemarketsmx','monitorrepublicano','elprofetamexicano','mexicoenresumen','radioredmx','perspectivamexicana','wenewsmexico'],
}

ok = fail = err = 0
fail_details = []

for cms_name, cms_url in CMS.items():
    for site in SITES[cms_name]:
        try:
            r = requests.post(f"{cms_url}/facebook/force-publish/{site}",
                              headers={"Authorization": f"Bearer {TOKEN}"}, timeout=30)
            d = r.json()
            if d.get('success'):
                ok += 1
                print(f"✅ {cms_name}/{site}")
            else:
                fail += 1
                msg = d.get('error', '?')[:60]
                print(f"❌ {cms_name}/{site}: {msg}")
                fail_details.append(f"  {cms_name}/{site}: {msg}")
        except Exception as e:
            err += 1
            print(f"⚠️  {cms_name}/{site}: ERR {str(e)[:30]}")

print(f"\n=== RESULTADO: {ok} OK, {fail} FAIL, {err} ERR ===")
if fail_details:
    print("\n--- Detalle de fallos ---")
    for f in fail_details:
        print(f)
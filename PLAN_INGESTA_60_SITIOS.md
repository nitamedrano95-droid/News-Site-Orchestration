# PLAN DE INGESTA Y PUBLICACIÓN — 60 SITIOS

## Estado Actual

### CMS y sus problemas:
| CMS | FB Token | Artículos con img | Status |
|-----|----------|-------------------|--------|
| news-api (originaux) | ❌ Expirado | ✅ Sí | No se puede publicar |
| cms-nuevos | ✅ OK | ✅ Sí | Listo |
| cms-nuevos2 | ❓ No testado | ✅ Sí | Por testear |
| cms-nuevos3 | ✅ Parcial | ✅ Sí | Enfoquemexicano/Adnmexicano OK |

### Fuentes RSS funcionales:
- ✅ La Jornada (jornada.com.mx) — tiene imágenes
- ❌ Informador.mx — no responde
- ❌ Proceso — no responde
- ✅ France24 — responde pero falla extracción

---

## PASO 1: Publicar a Facebook (10 min gap por sitio)

### Script de publicación:

```python
#!/usr/bin/env python3
"""PUBLICAR_FACEBOOK.py - Publica artículos a FB sitio por sitio"""
import requests, time

TOKEN = "17f616e5c86c4988d2f6a6955ba9a98bc3c7ddda4c3557286ba3b80f8aa76291"

CMS_WORKERS = {
    'cms-nuevos': 'https://cms-nuevos.sebastianvernis.workers.dev/api',
    'cms-nuevos2': 'https://cms-nuevos2.sebastianvernis.workers.dev/api',
    'cms-nuevos3': 'https://cms-nuevos3.sebastianvernis.workers.dev/api',
}

SITES_BY_CMS = {
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
    ]
}

def publish(cms_url, site):
    r = requests.post(f"{cms_url}/facebook/force-publish/{site}",
                      headers={"Authorization": f"Bearer {TOKEN}"}, timeout=30)
    return r.json()

total = 0
for cms_name, cms_url in CMS_WORKERS.items():
    for site in SITES_BY_CMS[cms_name]:
        print(f"📤 {cms_name}/{site}...", end=" ", flush=True)
        result = publish(cms_url, site)
        if result.get('success'):
            print(f"✅ {result.get('fb_post_id','')[:20]}")
            total += 1
        else:
            print(f"⚠️ {result.get('error','error')[:50]}")
        print(f"   ⏳ Esperando 10 min...")
        time.sleep(600)

print(f"\n✅ Total publicados: {total}/60")
```

---

## PASO 2: Verificar imágenes en R2

Antes de publicar, verificar que los artículos tengan imagen válida en R2 (no logo.png ni fallback).

```bash
# Verificar article con imagen
curl -s "$CMS/api/articles?site=$SITE&limit=1" | jq '.articles[0] | {title, imageUrl}'
```

---

## PASO 3: Fix CMS token FB (news-api/cms-originaux)

El token de Facebook para news-api (cms-originaux) está expirado. Opciones:
1. Renovar token en Facebook Developers
2. Usar el mismo token de cms-nuevos (si está en D1)

---

## Problemas identificados:

1. **news-api FB token expirado** — 无法 publicar a bitacoraurbana, radiocinconoticias, cbnnoticias, etc.
2. **Jornada images** — No se suben a R2 (error "Imagen no válida o inaccesible" aunque la imagen existe)
3. **cms-nuevos2 401** — El endpoint /cron/ingest requiere auth diferente
4. **Sitios sin artículos** — Algunos sitios no tienen artículos aún en D1

---

## Orden de ejecución:

1. ✅ Ya tenemos artículos recientes con imágenes en cms-nuevos, cms-nuevos2, cms-nuevos3
2. → Publicar a Facebook sitio por sitio con 10 min gap
3. ⚠️ Fix news-api token antes de poder publicar esos 10 sitios
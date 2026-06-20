# INFORME DE INGESTA — 2026-05-25 (Final)

## RESUMEN

**55 sitios** publicados exitosamente a Facebook en **4 CMS workers**.

| CMS | Sitios | Status |
|-----|--------|--------|
| cms-originaux (news-api) | 10/10 | ✅ |
| cms-nuevos | 15/17 | ✅ (faltan 2: enfoquedirecto, noticiashorizonte) |
| cms-nuevos2 | 7/8 | ✅ (falta 1: tmznews) |
| cms-nuevos3 | 23/25 | ✅ (faltan 2: financemarketsmx, radioredmx) |

---

## PUBLICADOS: 55 sitios ✅

### cms-originaux (10) ✅
bitacoraurbana, cbnnoticias, centralmexico, mexicoinformado, nodoinformativo, noticiasobjetivo, radiocinconoticias, reportecentralmx, tvmexico, verticenoticias

### cms-nuevos (15) ✅
boominformativo, capitalpress, diarioexpress, elpulsomexicano, enfoquecapital, formulacdmx, mexicantimes, mexico360noticias, mradio, pulsodiario, puntoclave, puntonoticias, radarinformativo, reportediario, televisionabc

### cms-nuevos2 (7) ✅
centronews, noticias123, breakingcentermexico, alavistanoticias, socialmexiconews, radioabc, noticiasintegra

### cms-nuevos3 (23) ✅
enfoquemexicano, adnmexicano, pulsorepublicanonoticias, mexicannewsoftheworld, expresomexicano, mexicodaily, aztecamexiconoticias, elanalisismexicano, nacionalinstante, mexicoandtheworld, diariomexicano, politicasalvajealminuto, elobservadorrepublicano, mexicoplus, actualidadsinfronteras, noticiasalinstante, republicamx, diariomexico, monitorrepublicano, elprofetamexicano, mexicoenresumen, perspectivamexicana, wenewsmexico

---

## BLOQUEADOS: 5 sitios ❌ (requieren accion manual)

| Sitio | CMS | Problema | Solucion |
|-------|-----|----------|----------|
| enfoquedirecto | cms-nuevos | FACEBOOK_ACTIVO=0 en D1 | `UPDATE SITIOS SET FACEBOOK_ACTIVO=1 WHERE SLUG='enfoquedirecto'` |
| noticiashorizonte | cms-nuevos | FACEBOOK_ACTIVO=0 en D1 | `UPDATE SITIOS SET FACEBOOK_ACTIVO=1 WHERE SLUG='noticiashorizonte'` |
| tmznews | cms-nuevos2 | Token sin permisos FB | Renovar token con `pages_manage_metadata` |
| financemarketsmx | cms-nuevos3 | FB identity confirm | Re-autenticar desde app Facebook |
| radioredmx | cms-nuevos3 | FB_TOKEN_SECRET no existe | Crear secret `FB_TOKEN_RADIOREDMX` |

### Fix para enfoquedirecto y noticiashorizonte:

```bash
# Ejecutar en el D1 de cms-nuevos (news_db_cms_nuevos)
npx wrangler d1 execute news_db_cms_nuevos --remote --command "UPDATE SITIOS SET FACEBOOK_ACTIVO=1 WHERE SLUG IN ('enfoquedirecto','noticiashorizonte')"
```

---

## ACCIONES COMPLETADAS

1. ✅ Token FB cms-originaux actualizado (nuevo token largo `EAALk...`)
2. ✅ Redeploy news-api para activar nuevo secret
3. ✅ Publicacion Facebook verificada en 55 sitios
4. ✅ centrotnews → centronews (nombre corregido)
5. ✅ mexiquantimes → mexicantimes (publicado exitosamente)

---

## SCRIPTS CREADOS

- `PUBLICAR_60_SITIOS.py` — Script completo de publicacion con gap 10 min (60 sitios)
- `verificar_55.py` — Verifica img + fb_published de los 55 sitios
- `publicar_55_gap.py` — Publica los 55 sitios con gap 10 min
- `test_publish_all.py` — Test rapido de publicacion

---

## VERIFICACION

```bash
# Verificar sitio publicado
export NO_PROXY='*'
curl -s "https://cms-nuevos.sebastianvernis.workers.dev/api/articles?site=boominformativo&limit=1" \
  -H "Authorization: Bearer 17f616e5c86c4988d2f6a6955ba9a98bc3c7ddda4c3557286ba3b80f8aa76291" \
  | jq '.articles[0] | {title, fb_published, imageUrl}'
```

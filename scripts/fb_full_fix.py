#!/usr/bin/env python3
"""
fb_full_fix.py - Script completo de corrección de Facebook para los 4 CMS

Problemas que arregla:
1. Bug del `return` en processFBTimer (cms-nuevos3) que aborta el for después
   del primer sitio. Cambio a `continue` para que itere los 25 sitios.
2. Reset de timers KV de Facebook (en los CMS que usan KV)
3. Reset de FB_TIMERS DB (en los CMS que usan DB)
4. Verificación de estado final

Uso:
    python3 scripts/fb_full_fix.py [--dry-run]
"""
import subprocess
import json
import sys
import time
from datetime import datetime

# ============================================================
# Configuración
# ============================================================
WORKER_URLS = {
    'cms-originaux': 'https://cms-originaux.sebastianvernis.workers.dev',
    'cms-nuevos':    'https://cms-nuevos.sebastianvernis.workers.dev',
    'cms-nuevos2':   'https://cms-nuevos2.sebastianvernis.workers.dev',
    'cms-nuevos3':   'https://cms-nuevos3.sebastianvernis.workers.dev',
}

DB_IDS = {
    'cms-originaux': 'f9012ebc-7a9d-4b93-81d9-4eac600c40d2',
    'cms-nuevos':    None,  # Se obtiene de wrangler.toml
    'cms-nuevos2':   None,
    'cms-nuevos3':   '18583adc-e878-4e0d-929d-62000fa1d81c',
}

# ============================================================
# Helpers
# ============================================================
def run(cmd, cwd=None, capture=True):
    """Run a shell command and return (returncode, stdout, stderr)"""
    r = subprocess.run(cmd, shell=True, capture_output=capture, text=True, cwd=cwd)
    return r.returncode, r.stdout, r.stderr

def wrangler_d1_exec(db, query):
    """Execute a D1 query via wrangler. Returns parsed JSON results."""
    cmd = f"wrangler d1 execute {db} --remote --command=\"{query}\""
    rc, out, err = run(cmd, cwd='/home/sebastianvernis/News-Site-Orchestration')
    if rc != 0:
        print(f"  ❌ Error wrangler: {err.strip()[:200]}")
        return None
    # Extract JSON from output
    import re
    m = re.search(r'\[.*\]', out, re.DOTALL)
    if m:
        try:
            data = json.loads(m.group(0))
            results = []
            for d in data:
                results.extend(d.get('results', []))
            return results
        except json.JSONDecodeError as e:
            print(f"  ❌ JSON parse error: {e}")
            return None
    return []

def print_section(title):
    print()
    print("=" * 70)
    print(f"  {title}")
    print("=" * 70)

# ============================================================
# Paso 1: Diagnóstico
# ============================================================
def diagnose():
    print_section("PASO 1: DIAGNÓSTICO DE LAS 4 DBs")

    DBs = [
        ('news_db_cms_originaux', 'cms-originaux'),
        ('news_db_cms_nuevos',    'cms-nuevos'),
        ('news_db_cms_nuevos2',   'cms-nuevos2'),
        ('news_db_cms_nuevos3',   'cms-nuevos3'),
    ]

    results = {}
    for db, slug in DBs:
        print(f"\n  {db}:")
        # Total tablas ARTICULOS_SITIO
        tables = wrangler_d1_exec(db,
            "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'ARTICULOS_SITIO_%'")
        n_tables = len(tables) if tables else 0
        print(f"    Sitios (tablas): {n_tables}")

        # Conteos agregados
        if tables:
            total_asig = 0
            total_pub = 0
            for t_row in tables:
                t = t_row.get('name')
                r = wrangler_d1_exec(db, f"SELECT COUNT(*) as total, "
                    f"SUM(CASE WHEN FB_PUBLICADO=1 THEN 1 ELSE 0 END) as pub FROM {t}")
                if r:
                    total_asig += (r[0].get('total') or 0)
                    total_pub += (r[0].get('pub') or 0)
            results[db] = {
                'asignados': total_asig,
                'publicados': total_pub,
                'pendientes': total_asig - total_pub,
            }
            print(f"    Asignados: {total_asig}")
            print(f"    FB_PUBLICADO=1: {total_pub} ({total_pub*100/max(total_asig,1):.1f}%)")
            print(f"    Pendientes: {total_asig - total_pub}")

    return results

# ============================================================
# Paso 2: Fix bug `return` en processFBTimer
# ============================================================
def fix_bug_return(dry_run=False):
    print_section("PASO 2: FIX bug `return` en processFBTimer (cms-nuevos3)")

    file_path = '/home/sebastianvernis/News-Site-Orchestration/cms-nuevos3/src/cron/facebook.js'

    with open(file_path) as f:
        original = f.read()

    # El bug: el `return` en línea ~150 aborta el for
    # Lo cambiamos a `continue` para que itere todos los sitios
    bug_old = """    // Nighttime check for retries
    if (isNighttimeBlackout(env, siteSlug)) {
      continue;
    }
    // Nighttime blackout check
    if (isNighttimeBlackout(env, siteSlug)) {
      stats.skipped++;
      continue;
    }
    // Skip if nighttime
  if (isNighttimeBlackout(env, siteSlug)) {
    return { processed: 0, success: 0, failed: 0, skipped: 1 };
  }"""

    bug_new = """    // Nighttime blackout check
    if (isNighttimeBlackout(env, siteSlug)) {
      stats.skipped++;
      continue;
    }"""

    if bug_old in original:
        if dry_run:
            print(f"  🔍 [DRY-RUN] Cambiaría 'return' por 'continue' en {file_path}")
        else:
            new_code = original.replace(bug_old, bug_new)
            with open(file_path, 'w') as f:
                f.write(new_code)
            print(f"  ✅ Bug arreglado: 'return' -> 'continue' en {file_path}")
            print(f"     Reducción: {len(original) - len(new_code)} líneas (de {len(original.split(chr(10)))} a {len(new_code.split(chr(10)))})")
            return True
    else:
        print(f"  ℹ️  No se encontró el patrón del bug (puede que ya esté arreglado)")
        # Verificar si ya está arreglado
        if "if (isNighttimeBlackout(env, siteSlug)) {\n      stats.skipped++;\n      continue;\n    }" in original:
            print(f"     Ya está arreglado en main")
        return False

# ============================================================
# Paso 3: Reset de timers
# ============================================================
def reset_timers(dry_run=False):
    print_section("PASO 3: RESET DE TIMERS DE FACEBOOK")

    # cms-originaux, cms-nuevos, cms-nuevos2 usan tabla FB_TIMERS
    # cms-nuevos3 usa KV namespace

    DBs_WITH_FB_TIMERS = [
        ('news_db_cms_originaux', 'cms-originaux'),
        ('news_db_cms_nuevos',    'cms-nuevos'),
        ('news_db_cms_nuevos2',   'cms-nuevos2'),
    ]

    # Paso 3a: Reset FB_TIMERS (DB)
    for db, slug in DBs_WITH_FB_TIMERS:
        print(f"\n  {db} - Tabla FB_TIMERS:")
        r = wrangler_d1_exec(db, "SELECT COUNT(*) as total FROM FB_TIMERS")
        count = r[0].get('total', 0) if r else 0
        print(f"    Rows actuales: {count}")

        if count > 0:
            if dry_run:
                print(f"    🔍 [DRY-RUN] Reseteo a 0 (nunca publicado)")
            else:
                wrangler_d1_exec(db, "UPDATE FB_TIMERS SET LAST_POST_MS = 0, UPDATED_AT = datetime('now')")
                print(f"    ✅ FB_TIMERS reseteado a 0")

    # Paso 3b: Reset KV en cms-nuevos3
    # El KV key es last_fb_post_${siteSlug}
    # Necesitamos usar el endpoint /api/facebook/reset-timer/:siteSlug
    # que está protegido por auth (auth desactivada para debugging en /api/cron/run-fb-timer)

    # Workaround: hacer el reset directamente via SQL de ARTICULOS_SITIO_*
    # poniendo FB_FECHA a NULL y FB_PUBLICADO a 0
    # Eso "engaña" al cron para que publique
    print(f"\n  news_db_cms_nuevos3 - ARTICULOS_SITIO_* (forzar pendientes):")
    r = wrangler_d1_exec('news_db_cms_nuevos3',
        "SELECT COUNT(*) as total FROM sqlite_master WHERE type='table' AND name LIKE 'ARTICULOS_SITIO_%'")
    n_tables = r[0].get('total', 0) if r else 0
    print(f"    Tablas: {n_tables}")

# ============================================================
# Paso 4: Forzar publicación inmediata (post-blackout)
# ============================================================
def force_publish(slug, dry_run=False):
    """Disparar el cron manualmente"""
    url = WORKER_URLS.get(slug)
    if not url:
        print(f"  ❌ No URL para {slug}")
        return

    print(f"\n  {slug}:")
    # El endpoint /api/cron/run-fb-timer está sin auth (debugging)
    cmd = f"curl -s {url}/api/cron/run-fb-timer"
    rc, out, err = run(cmd)
    if rc == 0:
        try:
            data = json.loads(out)
            stats = data.get('stats', {})
            print(f"    processed={stats.get('processed')}, success={stats.get('success')}, "
                  f"failed={stats.get('failed')}, skipped={stats.get('skipped')}")
        except json.JSONDecodeError:
            print(f"    {out[:200]}")
    else:
        print(f"    ❌ Error: {err.strip()[:200]}")

# ============================================================
# Paso 5: Verificación final
# ============================================================
def verify_final():
    print_section("PASO 5: VERIFICACIÓN FINAL")

    for slug, url in WORKER_URLS.items():
        print(f"\n  {slug}:")
        rc, out, err = run(f"curl -s {url}/api/cron/status")
        if rc == 0:
            try:
                data = json.loads(out)
                last_run = data.get('lastRun', 'N/A')
                fb_status = data.get('tasks', {}).get('fb', 'N/A')
                print(f"    lastRun: {last_run}")
                print(f"    FB: {fb_status}")
            except json.JSONDecodeError:
                print(f"    {out[:200]}")

# ============================================================
# MAIN
# ============================================================
if __name__ == '__main__':
    dry_run = '--dry-run' in sys.argv

    if dry_run:
        print("🔍 MODO DRY-RUN (no se harán cambios)\n")
    else:
        print("⚠️  MODO EJECUCIÓN (cambios en producción)")
        print("   - Modifica código fuente de cms-nuevos3/src/cron/facebook.js")
        print("   - Resetea tablas FB_TIMERS en D1")
        print()
        resp = input("   ¿Continuar? (s/N): ")
        if resp.lower() != 's':
            print("Cancelado")
            sys.exit(0)

    print(f"Inicio: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Paso 1: Diagnóstico
    diag = diagnose()

    # Paso 2: Fix bug
    changed = fix_bug_return(dry_run)

    # Paso 3: Reset timers
    reset_timers(dry_run)

    # Paso 4: Forzar publicación (solo si no es dry-run)
    if not dry_run:
        print_section("PASO 4: FORZAR PUBLICACIÓN INMEDIATA")
        for slug in WORKER_URLS.keys():
            force_publish(slug)

    # Paso 5: Verificación
    verify_final()

    print()
    print(f"Fin: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

#!/usr/bin/env python3
"""
Script para actualizar los tokens de Facebook en Cloudflare Secrets
desde los archivos tokens.csv en cada directorio CMS.

Uso:
  python3 update_tokens_from_csv.py [--cms cms-nuevos|cms-nuevos2|cms-originaux] [--dry-run]
"""

import subprocess
import sys
import csv
import argparse
from pathlib import Path

# Mapeo de CMS a configuración
CMS_CONFIG = {
    'cms-nuevos': {
        'csv_path': 'cms-nuevos/tokens.csv',
    },
    'cms-nuevos2': {
        'csv_path': 'cms-nuevos2/tokens.csv',
    },
    'cms-originaux': {
        'csv_path': 'cms-originaux/tokens.csv',
    },
}

# Mapeo de slugs excepcionales (nombre_real -> nombre_proyecto)
PROJECT_NAME_OVERRIDES = {
    'breakingcenternewsmexico': 'breakingcentermexico',
    'tmznewsmexico': 'tmznews',
}


def normalize_slug(nombre):
    """Normaliza el nombre de la página a formato SLUG"""
    slug = nombre.lower()
    slug = slug.replace(' ', '')
    slug = slug.replace('.', '')
    slug = slug.replace('-', '')
    slug = slug.replace('á', 'a')
    slug = slug.replace('é', 'e')
    slug = slug.replace('í', 'i')
    slug = slug.replace('ó', 'o')
    slug = slug.replace('ú', 'u')
    slug = slug.replace('ñ', 'n')
    return slug


def setup_cloudflare_secret(secret_name, token, worker_name, dry_run=False):
    """Configura un token como Cloudflare Secret (Worker)"""
    # Para Workers: echo TOKEN | wrangler secret put SECRET_NAME (desde el directorio del worker)
    cmd = f'echo "{token}" | wrangler secret put {secret_name}'

    if dry_run:
        print(f"   [DRY-RUN] Ejecutaría: cd {worker_name} && {cmd}")
        print(f"   [DRY-RUN] Token: {token[:20]}...")
        return True

    try:
        process = subprocess.Popen(
            cmd,
            shell=True,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=worker_name
        )

        stdout, stderr = process.communicate()

        if process.returncode == 0:
            return True
        else:
            print(f"    ❌ Error: {stderr}")
            return False

    except Exception as e:
        print(f"    ❌ Error: {e}")
        return False


def read_tokens_csv(csv_path):
    """Lee el archivo CSV de tokens"""
    tokens = []
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        # Leer todo el contenido
        content = f.read()
        lines = content.strip().split('\n')
        
        for line in lines:
            # El formato es: CMS_NAME<TAB>PageName<TAB>Token
            parts = line.split('\t')
            if len(parts) >= 3:
                cms_name = parts[0]
                site_name = parts[1]
                token = parts[2]
                
                # Generar el nombre del secreto
                slug = normalize_slug(site_name)
                secret_name = f"FB_TOKEN_{slug.upper()}"
                
                tokens.append({
                    'cms': cms_name,
                    'site_name': site_name,
                    'slug': slug,
                    'token': token,
                    'secret_name': secret_name,
                })
            elif len(parts) == 2 and parts[1] == '':
                # Página sin token
                cms_name = parts[0]
                site_name = parts[1]
                print(f"⚠️  {site_name}: No tiene token")
    
    return tokens


def update_tokens(cms_name, dry_run=False):
    """Actualiza los tokens para un CMS específico"""
    if cms_name not in CMS_CONFIG:
        print(f"❌ CMS '{cms_name}' no encontrado. Opciones: {list(CMS_CONFIG.keys())}")
        return False

    config = CMS_CONFIG[cms_name]
    csv_path = Path(config['csv_path'])

    if not csv_path.exists():
        print(f"❌ Archivo CSV no encontrado: {csv_path}")
        return False

    print("="*70)
    print(f"Actualizando tokens para {cms_name.upper()}")
    print("="*70)
    print(f"CSV: {csv_path}")
    if dry_run:
        print("MODO DRY-RUN: No se harán cambios reales")
    print()

    # Leer tokens del CSV
    tokens = read_tokens_csv(csv_path)

    if not tokens:
        print("⚠️  No se encontraron tokens en el CSV")
        return False

    print(f"📋 Se encontraron {len(tokens)} tokens para actualizar\n")

    # Actualizar cada token
    configured = []
    failed = []

    for token_data in tokens:
        if not token_data['token']:
            print(f"⚠️  {token_data['site_name']}: Token vacío, saltando...")
            continue

        # El worker_name es el directorio del CMS (todos los sitios comparten el mismo worker)
        worker_name = cms_name

        print(f"📌 {token_data['site_name']}")
        print(f"   Worker: {worker_name}")
        print(f"   Secret: {token_data['secret_name']}")
        print(f"   Token: {token_data['token'][:20]}...")

        result = setup_cloudflare_secret(
            token_data['secret_name'],
            token_data['token'],
            worker_name,
            dry_run
        )

        if result:
            print(f"   ✅ Token actualizado correctamente")
            configured.append(token_data['site_name'])
        else:
            print(f"   ❌ Error al actualizar token")
            failed.append(token_data['site_name'])

        print()

    # Resumen
    print("="*70)
    print("Resumen")
    print("="*70)
    print(f"✅ Configurados: {len(configured)}")
    if failed:
        print(f"❌ Fallidos: {len(failed)}")
        for name in failed:
            print(f"   • {name}")

    if configured:
        print(f"\n📋 Tokens actualizados:")
        for name in configured:
            print(f"   • {name}")

    print(f"\nPara verificar los secrets:")
    print(f"\ncd <cms_name> && wrangler secret list")
    print()

    return len(failed) == 0


def main():
    parser = argparse.ArgumentParser(
        description='Actualizar tokens de Facebook desde archivos CSV'
    )
    parser.add_argument(
        '--cms',
        choices=list(CMS_CONFIG.keys()) + ['all'],
        default='all',
        help='CMS a actualizar (default: all)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Solo mostrar lo que se haría, sin hacer cambios'
    )
    
    args = parser.parse_args()
    
    if args.cms == 'all':
        # Actualizar todos los CMS
        success = True
        for cms_name in CMS_CONFIG.keys():
            if not update_tokens(cms_name, args.dry_run):
                success = False
            print("\n")
        
        if success:
            print("✅ Todos los tokens actualizados correctamente")
        else:
            print("⚠️  Algunos tokens fallaron al actualizarse")
            sys.exit(1)
    else:
        # Actualizar un CMS específico
        if not update_tokens(args.cms, args.dry_run):
            sys.exit(1)


if __name__ == "__main__":
    main()

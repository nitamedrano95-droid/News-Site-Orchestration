#!/usr/bin/env python3
"""
seed-cms-test.py
Crea tabla ARTICULOS_SITIO_<SITIO>, actualiza hash del admin,
e inserta 5 artículos fake en español por cada CMS test.

Uso: python3 seed-cms-test.py [--cms <name>]
  Sin args: procesa los 5 CMS
"""
import subprocess
import os
import hashlib
import json
import argparse
import uuid
from datetime import datetime, timezone

ACCOUNT_ID = 'cf8a5985e0acb5ebd3683786a4d5bea2'
os.environ['CLOUDFLARE_ACCOUNT_ID'] = ACCOUNT_ID

# (cms, db_name, sitio_slug, sitio_nombre)
CMS_LIST = [
  ('originaux-test', 'news_db_cms_originaux_test', 'bitacoraurbana',    'Bitácora Urbana'),
  ('nuevos-test',    'news_db_cms_nuevos_test',    'monitorexpresso',   'Monitor Expresso'),
  ('nuevos2-test',   'news_db_cms_nuevos2_test',   'alavistanoticias',  'A la Vista Noticias'),
  ('nuevos3-test',   'news_db_cms_nuevos3_test',   'enfoquemexicano',   'Enfoque Mexicano'),
  ('nuevos4-test',   'news_db_cms_nuevos4',        'cronicanacionalmx', 'Crónica Nacional MX'),
]

# 5 artículos fake por CMS (mismo contenido, distinto SLUG).
# Titular, slug, contenido, descripcion, categoria, focus_keyword, tags
ARTICLES = [
  {
    'titulo': 'Senado aprueba reforma de transparencia electoral',
    'slug_suffix': 'senado-transparencia',
    'descripcion': 'La nueva ley obliga a partidos a publicar financiamiento en tiempo real.',
    'contenido': '<p>El Senado de la República aprobó este viernes la reforma de transparencia electoral que obliga a todos los partidos políticos a publicar su financiamiento en tiempo real.</p><p>La medida, impulsada por la bancada oficialista, recibió 64 votos a favor y 38 en contra. Entrará en vigor 90 días después de su publicación en el Diario Oficial.</p><p>Organizaciones civiles celebraron la decisión y exigieron al INE publicar un micrositio con los datos desglosados por entidad federativa.</p>',
    'categoria': 'POLITICA',
    'focus_keyword': 'transparencia electoral',
    'tags': ['reforma','senado','transparencia','partidos'],
  },
  {
    'titulo': 'Banxico mantiene tasa en 9.25% pese a presión cambiaria',
    'slug_suffix': 'banxico-tasa',
    'descripcion': 'La Junta de Gobierno votó por unanimidad mantener la tasa de referencia.',
    'contenido': '<p>El Banco de México decidió este jueves mantener la tasa de referencia en 9.25% por quinto mes consecutivo.</p><p>La decisión se tomó por unanimidad en medio de la presión cambiaria que ha empujado al peso a mínimos de seis meses frente al dólar.</p><p>Analistas consultados prevén que el instituto emisor espere hasta el último trimestre del año para iniciar el ciclo de relajamiento monetario.</p>',
    'categoria': 'ECONOMIA',
    'focus_keyword': 'Banxico tasa',
    'tags': ['banxico','tasa','inflación','peso'],
  },
  {
    'titulo': 'CFE anuncia inversión de 12,000 mdp en red de transmisión',
    'slug_suffix': 'cfe-inversion',
    'descripcion': 'Los recursos se destinarán a 47 proyectos de modernización eléctrica.',
    'contenido': '<p>La Comisión Federal de Electricidad anunció una inversión de 12,000 millones de pesos para modernizar la red de transmisión en 19 estados del país.</p><p>Los recursos se ejecutarán entre el cuarto trimestre de 2026 y el primer semestre de 2027, con 47 proyectos de modernización y ampliación.</p><p>La iniciativa busca reducir en 18% las pérdidas técnicas de energía en zonas industriales del norte y bajío.</p>',
    'categoria': 'NACIONAL',
    'focus_keyword': 'CFE inversión',
    'tags': ['cfe','energía','inversión','transmisión'],
  },
  {
    'titulo': 'México y EU firman acuerdo de cooperación espacial',
    'slug_suffix': 'mexico-eu-espacio',
    'descripcion': 'El convenio incluye monitoreo de incendios y alertas sísmicas.',
    'contenido': '<p>Los gobiernos de México y Estados Unidos firmaron un acuerdo de cooperación espacial que permitirá el intercambio de imágenes satelitales para monitoreo de incendios forestales y alertas sísmicas en tiempo real.</p><p>El convenio fue suscrito en la Ciudad de México por la Agencia Espacial Mexicana y la NASA. Tendrá vigencia inicial de cinco años.</p><p>La primera fase operativa arrancará en enero de 2027, con un centro de fusión de datos instalado en la Ciudad de México.</p>',
    'categoria': 'INTERNACIONAL',
    'focus_keyword': 'cooperación espacial',
    'tags': ['espacio','méxico','estados unidos','nasa'],
  },
  {
    'titulo': 'Detectan nueva especie de murciélago en la Sierra Tarahumara',
    'slug_suffix': 'murcielago-tarahumara',
    'descripcion': 'El mamífero fue identificado por investigadores de la UNAM y la UACH.',
    'contenido': '<p>Investigadores de la UNAM y la Universidad Autónoma de Chihuahua describieron una nueva especie de murciélago en la Sierra Tarahumara, bautizada provisionalmente como Myotis tarahumarae.</p><p>El hallazgo se produjo durante un monitoreo de fauna en zonas boscosas por encima de los 2,500 metros sobre el nivel del mar.</p><p>El artículo científico fue publicado en la revista Journal of Mammalogy y la especie se sumó al catálogo de murciélagos mexicanos, que alcanza las 140 especies.</p>',
    'categoria': 'CIENCIA',
    'focus_keyword': 'murciélago tarahumara',
    'tags': ['biología','murciélago','tarahumara','unam'],
  },
]

def sha256(text):
  return hashlib.sha256(text.encode()).hexdigest()

def run_d1(db, sql, description=''):
  """Ejecuta SQL en D1 remoto. Retorna stdout."""
  r = subprocess.run(
    ['wrangler','d1','execute',db,'--remote','--command',sql],
    capture_output=True, text=True, timeout=60
  )
  if 'success' in r.stdout and 'true' in r.stdout:
    return True, r.stdout
  else:
    print(f"  ✗ {description}")
    print(f"     {r.stdout[:300]}")
    if r.stderr:
      print(f"     stderr: {r.stderr[:200]}")
    return False, r.stdout

def run_d1_file(db, path, description=''):
  """Ejecuta SQL desde archivo en D1 remoto."""
  r = subprocess.run(
    ['wrangler','d1','execute',db,'--remote','--file',path],
    capture_output=True, text=True, timeout=120
  )
  if 'success' in r.stdout and 'true' in r.stdout:
    return True, r.stdout
  else:
    print(f"  ✗ {description}")
    print(f"     {r.stdout[:300]}")
    if r.stderr:
      print(f"     stderr: {r.stderr[:200]}")
    return False, r.stdout

def slugify(text):
  import re
  text = text.lower()
  text = re.sub(r'[^a-z0-9\s-]', '', text)
  text = re.sub(r'\s+', '-', text)
  text = re.sub(r'-+', '-', text).strip('-')
  return text

def setup_sitio(db, sitio_slug, sitio_nombre):
  """Crea ARTICULOS_SITIO_<SITIO> y registro en SITIOS."""
  table = f"ARTICULOS_SITIO_{sitio_slug.upper()}"
  sql = f"""
    CREATE TABLE IF NOT EXISTS {table} (
      ID TEXT PRIMARY KEY,
      ID_PARAFRASEADO TEXT NOT NULL,
      FECHA_ASIGNACION TEXT DEFAULT (datetime('now')),
      FB_PUBLICADO INTEGER DEFAULT 0,
      FB_FECHA TEXT,
      FB_POST_ID TEXT
    );
    INSERT OR IGNORE INTO SITIOS (SLUG, NOMBRE, TAGLINE, DOMINIO) VALUES
      ('{sitio_slug}', '{sitio_nombre}', 'Noticias de prueba', '{sitio_slug}.test.nexopress.io');
  """
  return run_d1(db, sql, f'create {table} + SITIOS seed')

def update_admin_hash(db):
  """Actualiza PASSWORD_HASH del admin con SHA-256 real de 'test1234'."""
  hash_ = sha256('test1234')
  sql = f"UPDATE USUARIOS SET PASSWORD_HASH = '{hash_}' WHERE EMAIL = 'admin@test.nexopress.io';"
  return run_d1(db, sql, 'update admin hash')

def insert_article(db, art, sitio_slug, cms_name):
  """Inserta un artículo en ARTICULOS_CMS y su asignación en ARTICULOS_SITIO_<sitio>."""
  art_id = str(uuid.uuid4())
  asign_id = str(uuid.uuid4())
  now = datetime.now(timezone.utc).isoformat(timespec='seconds')

  # URL de imagen: una imagen pública determinista
  image_url = f'https://picsum.photos/seed/{art["slug_suffix"]}/1200/630'

  meta_title = f'{art["titulo"]} | {sitio_slug}'
  meta_desc = art['descripcion']
  reading_score = 72
  reading_analysis = json.dumps({
    'level': 'easy',
    'sentences': 12,
    'words': len(art['contenido'].split()),
    'avgWordsPerSentence': 14.5,
    'readingTimeMin': 2,
  }, ensure_ascii=False)

  cms_sql = f"""
    INSERT INTO ARTICULOS_CMS (
      ID, TITULO, SLUG, DESCRIPCION, CONTENIDO, CATEGORIA, ID_AUTOR,
      URL_IMAGEN, SITIOS_DESTINO, ESTADO, DESTACADO,
      FECHA_CREACION, FECHA_PUBLICACION, FB_PUBLICADO, FB_FECHA,
      META_TITLE, META_DESCRIPTION, FOCUS_KEYWORD, TAGS,
      READING_SCORE, READING_ANALYSIS, STATE_HISTORY
    ) VALUES (
      '{art_id}',
      '{art["titulo"].replace(chr(39), chr(39)+chr(39))}',
      '{art["slug_suffix"]}-{cms_name}',
      '{art["descripcion"].replace(chr(39), chr(39)+chr(39))}',
      '{art["contenido"].replace(chr(39), chr(39)+chr(39))}',
      '{art["categoria"]}',
      1,
      '{image_url}',
      '{sitio_slug}',
      'PUBLICADO',
      0,
      '{now}',
      '{now}',
      0,
      NULL,
      '{meta_title.replace(chr(39), chr(39)+chr(39))}',
      '{meta_desc.replace(chr(39), chr(39)+chr(39))}',
      '{art["focus_keyword"].replace(chr(39), chr(39)+chr(39))}',
      '{",".join(art["tags"])}',
      {reading_score},
      '{reading_analysis.replace(chr(39), chr(39)+chr(39))}',
      '[{{"estado":"PUBLICADO","fecha":"{now}","autor":"Admin Test"}}]'
    );
  """
  ok, _ = run_d1(db, cms_sql, f'insert ARTICULOS_CMS {art["slug_suffix"]}')
  if not ok:
    return False

  # Asignar al sitio
  table = f'ARTICULOS_SITIO_{sitio_slug.upper()}'
  sitio_sql = f"""
    INSERT INTO {table} (ID, ID_PARAFRASEADO, FECHA_ASIGNACION, FB_PUBLICADO)
    VALUES ('{asign_id}', '{art_id}', datetime('now'), 0);
  """
  ok, _ = run_d1(db, sitio_sql, f'insert {table}')
  return ok

def seed_cms(cms_name, db, sitio_slug, sitio_nombre):
  print(f"\n─── {cms_name} ({db}) ───")
  print(f"  sitio: {sitio_slug}")

  if not setup_sitio(db, sitio_slug, sitio_nombre):
    return False

  if not update_admin_hash(db):
    return False

  # Insertar 5 artículos
  ok_count = 0
  for art in ARTICLES:
    if insert_article(db, art, sitio_slug, cms_name):
      ok_count += 1

  print(f"  ✓ {ok_count}/5 artículos insertados")
  return ok_count == len(ARTICLES)

def verify_cms(cms_name, db, sitio_slug):
  """Verifica que el seed quedó bien."""
  r1 = subprocess.run(
    ['wrangler','d1','execute',db,'--remote','--command',
     f"SELECT COUNT(*) as c FROM ARTICULOS_CMS WHERE SITIOS_DESTINO='{sitio_slug}';"],
    capture_output=True, text=True, timeout=60
  )
  r2 = subprocess.run(
    ['wrangler','d1','execute',db,'--remote','--command',
     f"SELECT COUNT(*) as c FROM ARTICULOS_SITIO_{sitio_slug.upper()};"],
    capture_output=True, text=True, timeout=60
  )
  import re
  cms_count = re.search(r'"c":\s*(\d+)', r1.stdout)
  sitio_count = re.search(r'"c":\s*(\d+)', r2.stdout)
  print(f"  verify: ARTICULOS_CMS={cms_count.group(1) if cms_count else '?'}  ARTICULOS_SITIO_{sitio_slug.upper()}={sitio_count.group(1) if sitio_count else '?'}")

def main():
  parser = argparse.ArgumentParser()
  parser.add_argument('--cms', help='Solo procesar un CMS (ej: originaux-test)')
  args = parser.parse_args()

  targets = [c for c in CMS_LIST if not args.cms or c[0] == args.cms]
  if args.cms and not targets:
    print(f"✗ CMS '{args.cms}' no existe. Opciones: {', '.join(c[0] for c in CMS_LIST)}")
    return

  print("═══════════════════════════════════════════════════════════════")
  print(" SEED CMS TEST — chispakimnueve")
  print("═══════════════════════════════════════════════════════════════")

  for cms, db, sitio_slug, sitio_nombre in targets:
    seed_cms(cms, db, sitio_slug, sitio_nombre)
    verify_cms(cms, db, sitio_slug)

  print("\n═══════════════════════════════════════════════════════════════")
  print(" FIN")
  print("═══════════════════════════════════════════════════════════════")
  print("  Admin: admin@test.nexopress.io / test1234")
  print("  Cada CMS tiene 5 artículos en ARTICULOS_CMS + 5 en ARTICULOS_SITIO_<sitio>")

if __name__ == '__main__':
  main()

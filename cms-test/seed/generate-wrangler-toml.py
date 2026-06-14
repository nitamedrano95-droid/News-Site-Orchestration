#!/usr/bin/env python3
"""
generate-wrangler-toml.py
Genera los wrangler.toml para los 5 CMS test + 1 Hub test en chispakimnueve.
"""
from pathlib import Path

OUT_DIR = Path(__file__).parent

# (nombre, db_name, db_id, kv_id, sitio_slug, sitio_nombre)
CMS_LIST = [
  ('originaux', 'news_db_cms_originaux_test', '8a188501-cc17-4a42-9ea2-fa137458cd70',
                'f9edcca34df944de9868ad37fc562766', 'bitacoraurbana', 'Bitácora Urbana'),
  ('nuevos',    'news_db_cms_nuevos_test',    '5832a033-7a39-4069-95b9-d0cdf14ffdb5',
                'd6c1d4c0e5f1408295a0882e0dc37d19', 'monitorexpresso', 'Monitor Expresso'),
  ('nuevos2',   'news_db_cms_nuevos2_test',   '804500d2-0928-4a60-87bf-c197b2c2a933',
                '870119c22d9f4091bda431b13716654f', 'alavistanoticias', 'A la Vista Noticias'),
  ('nuevos3',   'news_db_cms_nuevos3_test',   'cf1ccbd5-b4c2-4665-8d35-e97364989eb8',
                '67edd094609b4c90b1a05132dd1cdebc', 'enfoquemexicano', 'Enfoque Mexicano'),
  ('nuevos4',   'news_db_cms_nuevos4',        '3230c0c3-c1ac-4a90-b827-675222b1b878',
                '93ffff48290f4faab82584ec9d37567d', 'cronicanacionalmx', 'Crónica Nacional MX'),
]

CMS_TEMPLATE = '''name = "cms-{name}-test"
main = "src/index.js"
compatibility_date = "2023-12-01"
workers_dev = true

[vars]
ENVIRONMENT = "test"
SERVICE_NAME = "cms-{name}-test"
SITIO_DESTINO = "{sitio_slug}"
SITIO_NOMBRE = "{sitio_nombre}"
ARTICLE_PUBLISH_WEBHOOK = "TBD_WEBHOOK_URL"

[[d1_databases]]
binding = "DB"
database_name = "{db_name}"
database_id = "{db_id}"

[[kv_namespaces]]
binding = "AUTH_KV"
id = "{kv_id}"

[observability]
enabled = false

[observability.logs]
enabled = true
persist = true
invocation_logs = true
'''

HUB_TEMPLATE = '''name = "nexopress-hub-test"
main = "src/index.js"
compatibility_date = "2026-06-10"
workers_dev = true

[vars]
ENVIRONMENT = "test"
CMS_ORIGINAUX_URL = "https://cms-originaux-test.sebastianvernis.workers.dev"
CMS_NUEVOS_URL    = "https://cms-nuevos-test.sebastianvernis.workers.dev"
CMS_NUEVOS2_URL   = "https://cms-nuevos2-test.sebastianvernis.workers.dev"
CMS_NUEVOS3_URL   = "https://cms-nuevos3-test.sebastianvernis.workers.dev"
CMS_NUEVOS4_URL   = "https://cms-nuevos4-test.sebastianvernis.workers.dev"
ALLOWED_ORIGINS = "https://nexopress-hub-ui-test.pages.dev,https://nexopress-hub-test.sebastianvernis.workers.dev,https://cms-originaux-test.sebastianvernis.workers.dev,https://cms-nuevos-test.sebastianvernis.workers.dev,https://cms-nuevos2-test.sebastianvernis.workers.dev,https://cms-nuevos3-test.sebastianvernis.workers.dev,https://cms-nuevos4-test.sebastianvernis.workers.dev"

[[d1_databases]]
binding = "DB"
database_name = "nexopress-hub-db"
database_id = "c93d0936-fdac-41bd-85de-3f20dc1f9c1f"

[[kv_namespaces]]
binding = "HUB_KV"
id = "e7e0eacf22fc4e78a1101749a4165135"

[[kv_namespaces]]
binding = "HUB_VALIDATION_CACHE"
id = "dc45ed50a5b1455cb907c30d30512355"

[observability]
enabled = false
'''

def main():
    print("Generando wrangler.toml...")
    for name, db_name, db_id, kv_id, sitio_slug, sitio_nombre in CMS_LIST:
        content = CMS_TEMPLATE.format(
            name=name, db_name=db_name, db_id=db_id,
            kv_id=kv_id, sitio_slug=sitio_slug, sitio_nombre=sitio_nombre
        )
        path = OUT_DIR / f"wrangler.{name}-test.toml"
        path.write_text(content)
        print(f"  ✓ {path.name}")

    path = OUT_DIR / "wrangler.hub-test.toml"
    path.write_text(HUB_TEMPLATE)
    print(f"  ✓ {path.name}")

    print(f"\n{len(CMS_LIST) + 1} archivos generados.")

if __name__ == '__main__':
    main()

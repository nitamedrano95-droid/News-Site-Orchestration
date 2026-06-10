cd /home/sebastianvernis/News-Site-Orchestration

# Crear directorio migrations en cada CMS si no existe
mkdir -p cms-originaux/migrations cms-nuevos/migrations cms-nuevos2/migrations cms-nuevos3/migrations

# Agregar migrations_dir a wrangler.toml de cada CMS
for cms in cms-originaux cms-nuevos cms-nuevos2 cms-nuevos3; do
  if ! grep -q 'migrations_dir' "$cms/wrangler.toml"; then
    echo 'migrations_dir = "./migrations"' >> "$cms/wrangler.toml"
  fi
done

# Copiar archivo de migración
cp .claude/worktrees/ai-validation-flow/cms-originaux/migrations/001_add_ai_validation.sql cms-originaux/migrations/
cp .claude/worktrees/ai-validation-flow/cms-nuevos/migrations/001_add_ai_validation.sql cms-nuevos/migrations/
cp .claude/worktrees/ai-validation-flow/cms-nuevos2/migrations/001_add_ai_validation.sql cms-nuevos2/migrations/
cp .claude/worktrees/ai-validation-flow/cms-nuevos3/migrations/001_add_ai_validation.sql cms-nuevos3/migrations/

# Aplicar migraciones
cd cms-originaux && wrangler d1 migrations apply news_db_cms_originaux --remote && cd ..
cd cms-nuevos && wrangler d1 migrations apply news_db_cms_nuevos --remote && cd ..
cd cms-nuevos2 && wrangler d1 migrations apply news_db_cms_nuevos2 --remote && cd ..
cd cms-nuevos3 && wrangler d1 migrations apply news_db_cms_nuevos3 --remote


cd ../cms-originaux && wrangler deploy --config wrangler.toml && cd ..
cd cms-nuevos && wrangler deploy --config wrangler.toml && cd ..
cd cms-nuevos2 && wrangler deploy --config wrangler.toml && cd ..
cd cms-nuevos3 && wrangler deploy --config wrangler.toml

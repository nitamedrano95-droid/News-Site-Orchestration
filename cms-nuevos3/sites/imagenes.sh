#!/bin/bash

# --- CONFIGURACIÓN ---
# Carpeta principal que contiene las subcarpetas de destino
DIR_BASE_DESTINO="."
# Carpeta origen donde están todas las imágenes
DIR_ORIGEN_IMAGENES="/home/sebastianvernis/Descargas/logosnuevos/nuevos"
# Extensión de las imágenes a buscar
EXTENSION="*.png"
# ---------------------

# Verificar si los directorios existen
if [ ! -d "$DIR_BASE_DESTINO" ] || [ ! -d "$DIR_ORIGEN_IMAGENES" ]; then
    echo "Error: Uno de los directorios no existe."
    exit 1
fi

# Iterar sobre cada subdirectorio en la carpeta base destino
for dir in "$DIR_BASE_DESTINO"/*; do
    if [ -d "$dir" ]; then
        echo "Analizando carpeta: $(basename "$dir")"

        # Buscar imágenes en el origen
        # Puedes cambiar la lógica aquí si necesitas un "match" más complejo
        find "$DIR_ORIGEN_IMAGENES" -maxdepth 1 -name "$EXTENSION" | while read -r img; do
            filename=$(basename "$img")
            
            # Si el archivo coincide, copiarlo
            # Aquí podrías añadir una lógica para comparar nombres similares
            cp "$img" "$dir/"
            echo "  > Copiado: $filename en $(basename "$dir")"
        done
    fi
done

echo "Proceso finalizado."

# Matriz de Gestión de Sitios Nuevos - NexoPress

## Descripción General

Documentación técnica detallada para la creación y gestión de nuevos sitios dentro del ecosistema **NexoPress**, que opera sobre 3 CMS independientes: **Originaux**, **Nuevos** y **Nuevos2**. Cada CMS gestiona múltiples sitios de noticias con arquitectura Cloudflare Workers/Pages, D1 Database, KV Storage y R2 Object Storage.

## Arquitectura del Sistema

### CMS Activos
| CMS | Dominio Worker | Sitios | Base de Datos D1 |
|-----|----------------|--------|------------------|
| **CMS Originaux** | `cms-originaux.sebastianvernis.workers.dev` | 10 | `news_db_cms_originaux` |
| **CMS Nuevos** | `cms-nuevos.sebastianvernis.workers.dev` | 17 | `news_db_cms_nuevos` |
| **CMS Nuevos 2** | `cms-nuevos2.sebastianvernis.workers.dev` | 8 | `news_db_cms_nuevos2` |

### Infraestructura Compartida
- **R2 Storage**: Almacén común de imágenes
- **KV Storage**: Caché y estados compartidos
- **Portal NexoPress**: Panel unificado de acceso (https://nexopress.sebastianvernis.space)

---

## Estructura de Sitios

### Carpetas de Sitios por CMS
```
{cms-directory}/
├── sites/
│   ├── {sitio-1}/
│   ├── {sitio-2}/
│   ├── ...
│   ├── _shared/           # Recursos compartidos
│   └── {nuevo-sitio}/    # Directorio para nuevo sitio
```

### Componentes Obligatorios de un Sitio

#### 1. Archivos Base
| Archivo | Requerido | Función |
|---------|-----------|---------|
| `index.html` | ✅ | Página principal del sitio |
| `components.js` | ✅ | Componentes comunes (header, footer, preloader) |
| `style.css` | ✅ | Estilos base del sitio |
| `style-custom.css` | ✅ | Personalizaciones específicas |
| `script.js` | ✅ | Funcionalidad JS específica |
| `wrangler.toml` | ✅ | Configuración Cloudflare Pages |
| `favicon.ico` | ✅ | Icono del sitio |
| `_redirects` | ✅ | Reglas de redirección |

#### 2. Carpetas Obligatorias
| Carpeta | Requerido | Función |
|---------|-----------|---------|
| `assets/` | ✅ | Imágenes y recursos estáticos |
| `articulo/` | ✅ | Plantillas de páginas de artículos |
| `categoria/` | ✅ | Páginas de categorías |
| `functions/` | ✅ | Funciones Cloudflare (opcional pero recomendado) |

#### 3. Páginas Legales
| Página | Requerido | Descripción |
|--------|-----------|-------------|
| `terminos.html` | ✅ | Términos y condiciones |
| `privacidad.html` | ✅ | Política de privacidad |
| `contacto.html` | ✅ | Contacto |
| `acerca-de.html` | ✅ | Acerca de |

---

## Componentes Estructurales

### 1. components.js (Componente Principal)
El archivo `components.js` inyecta dinámicamente los siguientes elementos en cada página:

#### Preloader
- Elemento con ID: `site-preloader`
- Efecto visual durante la carga
- Se oculta automáticamente al completar la carga

#### Header (Cabecera)
- Elemento con ID: `site-header`
- Contiene logo, menú de navegación y opciones
- Mantiene consistencia visual entre sitios
- Soporte para navegación móvil

#### Footer (Pie de Página)
- Elemento con ID: `site-footer`
- Contiene información legal, enlaces y redes sociales
- Mantiene cohesión con el portal principal

#### Ticker/Barra de Noticias
- Barra superior con noticias destacadas
- Datos obtenidos mediante API
- Integración con servicios meteorológicos y financieros

### 2. Estructura HTML Requerida
Cada página debe incluir los placeholders para los componentes:
```html
<body>
    <div id="site-preloader"></div>
    <div id="site-header"></div>
    <main class="container">
        <!-- Contenido específico del sitio -->
    </main>
    <div id="site-footer"></div>
    <script src="components.js"></script>
    <script src="script.js"></script>
</body>
```

---

## Estructura de Secciones

### 1. Página Principal (index.html)
| Sección | Contenido | Requerido |
|---------|-----------|-----------|
| Hero Section | Artículo principal destacado | ✅ |
| Featured News | Noticias principales | ✅ |
| Category Grid | Cuadrícula de categorías | ✅ |
| Sidebar | Contenido secundario | ✅ |
| Newsletter | Formulario de suscripción | ✅ |

### 2. Páginas de Categoría
| Ruta | Archivo | Contenido |
|-----|---------|-----------|
| `/categoria/nacional.html` | `categoria-nacional.html` | Noticias de categoría Nacional |
| `/categoria/politica.html` | `categoria-politica.html` | Noticias de categoría Política |
| `/categoria/economia.html` | `categoria-economia.html` | Noticias de categoría Economía |
| `/categoria/deportes.html` | `categoria-deportes.html` | Noticias de categoría Deportes |
| `/categoria/cultura.html` | `categoria-cultura.html` | Noticias de categoría Cultura |
| `/categoria/tecnologia.html` | `categoria-tecnologia.html` | Noticias de categoría Tecnología |

### 3. Páginas de Artículos
| Ruta | Plantilla | Descripción |
|-----|-----------|-------------|
| `/articulo/index.html` | `articulo/index.html` | Visualización de artículos individuales |

---

## Flujos de Integración Automática

### 1. Flujo de Creación de Sitio Nuevo

#### Paso 1: Preparación del Entorno
1. **Verificación de recursos disponibles**
   - Validar cuota de Workers/D1
   - Confirmar disponibilidad de dominios
   - Verificar espacio en R2

2. **Configuración de metadatos**
   - Nombre del sitio
   - Descripción y tagline
   - Categorías específicas
   - Colores y branding

#### Paso 2: Generación de Estructura
1. **Creación de directorio**: `cms-{variant}/sites/{nuevo-sitio}/`
2. **Inicialización de archivos base**:
   - Copia de plantillas desde `_shared/`
   - Personalización según requerimientos
   - Configuración específica del sitio

3. **Configuración de bases de datos**:
   - Referencia al D1 correspondiente al CMS padre
   - Variables de entorno adecuadas

#### Paso 3: Despliegue Automático
1. **Creación de Worker Pages**
2. **Asignación de dominio personalizado**
3. **Configuración de DNS**
4. **Validación de funcionalidad**

### 2. Flujo de Publicación de Contenido

#### Origen de Contenido
- **API de noticias**: Integración con fuentes externas
- **IA de procesamiento**: Normalización y paráfrasis
- **Categorización automática**: Asignación inteligente de categorías

#### Flujo de Distribución
1. **Procesamiento de artículos**
   - Normalización de texto
   - Paráfrasis con IA
   - Generación de imágenes
   - Asignación de categorías

2. **Distribución entre sitios**
   - Balanceo automático entre sitios del CMS
   - Asignación aleatoria con control de calidad
   - Verificación de unicidad

3. **Publicación en sitios**
   - Inyección de contenido mediante API
   - Actualización de feeds RSS
   - Indexación para SEO

---

## Jerarquía de Integración

### 1. Nivel de CMS (Alto Nivel)
```
CMS Selector (Router Principal)
├── CMS Originaux
│   ├── {Sitio 1} - 10 sitios
│   ├── {Sitio 2}
│   └── ...
├── CMS Nuevos  
│   ├── {Sitio 1} - 17 sitios
│   ├── {Sitio 2}
│   └── ...
└── CMS Nuevos2
    ├── {Sitio 1} - 8 sitios
    ├── {Sitio 2}
    └── ...
```

### 2. Nivel de Sitio (Medio Nivel)
```
{Directorio Sitio}  # Ej. /cms-nuevos/sites/diarioexpress/
├── wrangler.toml           # Configuración Cloudflare Pages
├── components.js           # Componentes reutilizables
├── index.html             # Página principal
├── style.css              # Estilos base
├── script.js              # Lógica cliente
├── _redirects             # Reglas de redirección
├── assets/                # Recursos estáticos
├── articulo/              # Páginas de artículos
├── categoria/             # Páginas de categorías
└── admin/                 # Panel de administración
```

### 3. Nivel de Contenido (Bajo Nivel)
```
Contenido Dinámico (proveniente de APIs)
├── Artículos procesados por IA
├── Imágenes generadas/cacheadas en R2
├── Datos de ticker (finanzas, clima)
└── Feeds RSS actualizados
```

---

## Requisitos de Integración Automática

### 1. Conexión API con CMS
Cada sitio nuevo debe poder consumir la API del CMS correspondiente:
- URL base: `https://cms-{nombre}.sebastianvernis.workers.dev/api/`
- Endpoints típicos:
  - `/api/articles` - Artículos del sitio
  - `/api/ticker/headlines` - Noticias para ticker
  - `/api/ticker/financials` - Datos financieros
  - `/api/weather` - Datos meteorológicos

### 2. Configuración de Variables
Variables de entorno requeridas en wrangler.toml:
```toml
name = "{nombre-sitio}"
pages_build_output_dir = "."
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "news_db_cms_{nombre-cms}"  # Ajustar según CMS
database_id = "{uuid-db}"
```

### 3. Configuración de Enrutamiento
Reglas de enrutamiento en `_redirects`:
```
/* /index.html 200
/articulo/* /articulo/index.html 200
/categoria/* /categoria/index.html 200
```

---

## Categorías Estándar

### Categorías Disponibles
1. **Nacional** - Noticias del país
2. **Política** - Asuntos políticos
3. **Economía** - Mercados y economía
4. **Deportes** - Noticias deportivas
5. **Cultura** - Arte y cultura
6. **Tecnología** - Innovación tech
7. **Internacional** - Noticias globales
8. **Salud** - Temas médicos
9. **Ciencia** - Descubrimientos científicos
10. **Opinión** - Columnas y editoriales

---

## Recursos Compartidos

### Assets Comunes
- Logos estándar (SVG, PNG, ICO)
- Tipografías preconfiguradas
- Paletas de colores por defecto
- Componentes CSS reutilizables

### Scripts Compartidos
- `components.js` - Componentes UI comunes
- Scripts de analytics
- Scripts de optimización
- Scripts de accesibilidad

---

## Consideraciones Técnicas

### 1. Performance
- Carga diferida de imágenes
- Optimización de recursos estáticos
- Implementación de Service Workers
- Uso eficiente de caché KV

### 2. SEO
- Etiquetas meta dinámicas
- Estructura de URLs amigable
- Generación de sitemaps
- Optimización de carga

### 3. Seguridad
- Validación de entradas
- Protección contra XSS
- Headers de seguridad HTTP
- CORS configurado apropiadamente

---

## Checklist de Validación

### Pre-despliegue
- [ ] Directorio de sitio creado correctamente
- [ ] Archivos base copiados y personalizados
- [ ] Configuración de wrangler.toml válida
- [ ] Conexión API con CMS probada
- [ ] Componentes inyectados correctamente
- [ ] Estilos aplicados de forma consistente

### Post-despliegue
- [ ] Sitio accesible públicamente
- [ ] Contenido dinámico cargando correctamente
- [ ] Todas las secciones visibles y funcionales
- [ ] Links internos redirigiendo adecuadamente
- [ ] Integración con panel CMS verificada
- [ ] Monitoreo activo del sitio
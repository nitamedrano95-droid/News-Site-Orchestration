// ============================================
// D1 REST Worker - Con soporte multi-DB INSERT
// ============================================

// Auth helper — compara contra SECRET (Cloudflare Secrets)
function checkAuth(request, env) {
    const authHeader = request.headers.get("Authorization") || "";
    const apiKey = request.headers.get("X-API-Key") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "") || apiKey;
    return token === (env.SECRET || "");
}

// ── Mapa sitios → DB binding ──────────────────────────────────────────────────
// Se extrae de los wrangler.toml de cada CMS para tener el mapeo preciso.
const SITE_TO_DB = {
    // cms-originaux (DB binding = "DB", database_id = f9012ebc-...)
    bitacoraurbana: "DB",
    cbnnoticias: "DB",
    centralmexico: "DB",
    mexicoinformado: "DB",
    nodoinformativo: "DB",
    noticiasobjetivo: "DB",
    radiocinconoticias: "DB",
    reportecentralmx: "DB",
    tvmexico: "DB",
    verticenoticias: "DB",
    // cms-nuevos2 (binding = "nuevo2", database_id = e3d0d028-...)
    alavistanoticias: "nuevo2",
    breakingcentermexico: "nuevo2",
    centronews: "nuevo2",
    noticias123: "nuevo2",
    noticiasintegra: "nuevo2",
    radioabc: "nuevo2",
    socialmexiconews: "nuevo2",
    tmznews: "nuevo2",
    // cms-nuevos3 (binding = "nuevo3", database_id = 18583adc-...)
    actualidadsinfronteras: "nuevo3",
    adnmexicano: "nuevo3",
    aztecamexiconoticias: "nuevo3",
    diariomexicano: "nuevo3",
    diariomexico: "nuevo3",
    elanalisismexicano: "nuevo3",
    elobservadorrepublicano: "nuevo3",
    elprofetamexicano: "nuevo3",
    enfoquemexicano: "nuevo3",
    expresomexicano: "nuevo3",
    financemarketsmx: "nuevo3",
    mexicannewsoftheworld: "nuevo3",
    mexicoandtheworld: "nuevo3",
    mexicodaily: "nuevo3",
    mexicoenresumen: "nuevo3",
    mexicoplus: "nuevo3",
    monitorrepublicano: "nuevo3",
    nacionalinstante: "nuevo3",
    noticiasalinstante: "nuevo3",
    perspectivamexicana: "nuevo3",
    politicasalvajealminuto: "nuevo3",
    pulsorepublicanonoticias: "nuevo3",
    radioredmx: "nuevo3",
    republicamx: "nuevo3",
    wenewsmexico: "nuevo3",
    // cms-nuevos (binding = "nuevos", database_id = f96cb9d4-...)
    boominformativo: "nuevos",
    capitalpress: "nuevos",
    diarioexpress: "nuevos",
    elpulsomexicano: "nuevos",
    enfoquecapital: "nuevos",
    enfoquedirecto: "nuevos",
    formulacdmx: "nuevos",
    mexicantimes: "nuevos",
    mexico360noticias: "nuevos",
    mradio: "nuevos",
    noticiashorizonte: "nuevos",
    pulsodiario: "nuevos",
    puntoclave: "nuevos",
    puntonoticias: "nuevos",
    radarinformativo: "nuevos",
    reportediario: "nuevos",
    televisionabc: "nuevos",
    // cms-nuevos4 (binding = "nuevo4", database_id = a3643283-...)
    cronicanacionalmx: "nuevo4",
    reportedevanguardia: "nuevo4",
    impactodiariomexico: "nuevo4",
    bitacorainformativa: "nuevo4",
    visionnacionalnoticias: "nuevo4",
    contextomexicano: "nuevo4",
    focoinformativomx: "nuevo4",
    prensaciudadana: "nuevo4",
    diarioglobalmexico: "nuevo4",
    sintesisinformativa: "nuevo4",
    rutanacionalnoticias: "nuevo4",
    codigomexico: "nuevo4",
    planacentral: "nuevo4",
    horizonteinformativo: "nuevo4",
    noticiasdeldiamx: "nuevo4",
    radarnacional: "nuevo4",
    expresodemexico: "nuevo4",
    puntocriticonoticias: "nuevo4",
    espectromexicano: "nuevo4",
    referenteinformativo: "nuevo4",
    diariodelarepublica: "nuevo4",
    nexoinformativo: "nuevo4",
    sintagmanacional: "nuevo4",
    enlacediariomexico: "nuevo4",
    frenteinformativo: "nuevo4",
};

const AVAILABLE_DBS = ["DB", "nuevo2", "nuevo3", "nuevos", "nuevo4"];

// ── Normalizador de fechas ────────────────────────────────────────────────────
// Convierte fechas de cualquier formato al estándar SQLite: YYYY-MM-DD HH:MM:SS
// Maneja: ISO 8601, Unix timestamp (seg y ms), formatos variados.
// Preserva: datetime('now') y funciones SQL intactas.
function normalizeDate(str) {
    const s = String(str).trim();
    if (!s) return s;

    // Ya está en formato SQLite correcto
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) return s;

    // ISO 8601: 2026-06-06T07:30:00.000Z o 2026-06-06T07:30:00Z
    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/);
    if (isoMatch) {
        const [, y, mo, d, h, mi, se] = isoMatch;
        return `${y}-${mo}-${d} ${h}:${mi}:${se}`;
    }

    // Solo fecha: 2026-06-06 → agregar medianoche
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s} 00:00:00`;

    // Unix timestamp en milisegundos
    const ms = Number(s);
    if (!isNaN(ms) && ms > 1e12) {
        return new Date(ms).toISOString().replace("T", " ").replace("Z", "").slice(0, 19);
    }

    // Unix timestamp en segundos
    const sec = Number(s);
    if (!isNaN(sec) && sec > 1e9) {
        return new Date(sec * 1000).toISOString().replace("T", " ").replace("Z", "").slice(0, 19);
    }

    // Generic parse fallback
    const d2 = new Date(s);
    if (!isNaN(d2.getTime())) {
        return d2.toISOString().replace("T", " ").replace("Z", "").slice(0, 19);
    }

    return s; // No se pudo parsear, devolver original
}

// Normaliza todos los valores de fecha inline en un SQL.
// Busca strings entre comillas simples que parezcan fechas/timestamps.
function normalizeSQLDates(sql) {
    return sql.replace(/'([^']+)'/g, (match, val) => {
        const normalized = normalizeDate(val);
        return normalized !== val ? `'${normalized}'` : match;
    });
}

// Normalizar fechas en valores de INSERT/UPDATE (columnas de fecha conocidas)
function normalizeRecordDates(recordData) {
    const dateColumns = [
        "FECHA_ASIGNACION", "FB_FECHA", "FECHA_PUBLICACION",
        "FECHA_CREACION", "FECHA_ACTUALIZACION", "FECHA",
    ];
    const normalized = { ...recordData };
    for (const col of dateColumns) {
        if (col in normalized && normalized[col] !== null && normalized[col] !== undefined) {
            normalized[col] = normalizeDate(String(normalized[col]));
        }
    }
    return normalized;
}

// Auto-genera ID si la columna ID no está en el INSERT del batch.
// Maneja INSERT INTO ... (cols) VALUES (...) e INSERT INTO ... (cols) SELECT ...
function ensureIdInBatchSQL(sql, params) {
    const match = sql.match(/INSERT\s+INTO\s+\S+\s*\(([^)]+)\)\s*(VALUES|SELECT)\s*/i);
    if (!match) return { sql, params };

    const columns = match[1].split(',').map(c => c.trim().toUpperCase());
    const idIdx = columns.indexOf('ID');

    if (idIdx !== -1) {
        // ID existe en columnas pero el valor es null/vacío → generar UUID
        if (params[idIdx] == null || params[idIdx] === '') {
            const p = [...params];
            p[idIdx] = crypto.randomUUID();
            return { sql, params: p };
        }
        return { sql, params };
    }

    // ID no está en columnas → agregarlo
    const uuid = crypto.randomUUID();

    // Insertar ID al inicio de la lista de columnas
    let newSql = sql.replace(/^(\s*INSERT\s+INTO\s+\S+\s*\()/i, '$1ID, ');

    // Insertar ? al inicio de VALUES o SELECT
    if (/VALUES\s*\(/i.test(newSql)) {
        newSql = newSql.replace(/(VALUES\s*\()/i, '$1?, ');
    } else if (/SELECT\s/i.test(newSql)) {
        newSql = newSql.replace(/(SELECT\s)/i, '$1?, ');
    }

    return { sql: newSql, params: [uuid, ...params] };
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // CORS headers
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        };

        if (method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            // ======= NUEVO ENDPOINT: /insert =======
            if (path === "/insert" && method === "POST") {
                const body = await request.json();
                const { table, databases, data } = body;

                // Validaciones
                if (!table) {
                    return new Response(
                        JSON.stringify({ error: 'Falta campo "table"' }),
                        {
                            status: 400,
                            headers: {
                                ...corsHeaders,
                                "Content-Type": "application/json",
                            },
                        },
                    );
                }
                if (
                    !data || typeof data !== "object" ||
                    Object.keys(data).length === 0
                ) {
                    return new Response(
                        JSON.stringify({
                            error: 'Falta campo "data" o está vacío',
                        }),
                        {
                            status: 400,
                            headers: {
                                ...corsHeaders,
                                "Content-Type": "application/json",
                            },
                        },
                    );
                }

                // Determinar en qué DBs insertar
                const availableDBs = ["DB", "nuevo2", "nuevo3", "nuevos", "nuevo4"];
                let targetDBs;
                
                // Si viene 'database' (singular), usa esa sola
                if (body.database && availableDBs.includes(body.database)) {
                    targetDBs = [body.database];
                } else {
                    targetDBs =
                        databases && Array.isArray(databases) &&
                            databases.length > 0
                            ? databases.filter((db) => availableDBs.includes(db))
                            : availableDBs;
                }

                if (targetDBs.length === 0) {
                    return new Response(
                        JSON.stringify({
                            error: "No se especificaron databases válidas",
                        }),
                        {
                            status: 400,
                            headers: {
                                ...corsHeaders,
                                "Content-Type": "application/json",
                            },
                        },
                    );
                }

                // Normalizar fechas en valores de INSERT/UPDATE (columnas de fecha conocidas)
                const recordData = normalizeRecordDates({ ...data });
                if (!recordData.ID) {
                    recordData.ID = crypto.randomUUID();
                }

                // Construir query INSERT dinámico
                const columns = Object.keys(recordData);
                const placeholders = columns.map(() => "?").join(", ");
                const sql = `INSERT INTO ${table} (${
                    columns.join(", ")
                }) VALUES (${placeholders})`;
                const values = columns.map((col) => recordData[col]);

                // Ejecutar en paralelo en todas las DBs
                const results = await Promise.allSettled(
                    targetDBs.map(async (dbName) => {
                        const db = env[dbName];
                        if (!db) {
                            throw new Error(`Binding ${dbName} no encontrado`);
                        }

                        const stmt = db.prepare(sql).bind(...values);
                        const result = await stmt.run();

                        return {
                            database: dbName,
                            success: true,
                            meta: result.meta,
                            results: result.results,
                        };
                    }),
                );

                // Formatear respuesta
                const dbResults = results.map((r) => ({
                    database: r.reason?.database || r.value?.database,
                    success: r.status === "fulfilled",
                    ...(r.status === "fulfilled"
                        ? r.value
                        : { error: r.reason.message }),
                }));

                const response = {
                    success: dbResults.some((r) => r.success),
                    query: sql,
                    params: values,
                    insertedId: recordData.ID,
                    databases: dbResults,
                };

                return new Response(JSON.stringify(response, null, 2), {
                    status: 200,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                });
            }

            // ======= ENDPOINT: /batch-insert =======
            // Formato n8n: { "batch": [{ "sql": "...", "params": [...] }] }
            // Soporta templating: ARTICULOS_SITIO_{{ $json.SITIO_DESTINO.toUpperCase() }}
            // Params: valores n8n resueltos (strings, números, nulls)
            // SITIO_DESTINO se extrae del SQL para auto-detectar la DB target.
            if (path === "/batch-insert" && method === "POST") {
                const body = await request.json();
                const { batch } = body;

                if (!batch || !Array.isArray(batch) || batch.length === 0) {
                    return new Response(
                        JSON.stringify({ error: 'Falta campo "batch" o está vacío' }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
                    );
                }

                // Extraer sitio(s) del SQL y hacer map → DB
                const siteMatches = [];
                for (const item of batch) {
                    const match = item.sql.match(/ARTICULOS_SITIO_([A-Z0-9_]+)/i);
                    if (match) {
                        const siteSlug = match[1].toLowerCase();
                        siteMatches.push(siteSlug);
                    }
                }

                if (siteMatches.length === 0) {
                    return new Response(
                        JSON.stringify({ error: "No se detectó ninguna tabla ARTICULOS_SITIO_* en el SQL" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
                    );
                }

                // Obtener las DBs únicas que corresponden
                const uniqueSites = [...new Set(siteMatches)];
                const targetDBs = uniqueSites
                    .map((s) => SITE_TO_DB[s])
                    .filter(Boolean);

                if (targetDBs.length === 0) {
                    return new Response(
                        JSON.stringify({ error: `Sitios no encontrados en mapa: ${uniqueSites.join(", ")}` }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
                    );
                }

                // Deduplicar DBs
                const uniqueDBs = [...new Set(targetDBs)];

                // Ejecutar cada statement del batch en la(s) DB(s) correspondientes
                const results = await Promise.allSettled(
                    batch.map(async (item) => {
                        const { sql, params = [] } = item;
                        // Detectar sitio del statement actual
                        const stmtMatch = sql.match(/ARTICULOS_SITIO_([A-Z0-9_]+)/i);
                        const siteSlug = stmtMatch ? stmtMatch[1].toLowerCase() : null;
                        const dbName = siteSlug ? (SITE_TO_DB[siteSlug] || uniqueDBs[0]) : uniqueDBs[0];
                        const db = env[dbName];

                        if (!db) throw new Error(`Binding ${dbName} no encontrado`);

                        // Normalizar fechas en el SQL antes de ejecutar
                        const normalizedSQL = normalizeSQLDates(sql);

                        // Auto-generar ID si no viene explícita en el INSERT
                        const { sql: idSQL, params: idParams } = ensureIdInBatchSQL(normalizedSQL, params);

                        // Ejecutar con bind directo (n8n ya resolvió los params)
                        const stmt = db.prepare(idSQL);
                        const bound = idParams.length > 0 ? stmt.bind(...idParams) : stmt;
                        const result = await bound.run();

                        return {
                            database: dbName,
                            success: true,
                            meta: result.meta,
                            sqlNormalized: normalizedSQL !== sql,
                        };
                    }),
                );

                const dbResults = results.map((r, i) => ({
                    success: r.status === "fulfilled",
                    ...(r.status === "fulfilled"
                        ? r.value
                        : { error: r.reason?.message || String(r.reason) }),
                }));

                return new Response(
                    JSON.stringify({
                        success: dbResults.some((r) => r.success),
                        batchCount: batch.length,
                        sitesDetected: uniqueSites,
                        databases: uniqueDBs,
                        results: dbResults,
                    }, null, 2),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
                );
            }

            // ======= ENDPOINT EXISTENTE: /query =======
            if (path === "/query" && method === "POST") {
                if (!checkAuth(request, env)) {
                    return new Response(
                        JSON.stringify({ error: "Unauthorized" }),
                        {
                            status: 401,
                            headers: {
                                ...corsHeaders,
                                "Content-Type": "application/json",
                            },
                        },
                    );
                }

                const { query, params, databases } = await request.json();
                
                // Si viene databases, ejecutar en todas; sino solo en DB
                const availableDBs = ["DB", "nuevo2", "nuevo3", "nuevos"];
                const targetDBs =
                    databases && Array.isArray(databases) &&
                        databases.length > 0
                        ? databases.filter((db) => availableDBs.includes(db))
                        : ["DB"];

                if (targetDBs.length === 1) {
                    const db = env[targetDBs[0]];
                    let stmt = db.prepare(query);
                    if (params) stmt = stmt.bind(...params);
                    const result = await stmt.all();
                    return new Response(JSON.stringify(result), {
                        headers: {
                            ...corsHeaders,
                            "Content-Type": "application/json",
                        },
                    });
                }

                // Multi-DB query
                const results = await Promise.allSettled(
                    targetDBs.map(async (dbName) => {
                        const db = env[dbName];
                        if (!db) throw new Error(`Binding ${dbName} no encontrado`);
                        let stmt = db.prepare(query);
                        if (params) stmt = stmt.bind(...params);
                        const result = await stmt.all();
                        return { database: dbName, ...result };
                    }),
                );

                const response = results.map((r) =>
                    r.status === "fulfilled"
                        ? { success: true, ...r.value }
                        : { success: false, database: r.reason?.database, error: r.reason.message }
                );

                return new Response(JSON.stringify(response), {
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                });
            }

            // ======= ENDPOINT EXISTENTE: /rest/* =======
            if (path.startsWith("/rest/")) {
                const tableName = path.split("/rest/")[1]?.split("/")[0];
                if (!tableName) {
                    return new Response(
                        JSON.stringify({ error: "Table name required" }),
                        {
                            status: 400,
                            headers: {
                                ...corsHeaders,
                                "Content-Type": "application/json",
                            },
                        },
                    );
                }

                const db = env.DB;

                if (method === "GET") {
                    // Paginación: ?limit=100&offset=0 (default limit=100, max=500)
                    const limitParam = parseInt(url.searchParams.get("limit") || "100", 10);
                    const offsetParam = parseInt(url.searchParams.get("offset") || "0", 10);
                    const limit = Math.min(Math.max(limitParam, 1), 500);
                    const offset = Math.max(offsetParam, 0);

                    const { results } = await db.prepare(
                        `SELECT * FROM ${tableName} LIMIT ? OFFSET ?`,
                    ).bind(limit, offset).all();

                    return new Response(JSON.stringify({
                        results,
                        pagination: { limit, offset, hasMore: results.length === limit },
                    }), {
                        headers: {
                            ...corsHeaders,
                            "Content-Type": "application/json",
                        },
                    });
                }

                if (method === "POST") {
                    const body = await request.json();
                    const columns = Object.keys(body);
                    const placeholders = columns.map(() => "?").join(", ");
                    const sql = `INSERT INTO ${tableName} (${
                        columns.join(", ")
                    }) VALUES (${placeholders})`;
                    const values = columns.map((col) => body[col]);

                    const result = await db.prepare(sql).bind(...values).run();
                    return new Response(
                        JSON.stringify({
                            success: true,
                            id: result.meta?.last_row_id,
                            changes: result.meta?.changes,
                        }),
                        {
                            headers: {
                                ...corsHeaders,
                                "Content-Type": "application/json",
                            },
                        },
                    );
                }

                if (method === "PUT") {
                    const id = path.split("/").pop();
                    const body = await request.json();
                    const sets = Object.keys(body).map((k) => `${k} = ?`).join(
                        ", ",
                    );
                    const values = [...Object.values(body), id];
                    const sql = `UPDATE ${tableName} SET ${sets} WHERE ID = ?`;

                    const result = await db.prepare(sql).bind(...values).run();
                    return new Response(
                        JSON.stringify({
                            success: true,
                            changes: result.meta?.changes,
                        }),
                        {
                            headers: {
                                ...corsHeaders,
                                "Content-Type": "application/json",
                            },
                        },
                    );
                }

                if (method === "DELETE") {
                    const id = path.split("/").pop();
                    const result = await db.prepare(
                        `DELETE FROM ${tableName} WHERE ID = ?`,
                    ).bind(id).run();
                    return new Response(
                        JSON.stringify({
                            success: true,
                            changes: result.meta?.changes,
                        }),
                        {
                            headers: {
                                ...corsHeaders,
                                "Content-Type": "application/json",
                            },
                        },
                    );
                }
            }

            // ======= Health check =======
            if (path === "/health") {
                return new Response(
                    JSON.stringify({
                        status: "ok",
                        timestamp: new Date().toISOString(),
                    }),
                    {
                        headers: {
                            ...corsHeaders,
                            "Content-Type": "application/json",
                        },
                    },
                );
            }

            return new Response(JSON.stringify({ error: "Not found" }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
    },
};

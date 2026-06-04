// ============================================
// D1 REST Worker - Con soporte multi-DB INSERT
// ============================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ======= NUEVO ENDPOINT: /insert =======
      if (path === '/insert' && method === 'POST') {

        const body = await request.json();
        const { table, databases, data } = body;

        // Validaciones
        if (!table) {
          return new Response(JSON.stringify({ error: 'Falta campo "table"' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
          return new Response(JSON.stringify({ error: 'Falta campo "data" o está vacío' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Determinar en qué DBs insertar
        const availableDBs = ['DB', 'nuevo2', 'nuevo3'];
        const targetDBs = databases && Array.isArray(databases) && databases.length > 0
          ? databases.filter(db => availableDBs.includes(db))
          : availableDBs;

        if (targetDBs.length === 0) {
          return new Response(JSON.stringify({ error: 'No se especificaron databases válidas' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Generar UUID para ID si no viene
        const uuid = () => crypto.randomUUID();
        const recordData = { ...data };
        if (!recordData.ID) {
          recordData.ID = uuid();
        }

        // Construir query INSERT dinámico
        const columns = Object.keys(recordData);
        const placeholders = columns.map(() => '?').join(', ');
        const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
        const values = columns.map(col => recordData[col]);

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
          })
        );

        // Formatear respuesta
        const response = {
          success: true,
          query: sql,
          params: values,
          insertedId: recordData.ID,
          databases: results.map(r => ({
            database: r.reason?.database || r.value?.database,
            success: r.status === 'fulfilled',
            ...(r.status === 'fulfilled' ? r.value : { error: r.reason.message }),
          })),
        };

        return new Response(JSON.stringify(response, null, 2), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ======= ENDPOINT EXISTENTE: /query =======
      if (path === '/query' && method === 'POST') {
        if (!checkAuth(request)) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { query, params } = await request.json();
        const db = env.DB;
        let stmt = db.prepare(query);
        if (params) stmt = stmt.bind(...params);
        const result = await stmt.all();

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ======= ENDPOINT EXISTENTE: /rest/* =======
      if (path.startsWith('/rest/')) {
        if (!checkAuth(request)) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const tableName = path.split('/rest/')[1]?.split('/')[0];
        if (!tableName) {
          return new Response(JSON.stringify({ error: 'Table name required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const db = env.DB;

        if (method === 'GET') {
          const { results } = await db.prepare(`SELECT * FROM ${tableName}`).all();
          return new Response(JSON.stringify(results), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (method === 'POST') {
          const body = await request.json();
          const columns = Object.keys(body);
          const placeholders = columns.map(() => '?').join(', ');
          const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
          const values = columns.map(col => body[col]);

          const result = await db.prepare(sql).bind(...values).run();
          return new Response(JSON.stringify({
            success: true,
            id: result.meta?.last_row_id,
            changes: result.meta?.changes,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (method === 'PUT') {
          const id = path.split('/').pop();
          const body = await request.json();
          const sets = Object.keys(body).map(k => `${k} = ?`).join(', ');
          const values = [...Object.values(body), id];
          const sql = `UPDATE ${tableName} SET ${sets} WHERE ID = ?`;

          const result = await db.prepare(sql).bind(...values).run();
          return new Response(JSON.stringify({
            success: true,
            changes: result.meta?.changes,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (method === 'DELETE') {
          const id = path.split('/').pop();
          const result = await db.prepare(`DELETE FROM ${tableName} WHERE ID = ?`).bind(id).run();
          return new Response(JSON.stringify({
            success: true,
            changes: result.meta?.changes,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // ======= Health check =======
      if (path === '/health') {
        return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

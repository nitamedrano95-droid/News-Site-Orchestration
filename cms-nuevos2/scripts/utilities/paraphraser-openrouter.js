/**
 * Módulo de Parafraseo con Ollama Cloud
 * Usa Kimi K2.6 para parafrasear noticias (256K ctx, mejor redaccion editorial en espanol)
 *
 * NOTA: Este archivo historicamente se llamaba paraphraser-openrouter.js y
 * usaba Arcee Trinity Large. Migrado a Ollama Cloud en jun 2026. Se conserva
 * el nombre del archivo para no romper imports; el provider real se selecciona
 * por env (OLLAMA_API_KEY, OLLAMA_PARAPHRASE_MODEL).
 */

const OLLAMA_API_URL = 'https://ollama.com/api/chat';
const MODEL = process.env.OLLAMA_PARAPHRASE_MODEL || 'kimi-k2.6:cloud';

class OllamaParaphraser {
  constructor(apiKey = null) {
    this.apiKey = apiKey || process.env.OLLAMA_API_KEY;
    if (!this.apiKey) {
      console.warn('⚠️ OLLAMA_API_KEY no configurada. El parafraseo usará modo simulado.');
    }
  }

  /**
   * Parafrasea un artículo completo usando Ollama Cloud (Kimi K2.6)
   */
  async paraphraseArticle(title, content, category) {
    // Si no hay API key, usar modo simulado
    if (!this.apiKey) {
      console.log('   ⚠️  Usando parafraseo simulado (sin API key)');
      return this.simulatedParaphrase(title, content);
    }

    try {
      console.log(`   🤖 Llamando a Ollama Cloud (${MODEL})...`);

      // Prompt optimizado para parafraseo de noticias
      const prompt = this.buildParaphrasePrompt(title, content, category);

      const response = await fetch(OLLAMA_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'system',
              content: `Eres un periodista profesional mexicano experto en parafrasear noticias.
Tu tarea es reescribir artículos manteniendo todos los hechos y datos importantes, pero usando:
- Estructura completamente diferente
- Sinónimos apropiados
- Estilo periodístico formal
- Lenguaje natural y fluido
- Evitar plagio manteniendo la información factual

IMPORTANTE:
- Mantén todas las fechas, nombres, cifras y datos exactos
- No inventes información nueva
- No cambies el significado de las declaraciones
- Usa español mexicano neutral`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          stream: false,
          think: false,
          options: {
            temperature: 0.7,
            num_predict: 4000,
          }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const paraphrasedText = data?.message?.content;

      if (!paraphrasedText) {
        throw new Error('Respuesta vacía de Ollama');
      }

      // Parsear la respuesta
      return this.parseParaphrasedResponse(paraphrasedText, title);

    } catch (error) {
      console.error('   ❌ Error en parafraseo:', error.message);
      console.log('   ⚠️  Fallback a parafraseo simulado');
      return this.simulatedParaphrase(title, content);
    }
  }

  /**
   * Construye el prompt para el modelo
   */
  buildParaphrasePrompt(title, content, category) {
    return `PARAFRASEA EL SIGUIENTE ARTÍCULO DE NOTICIAS

CATEGORÍA: ${category || 'General'}

TÍTULO ORIGINAL:
${title}

CONTENIDO ORIGINAL:
${content}

INSTRUCCIONES:
1. Escribe un NUEVO TÍTULO atractivo y diferente al original
2. Parafrasea el contenido completo manteniendo todos los hechos
3. Usa estructura de pirámide invertida (lo más importante primero)
4. Incluye entradilla o lead informativo
5. Desarrolla el cuerpo con detalles y contexto
6. Mantén todas las citas, fechas, nombres y cifras exactas

FORMATO DE RESPUESTA:
TITULO_PARAFRASEADO: [nuevo título]

CONTENIDO_PARAFRASEADO:
[contenido parafraseado completo, mínimo 500 palabras]

EXTRACTO:
[resumen de 1-2 oraciones]`;

  }

  /**
   * Parsea la respuesta del modelo
   */
  parseParaphrasedResponse(text, originalTitle) {
    // Extraer título
    const titleMatch = text.match(/TITULO_PARAFRASEADO:\s*(.+?)(?=\n|$)/i);
    const title = titleMatch ? titleMatch[1].trim() : originalTitle;

    // Extraer contenido
    const contentMatch = text.match(/CONTENIDO_PARAFRASEADO:\s*([\s\S]+?)(?=EXTRACTO:|$)/i);
    let content = contentMatch ? contentMatch[1].trim() : text;

    // Extraer extracto
    const excerptMatch = text.match(/EXTRACTO:\s*(.+?)(?=\n|$)/i);
    let excerpt = excerptMatch ? excerptMatch[1].trim() : '';

    // Si no hay extracto, generar del contenido
    if (!excerpt && content) {
      excerpt = content.substring(0, 200).replace(/[^\w\s]/g, '') + '...';
    }

    // Limpiar el contenido
    content = this.cleanContent(content);

    return {
      title,
      content,
      excerpt,
      wordCount: content.split(/\s+/).length
    };
  }

  /**
   * Limpia el contenido parafraseado
   */
  cleanContent(text) {
    return text
      .replace(/TITULO_PARAFRASEADO:/gi, '')
      .replace(/CONTENIDO_PARAFRASEADO:/gi, '')
      .replace(/EXTRACTO:/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Parafraseo simulado (fallback)
   */
  simulatedParaphrase(title, content) {
    console.log('   📝 Aplicando parafraseo básico...');
    
    // Variaciones simples del título
    const prefixes = ['Reporte:', 'Análisis:', 'Actualización:', ''];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    
    const paraphrasedTitle = prefix ? `${prefix} ${title}` : title;

    // Reestructurar párrafos
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 50);
    
    if (paragraphs.length > 2) {
      // Mover el segundo párrafo al final para variar estructura
      const [first, second, ...rest] = paragraphs;
      const reordered = [first, ...rest, second];
      content = reordered.join('\n\n');
    }

    // Generar extracto
    const excerpt = content.substring(0, 200).replace(/[^\w\s]/g, '') + '...';

    return {
      title: paraphrasedTitle,
      content,
      excerpt,
      wordCount: content.split(/\s+/).length,
      simulated: true
    };
  }

  /**
   * Parafraseo por lotes (batch)
   */
  async paraphraseBatch(articles, delayMs = 1000) {
    const results = [];
    
    for (const article of articles) {
      try {
        console.log(`\n📝 Parafraseando: ${article.title?.substring(0, 60)}...`);
        
        const paraphrased = await this.paraphraseArticle(
          article.title,
          article.content,
          article.category
        );

        results.push({
          ...article,
          title: paraphrased.title,
          content: paraphrased.content,
          excerpt: paraphrased.excerpt,
          wordCount: paraphrased.wordCount,
          paraphrasedAt: new Date().toISOString(),
          model: paraphrased.simulated ? 'simulated' : MODEL
        });

        // Delay entre llamadas para rate limiting
        if (delayMs > 0) {
          await this.delay(delayMs);
        }

      } catch (error) {
        console.error(`   ❌ Error parafraseando "${article.title}":`, error.message);
        results.push({
          ...article,
          paraphraseError: error.message
        });
      }
    }

    return results;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Exportar para uso en otros módulos
module.exports = { OllamaParaphraser };

// Ejemplo de uso directo
if (require.main === module) {
  async function test() {
    const paraphraser = new OllamaParaphraser();
    
    const testArticle = {
      title: "México anuncia nuevo plan de infraestructura",
      content: "El gobierno mexicano anunció hoy un ambicioso plan de infraestructura por valor de 500 mil millones de pesos. El proyecto incluye la construcción de nuevas carreteras, puentes y sistemas de transporte público en todo el país. Se espera que el plan genere más de 2 millones de empleos directos e indirectos.",
      category: "nacional"
    };

    const result = await paraphraser.paraphraseArticle(
      testArticle.title,
      testArticle.content,
      testArticle.category
    );

    console.log('\n✅ Resultado:');
    console.log('Título:', result.title);
    console.log('Palabras:', result.wordCount);
    console.log('Extracto:', result.excerpt);
  }

  test().catch(console.error);
}

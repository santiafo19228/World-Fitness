export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { image } = req.body;

  if (!image || typeof image !== "string") {
    return res.status(400).json({ error: "Falta la imagen" });
  }

  try {
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.GROQ_API_KEY
      },
      body: JSON.stringify({
        model: "qwen/qwen3.6-27b",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Eres un nutricionista experto. Mira esta foto de comida e identifica que alimento(s) es. Responde UNICAMENTE con un objeto JSON, sin explicaciones antes ni despues, sin usar bloques de codigo con ```, con exactamente estas claves: alimento (texto), porcion_estimada (texto), calorias (numero), proteina_g (numero), carbohidratos_g (numero), grasas_g (numero), comentario (texto corto y motivador). Si no hay comida visible, responde: {\"error\": \"No se detecto comida en la imagen\"}"
              },
              {
                type: "image_url",
                image_url: { url: image }
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    const data = await groqResponse.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    let contenido = data.choices[0].message.content.trim();

    // Limpieza por si el modelo agrega ```json al inicio/final
    contenido = contenido.replace(/```json/gi, "").replace(/```/g, "").trim();

    // Se queda solo con lo que está entre el primer { y el último }
    const inicio = contenido.indexOf("{");
    const fin = contenido.lastIndexOf("}");
    if (inicio !== -1 && fin !== -1) {
      contenido = contenido.substring(inicio, fin + 1);
    }

    let analisis;
    try {
      analisis = JSON.parse(contenido);
    } catch (e) {
      console.error("No se pudo interpretar la respuesta:", contenido);
      return res.status(500).json({ error: "La IA no pudo analizar esta imagen claramente. Intenta con otra foto." });
    }

    return res.status(200).json(analisis);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al analizar la imagen" });
  }
}
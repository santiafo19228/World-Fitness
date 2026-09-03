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
                text: "Mira esta foto de comida. NO expliques tu razonamiento, NO pienses en voz alta, NO uses etiquetas como <think>. Responde INMEDIATAMENTE y UNICAMENTE con un objeto JSON plano (sin bloques de codigo, sin backticks, sin texto antes ni despues) con exactamente estas claves: alimento (texto corto), porcion_estimada (texto corto), calorias (numero entero), proteina_g (numero entero), carbohidratos_g (numero entero), grasas_g (numero entero), comentario (una frase corta y motivadora). Si no reconoces comida en la imagen, responde solo: {\"error\": \"No se detecto comida en la imagen\"}"
              },
              {
                type: "image_url",
                image_url: { url: image }
              }
            ]
          }
        ],
        temperature: 0.2,
        max_tokens: 800,
        reasoning_effort: "none"
      })
    });

    const data = await groqResponse.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    let contenido = data.choices[0].message.content || "";

    // Quita cualquier bloque de "pensamiento" que el modelo haya metido
    contenido = contenido.replace(/<think>[\s\S]*?<\/think>/gi, "");
    contenido = contenido.replace(/```json/gi, "").replace(/```/g, "");
    contenido = contenido.trim();

    // Se queda solo con lo que está entre la PRIMERA { y la ÚLTIMA }
    const inicio = contenido.indexOf("{");
    const fin = contenido.lastIndexOf("}");

    if (inicio === -1 || fin === -1) {
      console.error("Respuesta sin JSON detectable:", contenido);
      return res.status(500).json({ error: "La IA no devolvió un resultado válido. Intenta con otra foto." });
    }

    contenido = contenido.substring(inicio, fin + 1);

    let analisis;
    try {
      analisis = JSON.parse(contenido);
    } catch (e) {
      console.error("JSON invalido recibido:", contenido);
      return res.status(500).json({ error: "La IA no pudo analizar esta imagen claramente. Intenta con otra foto." });
    }

    return res.status(200).json(analisis);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al analizar la imagen" });
  }
}
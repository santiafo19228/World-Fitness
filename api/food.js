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
                text: "Eres un nutricionista experto. Mira esta foto de comida e identifica qué alimento(s) es. Responde SOLO con un objeto JSON válido, sin texto adicional, con este formato exacto: {\"alimento\": \"nombre del plato o alimento\", \"porcion_estimada\": \"ej: 1 plato mediano (~250g)\", \"calorias\": numero, \"proteina_g\": numero, \"carbohidratos_g\": numero, \"grasas_g\": numero, \"comentario\": \"un consejo corto y motivador sobre este alimento\"}. Si no logras identificar comida en la imagen, responde con {\"error\": \"No se detectó comida en la imagen\"}."
              },
              {
                type: "image_url",
                image_url: { url: image }
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" }
      })
    });

    const data = await groqResponse.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const contenido = data.choices[0].message.content;
    const analisis = JSON.parse(contenido);

    return res.status(200).json(analisis);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al analizar la imagen" });
  }
}
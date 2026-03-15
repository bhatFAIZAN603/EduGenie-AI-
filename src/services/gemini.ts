import { GoogleGenAI } from "@google/genai";

function getAI() {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
  return new GoogleGenAI({ apiKey });
}

export async function chatWithAI(message: string, history: any[], model: string = "gemini-3-flash-preview") {
  const ai = getAI();
  const contents = [
    ...history.map(h => ({
      role: h.role,
      parts: h.parts
    })),
    {
      role: "user",
      parts: [{ text: message }]
    }
  ];

  try {
    const config: any = {
      systemInstruction: "You are EduGenie, a helpful AI tutor for students. Explain concepts clearly and encourage curiosity. Use Google Search to provide accurate and up-to-date information.",
    };
    if (model.includes("3.1") || model.includes("3-flash")) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model: model,
      contents,
      config,
    });

    return response.text;
  } catch (e: any) {
    console.error("Chat error", e);
    if (e.message?.includes("429") || e.message?.includes("quota") || e.message?.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("API Quota exceeded. Please go to the About tab and click 'Set Personal API Key' to provide your own API key.");
    }
    throw e;
  }
}

export async function analyzeImage(image: string, prompt: string, model: string = "gemini-3-flash-preview") {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: image.split(",")[1],
              },
            },
          ],
        },
      ],
    });
    return response.text;
  } catch (e: any) {
    console.error("Image analysis error", e);
    if (e.message?.includes("429") || e.message?.includes("quota") || e.message?.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("API Quota exceeded. Please go to the About tab and click 'Set Personal API Key' to provide your own API key.");
    }
    throw e;
  }
}

export async function generateQuiz(topic: string, image?: string, model: string = "gemini-3.1-flash-lite-preview") {
  const ai = getAI();
  const randomFactor = Math.random().toString(36).substring(7);
  const parts: any[] = [
    { text: `Generate a 5-question multiple choice quiz about ${topic || "the provided image"}. 
    IMPORTANT: If this topic has been searched before, provide DIFFERENT questions and focus on different sub-topics to ensure variety.
    Random seed for variety: ${randomFactor}
    Return ONLY a JSON array of objects with the following structure:
    [
      {
        "question": "string",
        "options": ["string", "string", "string", "string"],
        "correctAnswer": "string"
      }
    ]` }
  ];

  if (image) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: image.split(",")[1],
      },
    });
  }

  try {
    const config: any = {
      responseMimeType: "application/json",
    };
    
    if (model.includes("3.1") || model.includes("3-flash")) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts }],
      config
    });

    return JSON.parse(response.text);
  } catch (e: any) {
    console.error("Failed to generate quiz", e);
    if (e.message?.includes("429") || e.message?.includes("quota") || e.message?.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("API Quota exceeded. Please go to the About tab and click 'Set Personal API Key' to provide your own API key.");
    }
    return null;
  }
}

export async function generateFlashcards(topic: string, model: string = "gemini-3.1-flash-lite-preview") {
  const ai = getAI();
  const randomFactor = Math.random().toString(36).substring(7);
  try {
    const config: any = {
      responseMimeType: "application/json",
    };
    if (model.includes("3.1") || model.includes("3-flash")) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: `Explain the topic "${topic}" clearly for a student using the latest information from Google Search. 
      IMPORTANT: If this topic has been searched before, provide DIFFERENT explanations and focus on different sub-topics to ensure variety.
      Random seed for variety: ${randomFactor}
      Then, generate 3 flashcards (question and answer) based on this explanation.
      Return ONLY a JSON object with the following structure:
      {
        "explanation": "string (markdown allowed)",
        "flashcards": [
          {
            "question": "string",
            "answer": "string"
          }
        ]
      }`,
      config
    });

    return JSON.parse(response.text);
  } catch (e: any) {
    console.error("Failed to generate flashcards", e);
    if (e.message?.includes("429") || e.message?.includes("quota") || e.message?.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("API Quota exceeded. Please go to the About tab and click 'Set Personal API Key' to provide your own API key.");
    }
    return null;
  }
}

export async function searchTopic(topic: string, model: string = "gemini-3-flash-preview") {
  const ai = getAI();
  const randomFactor = Math.random().toString(36).substring(7);
  try {
    const config: any = {};
    if (model.includes("3.1") || model.includes("3-flash")) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: `Provide comprehensive study notes for the topic: "${topic}". 
      Use Google Search to include the latest information, diagrams (described in text), and key points.
      IMPORTANT: If this topic has been searched before, provide DIFFERENT notes and focus on different sub-topics to ensure variety.
      Random seed for variety: ${randomFactor}
      Format the response in clear Markdown with sections like "Introduction", "Key Concepts", "Detailed Explanation", and "Summary".`,
      config
    });

    return response.text;
  } catch (e: any) {
    console.error("Search error", e);
    if (e.message?.includes("429") || e.message?.includes("quota") || e.message?.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("API Quota exceeded. Please go to the About tab and click 'Set Personal API Key' to provide your own API key.");
    }
    throw e;
  }
}

export async function getTopicSuggestions(studentClass: string, model: string = "gemini-3.1-flash-lite-preview") {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: `Suggest 5 interesting and relevant study topics for a student in ${studentClass}. 
      Return ONLY a JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text);
  } catch (e: any) {
    console.error("Suggestions error", e);
    return ["Photosynthesis", "Quantum Physics", "World War II", "Algebra Basics", "Cell Biology"];
  }
}

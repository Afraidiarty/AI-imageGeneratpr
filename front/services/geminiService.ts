
import { GoogleGenAI, Modality, Type } from "@google/genai";

// Per coding guidelines, initialize GoogleGenAI directly with process.env.API_KEY
// and assume it is always available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = (base64Data: string, mimeType: string) => {
    return {
        inlineData: {
            data: base64Data.split(',')[1],
            mimeType
        },
    };
};

export const analyzeImage = async (imageData: string, mimeType: string): Promise<string> => {
    const model = 'gemini-2.5-flash';
    const imagePart = fileToGenerativePart(imageData, mimeType);
    const textPart = {
        text: "Analyze this product image. Describe the product in detail, including its main features, materials, color, and potential use cases. Be concise and informative, as if for an e-commerce listing."
    };

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [imagePart, textPart] },
    });

    // Check if the request was blocked.
    if (response.promptFeedback?.blockReason) {
        throw new Error(`Analysis request was blocked due to: ${response.promptFeedback.blockReason}.`);
    }

    const text = response.text;
    if (!text) {
        throw new Error("Analysis failed: The model did not return any text. This could be due to a safety policy or an issue with the image.");
    }
    
    return text;
};

export const analyzeSceneReference = async (imageData: string, mimeType: string): Promise<string> => {
    const model = 'gemini-2.5-flash';
    const imagePart = fileToGenerativePart(imageData, mimeType);
    const textPart = {
        text: "You are an expert creative director. Analyze the provided image and generate a detailed, descriptive prompt for an AI image generator to recreate the scene. Focus exclusively on the background, environment, lighting, mood, style, and composition. Absolutely DO NOT describe any primary subject, person, or product that might be in the foreground. The output should be a single, cohesive paragraph."
    };

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [imagePart, textPart] },
    });

    if (response.promptFeedback?.blockReason) {
        throw new Error(`Scene analysis request was blocked due to: ${response.promptFeedback.blockReason}.`);
    }

    const text = response.text;
    if (!text) {
        throw new Error("Scene analysis failed: The model did not return any text.");
    }
    
    return text.trim();
};

export const generateSceneIdeas = async (productDescription: string): Promise<string[]> => {
    const model = 'gemini-2.5-flash';
    const prompt = `You are an e-commerce creative art director.

Based on the PRODUCT DESCRIPTION, suggest exactly 3 distinct scene ideas that boost CTR and make the photo stand out.

Requirements:
- Each idea under 20 words and descriptive
- Include: setting/background material + lighting mood + 1–2 category-appropriate props.
- Ensure the 3 ideas clearly differ in setting, lighting, and mood
- Choose props/backdrops native to the product

Product Description: "${productDescription}"

Output: Return ONLY a JSON array of 3 strings. No extra text.`;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.STRING
                }
            }
        }
    });
    
    const text = response.text.trim();
    try {
        const ideas = JSON.parse(text);
        if (Array.isArray(ideas) && ideas.every(i => typeof i === 'string')) {
            return ideas;
        }
        throw new Error("Parsed JSON is not an array of strings.");
    } catch(e) {
        console.error("Failed to parse scene ideas:", e);
        throw new Error("Could not get scene ideas from the model.");
    }
};


export const generateOrEditImage = async (
    baseImageData: string,
    mimeType: string,
    prompt: string
): Promise<string> => {
    const model = 'gemini-2.5-flash-image';
    
    const productPart = fileToGenerativePart(baseImageData, mimeType);
    const textPart = { text: prompt };

    const requestParts = [productPart, textPart];

    const response = await ai.models.generateContent({
        model,
        contents: { parts: requestParts },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    // Safely access the image data from the response.
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
        for (const part of parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
    }
    
    // If no image is found, check if the request was blocked.
    if (response.promptFeedback?.blockReason) {
        throw new Error(`Image generation was blocked due to: ${response.promptFeedback.blockReason}. Please adjust your prompt.`);
    }
    
    // Provide a general error if no image is returned for other reasons.
    throw new Error("No image data returned from API. The model may not have been able to generate an image for your prompt.");
};

export const enhancePrompt = async (currentPrompt: string): Promise<string> => {
    const model = 'gemini-2.5-flash';
    const prompt = `You are an expert in product photography and creative writing. Your task is to enhance a simple user-provided prompt for an AI image generator. Make the prompt more vivid, artistic, and detailed. Add suggestions for lighting (e.g., "soft morning light," "dramatic studio lighting"), composition (e.g., "with leading lines," "using the rule of thirds"), and mood (e.g., "a serene and minimalist atmosphere," "a dynamic and energetic feel"). The final prompt should be a single, descriptive paragraph.

Original prompt: "${currentPrompt}"

Enhanced prompt:`;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
    });

    const text = response.text;
    if (!text) {
        throw new Error("Prompt enhancement failed: The model did not return any text.");
    }
    
    return text.trim();
};

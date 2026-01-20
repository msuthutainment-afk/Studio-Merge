
import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedMetadata } from "../types";

export const generateImageMetadata = async (base64Image: string): Promise<GeneratedMetadata> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image.split(',')[1],
          },
        },
        {
          text: "Analyze this image and provide SEO metadata. Suggest a meaningful ALT text, a SEO-optimized filename (without extension), and relevant tags.",
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          altText: { type: Type.STRING },
          suggestedFilename: { type: Type.STRING },
          tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["altText", "suggestedFilename", "tags"]
      }
    }
  });

  return JSON.parse(response.text) as GeneratedMetadata;
};

export const artisticMergeImages = async (
  bgBase64: string, 
  subjectBase64: string, 
  isBlurEnabled: boolean = false
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const effectsPrompt = `
    - BACKGROUND MODIFICATION (SCENE 01): 
      ${isBlurEnabled ? "Apply a fixed 10% blur (subtle professional depth of field) to the background image only." : "Keep the background image perfectly sharp."}
      Do NOT apply any dimming or darkening to the background.
    - SUBJECT INTEGRATION (PHOTO 02): 
      Strictly remove the background from the second image. 
      IMPORTANT: DO NOT change, edit, or filter the look of this second photo. It must remain exactly as uploaded but without its original background.
      Place it as a large foreground element on the left.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: bgBase64.split(',')[1],
          },
        },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: subjectBase64.split(',')[1],
          },
        },
        {
          text: `Artistically merge these two images into a professional 16:9 composition.
          ${effectsPrompt}
          Ensure the final result is high-resolution and perfectly framed at 16:9 aspect ratio.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9"
      }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image data returned from AI");
};

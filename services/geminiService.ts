
import { GoogleGenAI, Modality } from "@google/genai";
import { TRENDING_DATABASE, REACTION_TYPES } from '../constants';
import type { MemeResult, Source } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

// FIX: Removed extra 'new' keyword causing a construct signature error.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function generateViralScenario(): string {
  const categories = Object.keys(TRENDING_DATABASE);
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  const topics = TRENDING_DATABASE[randomCategory];
  const randomTopic = topics[Math.floor(Math.random() * topics.length)];
  const randomReaction = REACTION_TYPES[Math.floor(Math.random() * REACTION_TYPES.length)];

  return `${randomReaction} ${randomTopic}`;
}

async function getRealtimeViralTopic(): Promise<{ topic: string, sources: any[] | undefined }> {
  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Tell me about one recent, funny, or weird trending topic or viral internet event that would make a great meme. Be specific and concise.",
        config: {
            tools: [{googleSearch: {}}],
        },
    });

    const topic = response.text.trim();
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (!topic) {
        throw new Error("AI could not find a trending topic. Please try again.");
    }

    return { topic, sources };
  } catch(error) {
    console.error("Error fetching real-time topic:", error);
    throw new Error("Failed to fetch real-time trends. The classic topics will be used instead.");
  }
}


export async function generateMeme(
  userInputCharacter: string, 
  referenceImage: { mimeType: string; data: string } | null,
  outputStyle: 'one-image' | 'webtoon' | 'contrast',
  useRealtimeTrends: boolean
): Promise<MemeResult> {
  let generatedScenario: string;
  let sources: Source[] | undefined;

  if (useRealtimeTrends && !referenceImage) {
    const realtimeData = await getRealtimeViralTopic();
    const randomReaction = REACTION_TYPES[Math.floor(Math.random() * REACTION_TYPES.length)];
    generatedScenario = `${randomReaction} the news that ${realtimeData.topic}`;
    if (realtimeData.sources) {
        sources = realtimeData.sources
            .map((chunk: any) => ({
                uri: chunk.web?.uri,
                title: chunk.web?.title,
            }))
            .filter(source => source.uri && source.title);
    }
  } else {
    generatedScenario = generateViralScenario();
  }
  
  try {
    if (referenceImage) {
      // Use image editing model when a reference image is provided
      const prompt = `
        Turn this image into a meme.
        Use this character: '${userInputCharacter}'.
        Scenario: The character is ${generatedScenario}.
        Place the character into the image in a funny way, matching the style.
        Add a short, witty speech bubble in English that fits the scene.
        Style: Internet meme, funny, relatable, shareable.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
          parts: [
            { inlineData: { data: referenceImage.data, mimeType: referenceImage.mimeType } },
            { text: prompt },
          ],
        },
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
      });
      
      let imageUrl: string | null = null;
      let text: string | null = null;

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64ImageBytes: string = part.inlineData.data;
          imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
        } else if (part.text) {
          text = part.text.trim().replace(/^"|"$/g, '');
        }
      }

      if (!imageUrl) {
        throw new Error('API did not return an edited image. Please try again.');
      }
      return { imageUrl, text: text || 'Could not generate a witty comment. Please try again!' };
    } else {
      // Use image generation model when no reference image is provided
      let imagePrompt = '';
      let textPrompt = '';
      let aspectRatio: '1:1' | '9:16' | '16:9' = '1:1';

      switch (outputStyle) {
        case 'webtoon':
          imagePrompt = `A 4-panel vertical webtoon comic strip. The character is '${userInputCharacter}'. The scenario is: ${generatedScenario}. The comic should tell a short, funny story ending with a punchline. Style: simple webtoon art, humorous, meme-worthy, easy to read.`;
          textPrompt = `Create a short, witty, and funny caption for a 4-panel webtoon. The meme is about: Character: ${userInputCharacter}, Scenario: ${generatedScenario}. The caption should summarize the joke or be the punchline. Just return the caption text, nothing else.`;
          aspectRatio = '9:16';
          break;
        case 'contrast':
          imagePrompt = `A 2-panel "contrast" meme, like "Expectation vs. Reality" or "My plans vs. 2024". The character is '${userInputCharacter}'. The scenario is: ${generatedScenario}. The two panels should show a funny contrast. Style: internet meme, humorous, relatable.`;
          textPrompt = `Create a short, witty, and funny caption for a 2-panel contrast meme. The meme is about: Character: ${userInputCharacter}, Scenario: ${generatedScenario}. The caption should highlight the contrast. Just return the caption text, nothing else.`;
          aspectRatio = '16:9';
          break;
        case 'one-image':
        default:
          imagePrompt = `A meme of '${userInputCharacter}' ${generatedScenario}. Style: Internet meme, funny, relatable, shareable, high quality digital art.`;
          textPrompt = `Create a short, witty, and funny caption for a meme. The meme is about: Character: ${userInputCharacter}, Scenario: ${generatedScenario}. The caption should be in English and suitable for a speech bubble. Make it impactful and viral-worthy. Example: "Is this... for real?". Just return the caption text, nothing else.`;
          aspectRatio = '1:1';
          break;
      }

      const [imageResponse, textResponse] = await Promise.all([
        ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: imagePrompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: aspectRatio,
          },
        }),
        ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: textPrompt,
        })
      ]);
      
      if (!imageResponse.generatedImages || imageResponse.generatedImages.length === 0 || !imageResponse.generatedImages[0].image.imageBytes) {
        throw new Error('API did not return an image. Please try a different character description.');
      }
      const base64ImageBytes: string = imageResponse.generatedImages[0].image.imageBytes;
      const imageUrl = `data:image/png;base64,${base64ImageBytes}`;

      const text = textResponse.text.trim().replace(/^"|"$/g, '');

      return { imageUrl, text: text || 'Could not generate a witty comment. Please try again!', sources };
    }
  } catch (error) {
    console.error("Error generating meme:", error);
    if (error instanceof Error) {
        // Prepend a user-friendly message to the specific error
        if(error.message.includes("real-time trends")) {
            throw error; // Rethrow the specific error from getRealtimeViralTopic
        }
        throw new Error(`Failed to generate meme: ${error.message}`);
    }
    throw new Error('An unknown error occurred while generating the meme.');
  }
}

import { GoogleGenAI } from "@google/genai";
import type { CityMarketData, ChatMessage } from "../types";

// Helper to extract key latest values for the prompt
const getMetricSummary = (metric: any) => {
    if (!metric || !metric.series || metric.series.length === 0) {
        return { latestValue: null };
    }
    return { latestValue: metric.latestValue };
};


export async function generateReport(
    userPrompt: string, 
    primaryCityData: CityMarketData,
    comparisonCityData: CityMarketData | null,
    nationalData: CityMarketData | null,
    geminiApiKey: string
): Promise<{ text: string; sources?: ChatMessage['sources'] }> {
    if (!geminiApiKey) {
        return { text: "Cannot generate report: Gemini API key is missing." };
    }
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    const systemInstruction = `You are a professional real-estate analyst. Your goal is to generate a concise, insightful, and data-driven market report summary based *only* on the data provided.
- Analyze the provided JSON data, which includes a primary market, an optional comparison market, and the national average.
- If a comparison market is provided, focus on the similarities and differences between it and the primary market.
- Use the national average data as a benchmark for context.
- Be positive and professional in your tone.
- Use bullet points, bold text, and relevant emojis for readability.
- Do not output JSON code blocks or markdown code fences. Your entire response must be a formatted text summary.
- Do not use any external tools or knowledge outside of the provided data. Address the user's query directly using the data.`;

    const getCityDataForPrompt = (data: CityMarketData) => ({
        name: data.cityName,
        medianSalePrice: getMetricSummary(data.medianSalePrice),
        medianListPrice: getMetricSummary(data.medianListPrice),
        saleToListRatio: getMetricSummary(data.saleToListRatio),
        medianDaysOnMarket: getMetricSummary(data.medianDaysOnMarket),
        newListings: getMetricSummary(data.newListings),
        activeInventory: getMetricSummary(data.activeInventory),
    });

    const promptData = {
        primaryMarket: getCityDataForPrompt(primaryCityData),
        comparisonMarket: comparisonCityData ? getCityDataForPrompt(comparisonCityData) : undefined,
        nationalAverage: nationalData ? getCityDataForPrompt(nationalData) : undefined,
    };
    
    const fullPrompt = `
        User Query: "${userPrompt}"

        Market Data (JSON):
        ${JSON.stringify(promptData, null, 2)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.5,
            }
        });
        
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
            ?.map((chunk: any) => ({
                title: chunk.web?.title || 'Untitled',
                uri: chunk.web?.uri || ''
            }))
            .filter(source => source.uri);

        return {
            text: response.text,
            sources: sources && sources.length > 0 ? sources : undefined
        };

    } catch (error) {
        console.error("Gemini API call failed:", error);
        return { text: "I'm sorry, but I was unable to generate a report at this time. There might be an issue with the connection or your API key." };
    }
}

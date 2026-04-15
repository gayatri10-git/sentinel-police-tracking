import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please check your Secrets or .env file.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function analyzeIncident(imageData: string, description: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageData,
            },
          },
          {
            text: `Analyze this incident photo and description. 
            Description: ${description || "No description provided."}
            
            Identify:
            1. Incident type (e.g., Accident, Fire, Crime, Medical, Property Damage, Other)
            2. Severity level (low, medium, high, critical)
            3. Visible hazards
            4. Number of people/vehicles involved
            5. Suggested response priority
            6. A 3-sentence tactical summary for the responding officer.
            7. Relevant tags for categorization.

            Return the results in JSON format.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            incidentType: { type: Type.STRING },
            severity: { type: Type.STRING, enum: ["low", "medium", "high", "critical"] },
            hazards: { type: Type.ARRAY, items: { type: Type.STRING } },
            involvedCount: { type: Type.STRING },
            priority: { type: Type.STRING },
            summary: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["incidentType", "severity", "summary", "tags"],
        },
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error in analyzeIncident:", error);
    throw error;
  }
}

export async function analyzeVoiceTranscript(transcript: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this emergency voice transcript: "${transcript}"
      
      Identify:
      1. Incident type (Accident, Fire, Crime, Medical, Property, Other)
      2. Severity (low, medium, high, critical)
      3. A concise description.
      4. Confidence score (0.0 to 1.0)
      
      Return JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            incidentType: { type: Type.STRING },
            severity: { type: Type.STRING, enum: ["low", "medium", "high", "critical"] },
            description: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
          },
          required: ["incidentType", "severity", "description", "confidence"],
        },
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error in analyzeVoiceTranscript:", error);
    throw error;
  }
}

export async function generateResolutionReport(incident: any, officer: any, timeline: any[], durationMinutes: number) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a formal SENTINEL incident resolution report.
    Incident: ${JSON.stringify(incident)}
    Officer: ${JSON.stringify(officer)}
    Timeline: ${JSON.stringify(timeline)}
    Duration: ${durationMinutes} minutes
    
    Include:
    1. Report Number (e.g., SEN-2024-XXXX)
    2. Executive Summary
    3. Outcome Classification
    4. Chronology
    5. Officer Narrative
    6. Recommended Follow-Up
    
    Return JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reportNumber: { type: Type.STRING },
          summary: { type: Type.STRING },
          outcomeClassification: { type: Type.STRING },
          chronology: { type: Type.STRING },
          officerNarrative: { type: Type.STRING },
          recommendedFollowUp: { type: Type.STRING },
        },
        required: ["reportNumber", "summary", "outcomeClassification", "chronology", "officerNarrative", "recommendedFollowUp"],
      },
    },
  });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error in generateResolutionReport:", error);
    throw error;
  }
}

export async function getDispatchRecommendation(incident: any, officers: any[]) {
  const availableOfficers = officers.filter(o => o.status === 'off_duty');
  
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are the SENTINEL Dispatch AI. Recommend the best officer for this incident.
      Incident: ${JSON.stringify(incident)}
      Available Officers (Off-Duty): ${JSON.stringify(availableOfficers)}
      All Officers (for context): ${JSON.stringify(officers.map(o => ({ id: o.id, name: o.name, status: o.status, badge: o.badge_number })))}
      
      Rank the top 3 officers based on proximity, experience, and incident type match. 
      If no off-duty officers are available, recommend the best on-duty officer who might be able to divert, but prioritize off-duty ones.
      
      Return JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedOfficerId: { type: Type.STRING },
            reason: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            alternativeIds: { type: Type.ARRAY, items: { type: Type.STRING } },
            rankedOfficers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  badge_number: { type: Type.STRING },
                  distKm: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                },
                required: ["id", "name", "badge_number", "distKm", "score"],
              },
            },
          },
          required: ["recommendedOfficerId", "reason", "confidence", "rankedOfficers"],
        },
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error in getDispatchRecommendation:", error);
    throw error;
  }
}

export async function getTacticalBriefing(incident: any) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a police dispatch AI. Summarize this incident for an officer:
      Type: ${incident.type}
      Description: ${incident.description}
      Severity: ${incident.severity}
      AI Summary: ${incident.ai_summary || 'N/A'}
      
      Give a 3-sentence tactical briefing focusing on safety and immediate actions.`,
    });

    return response.text;
  } catch (error) {
    console.error("Error in getTacticalBriefing:", error);
    throw error;
  }
}

export async function getCommandIntelligence(query: string, data: { incidents: any[], officers: any[] }) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are the SENTINEL Command Intelligence AI. You have access to the current operational data:
      
      Active Incidents: ${JSON.stringify(data.incidents.filter(i => i.status !== 'Resolved'))}
      On-Duty Officers: ${JSON.stringify(data.officers.filter(o => o.status !== 'off_duty'))}
      
      User Query: ${query}
      
      Provide a concise, tactical response. Use data to support your points. Focus on resource allocation, threat assessment, and operational efficiency.`,
    });

    return response.text || "Unable to process command intelligence at this time.";
  } catch (error) {
    console.error("Error in getCommandIntelligence:", error);
    throw error;
  }
}

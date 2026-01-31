// services/groqService.ts
import { TelemetrySnapshot, ShadowAnalysis } from "../types";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// ⚠️ REPLACE THIS WITH YOUR ACTUAL GROQ API KEY
const GROQ_API_KEY = "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";

export const performShadowAnalysis = async (snapshot: TelemetrySnapshot, retries = 3): Promise<ShadowAnalysis | null> => {
  
  const prompt = `
    ROLE: Senior SRE Autonomous Agent (Level 5).
    STATUS: Direct Telemetry Access.

    CURRENT NODE METRICS:
    - RAM: ${Math.round(snapshot.metrics.memoryUsageMB)}MB
    - LATENCY: ${Math.round(snapshot.metrics.latencyMs)}ms
    - DISK: ${Math.round(snapshot.metrics.diskUsagePercent)}%
    - ACTIVE FAULTS: ${snapshot.activeChaos.join(', ') || 'NONE'}

    LOG STREAM (LAST 10):
    ${snapshot.logs.slice(0, 10).map(l => l.message).join('\n')}

    TASK:
    1. Identify 'predictedIncident'.
    2. 'rootCause': MUST be a short, professional, technical summary (Max 15 words).
    3. 'recommendedFix': Provide a clear 3-step numbered fix guide.
    4. 'confidence': 
       - 98% for obvious matches to the metrics (Auto-Heal eligible).
       - < 80% if data is ambiguous or high risk.
    5. 'severity': 'critical' if health is poor, 'high' otherwise.

    OUTPUT REQUIREMENTS:
    - 'predictedIncident': Must be one of: 'memory_leak', 'api_timeout', 'disk_full', or 'none'
    - 'rootCause': string (max 15 words)
    - 'recommendedFix': string (3-step numbered guide format)
    - 'confidence': number between 0-100
    - 'severity': Must be one of: 'low', 'medium', 'high', or 'critical'
    - 'reasoningSteps': Array of strings explaining your analysis

    RESPOND ONLY WITH VALID JSON. No markdown, no explanations, just the JSON object.
  `;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "You are the primary SRE brain of a global cloud cluster. Your word is final. Be technical, be brief, be precise. Format guides as: 1. Action A. 2. Action B. 3. Action C. Always respond with valid JSON only."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        // Handle 429 rate limit with exponential backoff
        if (response.status === 429) {
          if (i < retries - 1) {
            const waitTime = Math.pow(2, i) * 2000; // 2s, 4s, 8s...
            console.warn(`Groq API rate limited. Retrying in ${waitTime}ms...`);
            await delay(waitTime);
            continue;
          }
          throw new Error("RATE_LIMIT_EXHAUSTED");
        }
        throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error("Empty response from Groq API");
      }

      // Parse the JSON response
      let result;
      try {
        result = JSON.parse(content);
      } catch (parseError) {
        // If JSON parsing fails, try to extract JSON from markdown code blocks
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[1]);
        } else {
          throw parseError;
        }
      }

      // Validate and return with required fields
      return {
        id: `INC-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        timestamp: Date.now(),
        predictedIncident: result.predictedIncident || 'none',
        rootCause: result.rootCause || 'Unknown',
        recommendedFix: result.recommendedFix || 'Manual investigation required',
        confidence: result.confidence || 50,
        reasoningSteps: result.reasoningSteps || ['Analysis performed'],
        severity: result.severity || 'medium'
      };

    } catch (error: any) {
      console.error("AI Analysis critical failure:", error);
      
      // Re-throw rate limit error to trigger app throttle
      if (error?.message === "RATE_LIMIT_EXHAUSTED") {
        throw error;
      }
      
      // On last retry, return null
      if (i === retries - 1) {
        return null;
      }
      
      // Wait before retrying on other errors
      await delay(1000 * (i + 1));
    }
  }
  
  return null;
};
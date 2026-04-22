// API client for communicating with the ChaosSim backend

const API_BASE = 'http://localhost:4000';

export interface AnalysisResult {
  id: string;
  timestamp: number;
  predictedIncident: string;
  rootCause: string;
  recommendedFix: string;
  remediationAction: string;
  confidence: number;
  reasoningSteps: string[];
  severity: string;
}

export async function injectChaos(mode: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/chaos/inject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  });
  return res.json();
}

export async function clearChaos(mode?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/chaos/clear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  });
  return res.json();
}

export async function requestAnalysis(logs: any[]): Promise<AnalysisResult | null> {
  try {
    const res = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs }),
    });
    if (!res.ok) {
      if (res.status === 503) return null; // No API key
      if (res.status === 429) return null; // Rate limited
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}

export async function executeRemediation(action: string, incidentId?: string, actor?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/remediate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, incidentId, actor }),
  });
  return res.json();
}

export async function getIncidents(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/incidents`);
  return res.json();
}

export async function addIncident(data: any): Promise<any> {
  const res = await fetch(`${API_BASE}/api/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export interface Incident {
  id: string;
  timestamp: string;
  type: string;
  severity: string;
  rootCause: string;
  recommendedFix: string;
  status: 'open' | 'resolved' | 'dismissed';
  resolvedBy?: 'AI_AGENT' | 'HUMAN_OPERATOR';
  resolvedAt?: string;
  resolutionDetail?: string;
  confidence: number;
}

export class IncidentStore {
  private incidents: Incident[] = [];

  add(data: Partial<Incident>): Incident {
    const incident: Incident = {
      id: `INC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      type: data.type || 'unknown',
      severity: data.severity || 'medium',
      rootCause: data.rootCause || 'Unknown',
      recommendedFix: data.recommendedFix || 'Manual investigation required',
      status: 'open',
      confidence: data.confidence || 0,
    };
    this.incidents.unshift(incident);
    if (this.incidents.length > 100) this.incidents.pop();
    return incident;
  }

  resolve(id: string, detail: { action?: string; detail?: string; actor?: string }): Incident | null {
    const incident = this.incidents.find(i => i.id === id);
    if (incident) {
      incident.status = 'resolved';
      incident.resolvedAt = new Date().toISOString();
      incident.resolvedBy = (detail.actor as any) || 'AI_AGENT';
      incident.resolutionDetail = detail.detail || detail.action || 'Resolved';
    }
    return incident;
  }

  dismiss(id: string): Incident | null {
    const incident = this.incidents.find(i => i.id === id);
    if (incident) {
      incident.status = 'dismissed';
      incident.resolvedAt = new Date().toISOString();
    }
    return incident;
  }

  getAll(): Incident[] {
    return this.incidents;
  }

  getOpen(): Incident[] {
    return this.incidents.filter(i => i.status === 'open');
  }
}

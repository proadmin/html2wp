const API_BASE = '/api';

export interface ConvertRequest {
  input: { type: 'zip' | 'url' | 'local'; source: string };
  options: { outputFormat: string[]; styleMode: 'faithful' | 'native'; previewEnabled: boolean };
}

export interface JobStatus {
  jobId: string;
  status: 'pending' | 'ingesting' | 'analyzing' | 'transforming' | 'building' | 'exporting' | 'complete' | 'error';
  progress: { currentStep: string; percent: number; message: string };
  results: { pageCount?: number; postCount?: number; assetCount?: number };
  error?: { code: string; message: string };
}

export async function createJob(request: ConvertRequest): Promise<{ jobId: string }> {
  const response = await fetch(`${API_BASE}/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create job');
  }
  return response.json();
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const response = await fetch(`${API_BASE}/job/${jobId}/status`);
  if (!response.ok) {
    throw new Error('Failed to fetch job status');
  }
  return response.json();
}

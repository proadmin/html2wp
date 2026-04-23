const API_BASE = '/api';

export type OutputFormat = 'wxr' | 'direct' | 'package';

export interface ConvertRequest {
  input: { type: 'zip' | 'url' | 'local'; source: string };
  options: { outputFormat: OutputFormat[]; styleMode: 'faithful' | 'native'; previewEnabled: boolean };
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

export interface JobPreview {
  pages: Array<{ id: string; title: string; slug: string }>;
  posts: Array<{ id: string; title: string; slug: string }>;
  menus: Array<{ name: string; items: Array<{ label: string; url: string }> }>;
  assets: Array<{ id: string; path: string; type: string }>;
}

export async function getJobPreview(jobId: string): Promise<JobPreview> {
  const response = await fetch(`${API_BASE}/job/${jobId}/preview`);
  if (!response.ok) {
    throw new Error('Failed to fetch preview');
  }
  return response.json();
}

export async function downloadWxr(jobId: string, filename: string): Promise<void> {
  const response = await fetch(`${API_BASE}/job/${jobId}/result/wordpress.xml`);
  if (!response.ok) {
    throw new Error('Download failed');
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export type InputType = 'zip' | 'url' | 'local';
export type OutputFormat = 'wxr' | 'direct' | 'package';
export type StyleMode = 'faithful' | 'native';
export type JobStatus =
  | 'pending'
  | 'ingesting'
  | 'analyzing'
  | 'transforming'
  | 'building'
  | 'exporting'
  | 'complete'
  | 'error';

export interface JobInput {
  type: InputType;
  source: string;
}

export interface JobOptions {
  outputFormat: OutputFormat[];
  styleMode: StyleMode;
  previewEnabled: boolean;
}

export interface JobProgress {
  currentStep: string;
  percent: number;
  message: string;
}

export interface JobResults {
  pageCount: number;
  postCount: number;
  assetCount: number;
  outputUrls: string[];
}

export interface JobError {
  code: string;
  message: string;
  recoverable: boolean;
}

export interface JobState {
  jobId: string;
  status: JobStatus;
  input: JobInput;
  options: JobOptions;
  progress: JobProgress;
  results: Partial<JobResults>;
  error?: JobError;
}

export interface SiteMap {
  pages: Page[];
  posts: Post[];
  menus: Menu[];
  assets: Asset[];
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  template?: string;
  parent?: string;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  date: string;
  categories: string[];
  tags: string[];
}

export interface Menu {
  name: string;
  location: string;
  items: MenuItem[];
}

export interface MenuItem {
  label: string;
  url: string;
  children?: MenuItem[];
}

export interface Asset {
  id: string;
  path: string;
  type: 'image' | 'css' | 'js' | 'font';
  size: number;
  dependencies: string[];
}

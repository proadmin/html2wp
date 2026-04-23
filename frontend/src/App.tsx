import { useState } from 'react';
import { createJob, type OutputFormat } from './api/client';
import { useJobStatus } from './hooks/useJobStatus';
import { Upload } from './components/Upload';
import { Configure } from './components/Configure';
import { Result } from './components/Result';
import { Preview } from './components/Preview';
import './App.css';

function App() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [inputType, setInputType] = useState<'zip' | 'url' | 'local'>('url');
  const [source, setSource] = useState('');
  const [outputFormat, setOutputFormat] = useState<OutputFormat[]>(['wxr']);
  const [styleMode, setStyleMode] = useState<'faithful' | 'native'>('native');
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [started, setStarted] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const { status, error, loading } = useJobStatus(jobId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!source) return;

    try {
      const { jobId: newJobId } = await createJob({
        input: { type: inputType, source },
        options: {
          outputFormat,
          styleMode,
          previewEnabled
        }
      });
      setJobId(newJobId);
      setStarted(true);
    } catch (err) {
      console.error('Failed to create job', err);
      alert('Failed to start conversion. Check console for details.');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>HTML to WordPress Converter</h1>
        <p>Convert static HTML sites to WordPress using AI</p>
      </header>

      <main className="app-main">
        {!started ? (
          <form onSubmit={handleSubmit} className="conversion-form">
            <Upload
              inputType={inputType}
              setInputType={setInputType}
              source={source}
              setSource={setSource}
            />

            <Configure
              outputFormat={outputFormat}
              setOutputFormat={setOutputFormat}
              styleMode={styleMode}
              setStyleMode={setStyleMode}
              previewEnabled={previewEnabled}
              setPreviewEnabled={setPreviewEnabled}
            />

            <button type="submit" className="btn-primary" disabled={!source}>
              Start Conversion
            </button>
          </form>
        ) : (
          <div className="conversion-progress">
            {status?.status === 'complete' ? (
              showPreview ? (
                <Preview
                  pages={status.results.pages || []}
                  menus={status.results.menus || []}
                  assets={status.results.assets || []}
                  onExport={() => setShowPreview(false)}
                  onBack={() => setShowPreview(false)}
                />
              ) : jobId ? (
                <Result
                  jobId={jobId}
                  status={status}
                  previewEnabled={previewEnabled}
                  onViewPreview={() => setShowPreview(true)}
                />
              ) : null
            ) : status?.status === 'error' ? (
              <div className="error-state">
                <h2>Error</h2>
                <p>{status.error?.message || 'An error occurred'}</p>
              </div>
            ) : (
              <div className="progress-state">
                <h2>Converting...</h2>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${status?.progress.percent || 0}%` }}
                  />
                </div>
                <p className="progress-message">
                  {status?.progress.message || 'Processing...'}
                </p>
                <p className="progress-step">
                  Step: {status?.progress.currentStep}
                </p>
                {loading && <p className="loading">Polling for updates...</p>}
                {error && <p className="error">{error}</p>}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Powered by Ollama AI + Twenty Twenty-Five Theme</p>
      </footer>
    </div>
  );
}

export default App;

import { downloadWxr } from '../api/client';

interface ResultProps {
  jobId: string;
  status: {
    status: string;
    results: { pageCount?: number; postCount?: number; assetCount?: number; outputUrls?: string[] };
  };
  previewEnabled: boolean;
  onViewPreview: () => void;
}

export function Result({ jobId, status, previewEnabled, onViewPreview }: ResultProps) {
  const handleDownload = async () => {
    try {
      await downloadWxr(jobId, `wordpress-export-${jobId}.xml`);
    } catch (error) {
      console.error('Download failed', error);
      alert('Failed to download WXR file. Check console for details.');
    }
  };

  return (
    <div className="result-section">
      <h2>Conversion Complete!</h2>

      <div className="results-summary">
        <div className="stat">
          <span className="stat-value">{status.results.pageCount || 0}</span>
          <span className="stat-label">Pages</span>
        </div>
        <div className="stat">
          <span className="stat-value">{status.results.postCount || 0}</span>
          <span className="stat-label">Posts</span>
        </div>
        <div className="stat">
          <span className="stat-value">{status.results.assetCount || 0}</span>
          <span className="stat-label">Assets</span>
        </div>
      </div>

      <div className="download-section">
        <h3>Download</h3>
        <button onClick={handleDownload} className="btn-primary">
          Download WXR File
        </button>
        {previewEnabled && (
          <button onClick={onViewPreview} className="btn-secondary" style={{ marginLeft: '10px' }}>
            View Preview
          </button>
        )}
        <p className="help-text">
          Import this file in WordPress: <code>Tools → Import → WordPress</code>
        </p>
      </div>
    </div>
  );
}

interface ResultProps {
  status: {
    status: string;
    results: { pageCount?: number; postCount?: number; assetCount?: number; outputUrls?: string[] };
  };
}

export function Result({ status }: ResultProps) {
  const downloadWxr = () => {
    // TODO: Implement actual download
    alert('Download WXR file');
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
        <button onClick={downloadWxr} className="btn-primary">
          Download WXR File
        </button>
        <p className="help-text">
          Import this file in WordPress: <code>Tools → Import → WordPress</code>
        </p>
      </div>
    </div>
  );
}

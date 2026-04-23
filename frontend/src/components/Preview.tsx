interface PreviewProps {
  pages: Array<{ id: string; title: string; slug: string }>;
  menus: Array<{ name: string; items: Array<{ label: string; url: string }> }>;
  assets: Array<{ id: string; path: string; type: string }>;
  onExport: () => void;
  onBack: () => void;
}

export function Preview({ pages, menus, assets, onExport, onBack }: PreviewProps) {
  const hasData = pages.length > 0 || menus.length > 0 || assets.length > 0;

  return (
    <div className="preview-section">
      <h2>Preview</h2>

      <div className="preview-actions">
        <button onClick={onBack} className="btn-secondary">
          Back to Results
        </button>
        <button onClick={onExport} className="btn-primary">
          Export to WordPress
        </button>
      </div>

      {!hasData ? (
        <div className="preview-empty">
          <p>No preview data available. The conversion may not have produced any output.</p>
          <p className="help-text">Check the job results or try converting a different source.</p>
        </div>
      ) : (
        <div className="preview-grid">
          <div className="preview-card">
            <h3>Pages ({pages.length})</h3>
            {pages.length > 0 ? (
              <ul>
                {pages.map((page) => (
                  <li key={page.id}>
                    <strong>{page.title}</strong> — <code>/{page.slug}</code>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="help-text">No pages detected</p>
            )}
          </div>

          <div className="preview-card">
            <h3>Menus ({menus.length})</h3>
            {menus.length > 0 ? (
              menus.map((menu, menuIndex) => (
                <div key={`${menu.name}-${menuIndex}`}>
                  <h4>{menu.name}</h4>
                  <ul>
                    {menu.items.map((item, i) => (
                      <li key={`${menu.name}-${menuIndex}-item-${i}`}>
                        {item.label} → {item.url}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <p className="help-text">No menus detected</p>
            )}
          </div>

          <div className="preview-card">
            <h3>Assets ({assets.length})</h3>
            {assets.length > 0 ? (
              <ul>
                {assets.slice(0, 10).map((asset) => (
                  <li key={asset.id}>
                    {asset.path} ({asset.type})
                  </li>
                ))}
                {assets.length > 10 && <li>...and {assets.length - 10} more</li>}
              </ul>
            ) : (
              <p className="help-text">No assets detected</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

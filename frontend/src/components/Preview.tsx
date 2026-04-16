interface PreviewProps {
  pages: Array<{ id: string; title: string; slug: string }>;
  menus: Array<{ name: string; items: Array<{ label: string; url: string }> }>;
  assets: Array<{ id: string; path: string; type: string }>;
}

export function Preview({ pages, menus, assets }: PreviewProps) {
  return (
    <div className="preview-section">
      <h2>Preview</h2>

      <div className="preview-grid">
        <div className="preview-card">
          <h3>Pages ({pages.length})</h3>
          <ul>
            {pages.map((page) => (
              <li key={page.id}>
                <strong>{page.title}</strong> — <code>/{page.slug}</code>
              </li>
            ))}
          </ul>
        </div>

        <div className="preview-card">
          <h3>Menus ({menus.length})</h3>
          {menus.map((menu) => (
            <div key={menu.name}>
              <h4>{menu.name}</h4>
              <ul>
                {menu.items.map((item, i) => (
                  <li key={i}>
                    {item.label} → {item.url}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="preview-card">
          <h3>Assets ({assets.length})</h3>
          <ul>
            {assets.slice(0, 10).map((asset) => (
              <li key={asset.id}>
                {asset.path} ({asset.type})
              </li>
            ))}
            {assets.length > 10 && <li>...and {assets.length - 10} more</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

interface ConfigureProps {
  outputFormat: string[];
  setOutputFormat: (formats: string[]) => void;
  styleMode: 'faithful' | 'native';
  setStyleMode: (mode: 'faithful' | 'native') => void;
  previewEnabled: boolean;
  setPreviewEnabled: (enabled: boolean) => void;
}

export function Configure({
  outputFormat,
  setOutputFormat,
  styleMode,
  setStyleMode,
  previewEnabled,
  setPreviewEnabled
}: ConfigureProps) {
  const toggleFormat = (format: string) => {
    if (outputFormat.includes(format)) {
      setOutputFormat(outputFormat.filter((f) => f !== format));
    } else {
      setOutputFormat([...outputFormat, format]);
    }
  };

  return (
    <div className="configure-section">
      <h2>Step 2: Configure Options</h2>

      <div className="option-group">
        <h3>Output Format</h3>
        <label>
          <input
            type="checkbox"
            checked={outputFormat.includes('wxr')}
            onChange={() => toggleFormat('wxr')}
          />
          WordPress XML (WXR) - Import via Tools → Import
        </label>
        <label>
          <input
            type="checkbox"
            checked={outputFormat.includes('direct')}
            onChange={() => toggleFormat('direct')}
          />
          Direct Install - Push to WordPress via API
        </label>
        <label>
          <input
            type="checkbox"
            checked={outputFormat.includes('package')}
            onChange={() => toggleFormat('package')}
          />
          Complete Package - Theme + SQL dump
        </label>
      </div>

      <div className="option-group">
        <h3>Style Mode</h3>
        <label>
          <input
            type="radio"
            value="faithful"
            checked={styleMode === 'faithful'}
            onChange={(e) => setStyleMode(e.target.value as 'faithful' | 'native')}
          />
          Faithful - Replicate original design
        </label>
        <label>
          <input
            type="radio"
            value="native"
            checked={styleMode === 'native'}
            onChange={(e) => setStyleMode(e.target.value as 'faithful' | 'native')}
          />
          Theme-Native - Use Twenty Twenty-Five patterns
        </label>
      </div>

      <div className="option-group">
        <label>
          <input
            type="checkbox"
            checked={previewEnabled}
            onChange={(e) => setPreviewEnabled(e.target.checked)}
          />
          Enable Preview Mode (review before export)
        </label>
      </div>
    </div>
  );
}

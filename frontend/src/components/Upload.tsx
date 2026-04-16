
interface UploadProps {
  inputType: 'zip' | 'url' | 'local';
  setInputType: (type: 'zip' | 'url' | 'local') => void;
  source: string;
  setSource: (source: string) => void;
}

export function Upload({ inputType, setInputType, source, setSource }: UploadProps) {
  return (
    <div className="upload-section">
      <h2>Step 1: Provide Source</h2>

      <div className="input-type-selector">
        <label>
          <input
            type="radio"
            value="url"
            checked={inputType === 'url'}
            onChange={(e) => setInputType(e.target.value as 'url' | 'zip' | 'local')}
          />
          URL (crawl website)
        </label>
        <label>
          <input
            type="radio"
            value="zip"
            checked={inputType === 'zip'}
            onChange={(e) => setInputType(e.target.value as 'url' | 'zip' | 'local')}
          />
          ZIP Upload
        </label>
        <label>
          <input
            type="radio"
            value="local"
            checked={inputType === 'local'}
            onChange={(e) => setInputType(e.target.value as 'url' | 'zip' | 'local')}
          />
          Local Directory
        </label>
      </div>

      <div className="source-input">
        <label htmlFor="source">Source:</label>
        <input
          id="source"
          type={inputType === 'url' ? 'url' : 'text'}
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder={
            inputType === 'url'
              ? 'https://example.com'
              : inputType === 'zip'
              ? '/path/to/site.zip'
              : '/path/to/html/site'
          }
        />
      </div>
    </div>
  );
}

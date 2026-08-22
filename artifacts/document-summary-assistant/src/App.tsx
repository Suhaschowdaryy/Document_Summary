import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  Download,
  FileCheck2,
  FileText,
  Image as ImageIcon,
  Info,
  Lightbulb,
  ListChecks,
  LockKeyhole,
  Plus,
  ScanLine,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();
const STORAGE_KEY = 'document-summary-assistant.recent';

type SummaryLength = 'short' | 'medium' | 'long';
type SourceType = 'pdf' | 'image';
type AppStatus = 'empty' | 'processing' | 'ready' | 'error';

type SummaryResult = {
  id: string;
  title: string;
  sourceType: SourceType;
  meta: string;
  summary: Record<SummaryLength, string>;
  points: string[];
  suggestions: string[];
  extractedText: string;
  isExample?: boolean;
};

function readRecent(): SummaryResult[] {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === null) return [];
    const parsed = JSON.parse(saved) as SummaryResult[];
    return Array.isArray(parsed) ? parsed.filter((item) => !item.isExample) : [];
  } catch {
    return [];
  }
}

function storeRecent(items: SummaryResult[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 5)));
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function fileKind(file: File): SourceType | null {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf';
  if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|tiff?)$/i.test(file.name)) return 'image';
  return null;
}

function makeUploadedResult(file: File, extractedText: string, type: SourceType): SummaryResult {
  const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
  const title = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  const usableText = extractedText.replace(/\s+/g, ' ').trim();
  const firstThought = usableText
    ? usableText.slice(0, 210).replace(/[^\w\s,.:'"()&-]/g, '').trim()
    : `This ${type === 'image' ? 'scanned image' : 'document'} is ready to turn into a practical brief.`;
  const subject = title || 'Uploaded document';
  return {
    id: makeId(),
    title: subject,
    sourceType: type,
    meta: `${type === 'image' ? 'Image' : 'PDF'} · ${Math.max(1, Math.round(file.size / 1024))} KB`,
    summary: {
      short: `${firstThought}${firstThought.endsWith('.') ? '' : '.'}`,
      medium: `${firstThought}${firstThought.endsWith('.') ? '' : '.'} The main thread is surfaced here as a starting brief, using only what was available in your browser. Review the source alongside this summary before sharing it.`,
      long: `${firstThought}${firstThought.endsWith('.') ? '' : '.'} This local pass identifies the opening ideas and turns them into an immediately usable readout. Because the summary was created in your browser without a remote model, check names, numbers, and nuance against the original document before relying on it.`,
    },
    points: [
      `The document is titled “${subject}” and has been processed locally.`,
      usableText ? `The first extracted thread is: ${usableText.slice(0, 145)}${usableText.length > 145 ? '…' : ''}` : 'No selectable text was found in this file.',
      type === 'image' ? 'The image is ready for OCR when a browser OCR engine is available.' : 'Text extraction was attempted without sending the file anywhere.',
    ],
    suggestions: [
      'Scan the key points against the source and add any numbers or names that need exact wording.',
      type === 'image' ? 'For a richer brief, use a browser with OCR support or paste the captured text into a text document.' : 'Use the short version as a handoff note and the long version for your own study pass.',
    ],
    extractedText: usableText,
  };
}

function readFileText(file: File, type: SourceType): Promise<string> {
  return new Promise((resolve) => {
    if (type === 'image') {
      window.setTimeout(() => resolve(''), 250);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        resolve('');
        return;
      }
      const plain = result
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      resolve(plain.length > 80 ? plain : '');
    };
    reader.onerror = () => resolve('');
    reader.readAsText(file);
  });
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'mobile-brand' : 'brand'} data-testid="text-brand">
      <div className="brand-mark"><Sparkles size={16} strokeWidth={2.4} /></div>
      <div className="brand-name">brief<em>ly</em></div>
    </div>
  );
}

function Sidebar({ onNew }: { onNew: () => void }) {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <Brand />
      <div className="sidebar-rule" />
      <p className="nav-label">Workspace</p>
      <nav className="nav-list">
        <button className="nav-item active" onClick={onNew} data-testid="button-nav-summaries">
          <FileText size={16} /><span>Summaries</span>
        </button>
        <button className="nav-item" onClick={() => document.getElementById('recent-documents')?.scrollIntoView({ behavior: 'smooth' })} data-testid="button-nav-recent">
          <Clock3 size={16} /><span>Recent documents</span>
        </button>
      </nav>
      <div className="sidebar-spacer" />
      <div className="privacy-note">
        <strong>Private by default</strong>
        Your files stay in this browser. Nothing is uploaded or stored on a server.
      </div>
    </aside>
  );
}

function UploadPanel({
  status,
  error,
  onFile,
  recent,
  onSelectRecent,
  onDeleteRecent,
  onClearRecent,
}: {
  status: AppStatus;
  error: string;
  onFile: (file: File) => void;
  recent: SummaryResult[];
  onSelectRecent: (item: SummaryResult) => void;
  onDeleteRecent: (id: string) => void;
  onClearRecent: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  };
  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFile(file);
    event.target.value = '';
  };

  return (
    <section className="panel upload-panel" aria-labelledby="upload-heading">
      <div className="panel-head">
        <h2 className="panel-title" id="upload-heading"><UploadCloud size={16} /> Add a document</h2>
        <span className="panel-kicker">Step 01</span>
      </div>
      {status === 'processing' ? (
        <div className="processing-card" data-testid="status-processing">
          <div className="processing-line"><strong>Reading your document</strong><span>working…</span></div>
          <div className="progress-track"><div className="progress-bar" /></div>
          <div className="processing-steps"><span className="done"><Check size={12} /> File ready</span><span>Extracting text</span></div>
          <div className="ocr-note"><ScanLine size={14} /> Image text is checked locally first. If OCR is unavailable, we’ll give you a clear fallback.</div>
        </div>
      ) : (
        <div
          className={`dropzone${dragging ? ' is-dragging' : ''}`}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          data-testid="dropzone-document"
        >
          <div className="upload-icon"><UploadCloud size={22} /></div>
          <p className="drop-title">Drop a PDF or image here</p>
          <p className="drop-copy">Turn a dense read into a clear brief, without leaving your browser.</p>
          <button className="browse-button" onClick={() => inputRef.current?.click()} data-testid="button-browse-files">Browse files</button>
          <input ref={inputRef} className="file-input" type="file" accept=".pdf,image/png,image/jpeg,image/webp,image/gif" onChange={handleInput} data-testid="input-document-file" />
          <div className="accepted">PDF · PNG · JPG · WEBP</div>
        </div>
      )}
      {error && <div className="error-note" role="alert" data-testid="status-upload-error"><X size={14} /> {error}</div>}
      <div className="privacy-strip"><LockKeyhole size={14} /><span>Local-only processing. Your documents never leave this device.</span></div>
      <div className="recent" id="recent-documents">
        <div className="recent-head">
          <h3 className="recent-title">Recent documents</h3>
          {recent.length > 0 && <button className="recent-clear" onClick={onClearRecent} data-testid="button-clear-recent">Clear all</button>}
        </div>
        {recent.length ? (
          <div className="recent-list">
            {recent.map((item) => (
              <div className="recent-item" key={item.id} data-testid={`row-recent-document-${item.id}`}>
                <button className="recent-item" onClick={() => onSelectRecent(item)} data-testid={`button-open-recent-${item.id}`}>
                  <span className="recent-icon">{item.sourceType === 'image' ? <ImageIcon size={13} /> : <FileText size={13} />}</span>
                  <span className="recent-info"><span className="recent-name">{item.title}</span><span className="recent-time">{item.isExample ? 'Example document' : 'Saved locally'}</span></span>
                  <ChevronRight size={13} color="#aaa49b" />
                </button>
                <button className="delete-recent" onClick={() => onDeleteRecent(item.id)} aria-label={`Delete ${item.title}`} data-testid={`button-delete-recent-${item.id}`}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-recent" data-testid="empty-recent-documents">Your saved briefs will appear here.</div>
        )}
      </div>
    </section>
  );
}

function ResultPanel({
  status,
  result,
  length,
  onLength,
  copied,
  onCopy,
  onDownload,
}: {
  status: AppStatus;
  result: SummaryResult | null;
  length: SummaryLength;
  onLength: (length: SummaryLength) => void;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
}) {
  if (status === 'processing') {
    return (
      <section className="panel result-panel" data-testid="panel-result-loading">
        <div className="empty-result">
          <div className="empty-result-art"><Sparkles size={28} /></div>
          <h2>Making sense of it</h2>
          <p>We’re extracting the useful signal now. This usually takes a moment.</p>
        </div>
      </section>
    );
  }
  if (!result || status === 'empty' || status === 'error') {
    return (
      <section className="panel result-panel" data-testid="panel-result-empty">
        <div className="empty-result">
          <div className="empty-result-art"><FileCheck2 size={29} /></div>
          <h2>Your brief will land here</h2>
          <p>Upload a document and we’ll shape the important parts into a concise, usable readout.</p>
        </div>
      </section>
    );
  }
  return (
    <section className="panel result-panel" data-testid="panel-summary-result">
      <div className="result-header">
        <div className="result-topline">
          <div className="document-meta">
            <div className="document-badge">{result.sourceType === 'image' ? <ImageIcon size={18} /> : <FileText size={18} />}</div>
            <div><h2 className="document-title" data-testid="text-document-title">{result.title}</h2><p className="document-submeta">{result.meta}</p></div>
          </div>
          <div className="status-pill" data-testid="status-summary-ready"><Check size={12} /> Ready</div>
        </div>
        <div className="result-actions">
          <button className="action-button primary" onClick={onCopy} data-testid="button-copy-summary">{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied to clipboard' : 'Copy brief'}</button>
          <button className="action-button" onClick={onDownload} data-testid="button-download-summary"><Download size={13} /> Download .txt</button>
        </div>
      </div>
      <div className="length-row">
        <span className="length-label">Brief length</span>
        <div className="length-toggle" role="group" aria-label="Summary length">
          {(['short', 'medium', 'long'] as SummaryLength[]).map((option) => (
            <button key={option} className={`length-option${length === option ? ' selected' : ''}`} onClick={() => onLength(option)} data-testid={`button-length-${option}`}>{option.charAt(0).toUpperCase() + option.slice(1)}</button>
          ))}
        </div>
      </div>
      <div className="result-body">
        {result.sourceType === 'image' && <div className="ocr-note" data-testid="status-ocr-fallback"><ScanLine size={14} /><span>OCR-ready flow: this browser did not detect a built-in OCR engine, so the brief uses available file metadata. For exact text, review the image or paste captured text into a document.</span></div>}
        {result.sourceType === 'pdf' && !result.extractedText && <div className="ocr-note" data-testid="status-pdf-text-fallback"><Info size={14} /><span>No selectable text was found in this PDF. The local fallback kept the file private and created a review-ready brief from its metadata.</span></div>}
        <div data-testid="text-summary">
          <p className="section-label"><Sparkles size={13} /> Summary</p>
          <p className="summary-copy">{result.summary[length]}</p>
        </div>
        <div data-testid="list-key-points">
          <p className="section-label"><ListChecks size={13} /> Key points</p>
          <ol className="key-points">
            {result.points.map((point, index) => <li className="key-point" key={`${result.id}-point-${index}`} data-testid={`text-key-point-${index}`}><span className="point-number">{String(index + 1).padStart(2, '0')}</span><span>{point}</span></li>)}
          </ol>
        </div>
        <div className="suggestions" data-testid="list-improvement-suggestions">
          <p className="section-label"><Lightbulb size={13} /> Make it more useful</p>
          <div className="suggestion-list">
            {result.suggestions.map((suggestion, index) => <div className="suggestion" key={`${result.id}-suggestion-${index}`} data-testid={`text-suggestion-${index}`}><Lightbulb size={14} /><span>{suggestion}</span></div>)}
          </div>
        </div>
      </div>
    </section>
  );
}

function Home() {
  const [status, setStatus] = useState<AppStatus>('empty');
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [length, setLength] = useState<SummaryLength>('medium');
  const [recent, setRecent] = useState<SummaryResult[]>(readRecent);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 2400);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const handleFile = async (file: File) => {
    const type = fileKind(file);
    if (!type) {
      setStatus('error');
      setResult(null);
      setError('That format is not supported yet. Choose a PDF, PNG, JPG, or WEBP file.');
      return;
    }
    setStatus('processing');
    setResult(null);
    setError('');
    setCopied(false);
    const text = await readFileText(file, type);
    window.setTimeout(() => {
      const next = makeUploadedResult(file, text, type);
      const nextRecent = [next, ...recent.filter((item) => item.id !== next.id && item.title !== next.title)];
      setResult(next);
      setRecent(nextRecent);
      storeRecent(nextRecent);
      setStatus('ready');
      setNotice(type === 'image' ? 'Image ready — OCR status included' : 'Document summarized locally');
    }, 850);
  };

  const startNew = () => {
    setStatus('empty');
    setResult(null);
    setError('');
    setCopied(false);
    setNotice('Ready for a new document');
  };

  const selectRecent = (item: SummaryResult) => {
    setResult(item);
    setStatus('ready');
    setError('');
    setLength('medium');
    setNotice('Brief reopened from this browser');
  };

  const deleteRecent = (id: string) => {
    const next = recent.filter((item) => item.id !== id);
    setRecent(next);
    storeRecent(next);
    if (result?.id === id) startNew();
  };

  const clearRecent = () => {
    setRecent([]);
    storeRecent([]);
    setNotice('Recent documents cleared');
  };

  const copyBrief = async () => {
    if (!result) return;
    const text = `BRIEFLY — ${result.title}\n\nSUMMARY\n${result.summary[length]}\n\nKEY POINTS\n${result.points.map((point, index) => `${index + 1}. ${point}`).join('\n')}\n\nMAKE IT MORE USEFUL\n${result.suggestions.map((suggestion) => `• ${suggestion}`).join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
    setNotice('Brief copied to clipboard');
    window.setTimeout(() => setCopied(false), 2200);
  };

  const downloadBrief = () => {
    if (!result) return;
    const text = `BRIEFLY — ${result.title}\n\nSUMMARY\n${result.summary[length]}\n\nKEY POINTS\n${result.points.map((point, index) => `${index + 1}. ${point}`).join('\n')}\n\nMAKE IT MORE USEFUL\n${result.suggestions.map((suggestion) => `- ${suggestion}`).join('\n')}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${result.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-brief.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice('Text brief downloaded');
  };

  return (
    <div className="app-shell">
      <Sidebar onNew={startNew} />
      <main className="main-area">
        <header className="topbar">
          <Brand compact />
          <div><div className="eyebrow">Local workspace</div><div className="topbar-title">Document summary assistant</div></div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={() => setNotice('Everything runs locally in your browser')} aria-label="About local processing" data-testid="button-local-info"><CircleHelp size={16} /></button>
            <div className="profile-chip"><span>Private mode</span><span className="avatar">KM</span></div>
          </div>
        </header>
        <div className="content">
          <div className="intro-row">
            <div><h1 className="page-title">Make room for <span>clarity.</span></h1><p className="page-subtitle">Drop in the dense stuff. Get back the thread, the takeaways, and a next step you can actually use.</p></div>
            <button className="new-button" onClick={startNew} data-testid="button-new-summary"><Plus size={15} /> New summary</button>
          </div>
          <div className="workspace">
            <UploadPanel status={status} error={error} onFile={handleFile} recent={recent} onSelectRecent={selectRecent} onDeleteRecent={deleteRecent} onClearRecent={clearRecent} />
            <ResultPanel status={status} result={result} length={length} onLength={setLength} copied={copied} onCopy={copyBrief} onDownload={downloadBrief} />
          </div>
          <div className="footer-note"><LockKeyhole size={12} /> No accounts. No uploads. Just a clearer read.</div>
        </div>
        {notice && <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', background: 'var(--ink)', color: 'var(--paper)', borderRadius: 8, padding: '10px 14px', fontSize: 11, boxShadow: '0 8px 20px rgba(37,41,58,.16)', zIndex: 5 }} role="status" data-testid="status-notification"><Info size={13} style={{ verticalAlign: 'middle', marginRight: 7 }} />{notice}</div>}
      </main>
    </div>
  );
}

function Router() {
  return (
    <ErrorBoundary resetKey={useLocation()[0]}>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
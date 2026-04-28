import { useContext, useEffect, useRef, useState } from 'react';
import { Check, ExternalLink, Globe, Loader2, Trash2, X } from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';
import { PrimaryButton } from './ui/Buttons';
import { cn } from '../util/cn';

const isDev = import.meta.env.VITE_ENVIRONMENT !== 'production';

function appUrl(subdomain: string, port: number): string {
  return isDev ? `http://localhost:${port}` : `https://${subdomain}.app.csroom.org`;
}

function appUrlLabel(subdomain: string, port: number): string {
  return isDev ? `localhost:${port}` : `${subdomain}.app.csroom.org`;
}

interface SubdomainRecord {
  subdomain: string;
  port: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PortsPanel({ open, onClose }: Props) {
  const { userInfo } = useContext(UserDataContext);
  const [records, setRecords] = useState<SubdomainRecord[]>([]);
  const [port, setPort] = useState('');
  const [portTouched, setPortTouched] = useState(false);
  const [subdomain, setSubdomain] = useState('');
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<{ available: boolean; reason?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const checkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setPortTouched(false);
      setPort('');
      setSubdomain('');
      setAvailability(null);
      loadRecords();
    }
  }, [open]);

  // Autofill port with lowest unused port once records + userInfo are available
  useEffect(() => {
    if (!portTouched && userInfo) {
      const usedPorts = new Set(records.map(r => r.port));
      const lowest = Array.from(
        { length: userInfo.port_end - userInfo.port_start + 1 },
        (_, i) => userInfo.port_start + i,
      ).find(p => !usedPorts.has(p)) ?? userInfo.port_start;
      setPort(String(lowest));
    }
  }, [records, userInfo, portTouched]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function loadRecords() {
    try {
      const res = await fetch(`${apiUrl}/subdomains/`, { credentials: 'include' });
      if (res.ok) setRecords(await res.json());
    } catch { /* ignore */ }
  }

  function handleSubdomainInput(value: string) {
    const clean = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSubdomain(clean);
    setAvailability(null);
    if (checkTimeout.current) clearTimeout(checkTimeout.current);
    if (clean.length >= 3) {
      setChecking(true);
      checkTimeout.current = setTimeout(async () => {
        try {
          const res = await fetch(`${apiUrl}/subdomains/check/${clean}`, { credentials: 'include' });
          if (res.ok) setAvailability(await res.json());
        } finally {
          setChecking(false);
        }
      }, 400);
    } else {
      setChecking(false);
    }
  }

  async function handleClaim() {
    setError('');
    const portNum = parseInt(port);
    if (!userInfo || isNaN(portNum)) return;
    if (portNum < userInfo.port_start || portNum > userInfo.port_end) {
      setError(`Port must be between ${userInfo.port_start} and ${userInfo.port_end}.`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/subdomains/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain, port: portNum }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Failed to claim URL.'); return; }
      setPortTouched(false);
      setPort('');
      setSubdomain('');
      setAvailability(null);
      await loadRecords();
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRelease(sub: string) {
    try {
      await fetch(`${apiUrl}/subdomains/${sub}`, { method: 'DELETE', credentials: 'include' });
      await loadRecords();
    } catch { /* ignore */ }
  }

  const portNum = parseInt(port);
  const portOutOfRange = port !== '' && !isNaN(portNum) && userInfo && (portNum < userInfo.port_start || portNum > userInfo.port_end);
  const portValid = userInfo && !isNaN(portNum) && portNum >= userInfo.port_start && portNum <= userInfo.port_end;
  const conflictingRecord = portValid ? records.find(r => r.port === portNum) : undefined;
  const canClaim = !!(portValid && subdomain.length >= 3 && availability?.available && !saving);

  const inputClasses = 'w-full bg-paper border border-rule rounded-md px-3 py-2 text-sm text-ink-default placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-navy/30 font-mono';

  return (
    <div className={cn('fixed inset-0 z-50 flex transition-all duration-300', open ? 'pointer-events-auto' : 'pointer-events-none')}>
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-ink-strong/40 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />

      {/* Panel — slides in from the right */}
      <div className={cn(
        'relative ml-auto w-full max-w-sm bg-paper-elevated border-l border-rule-soft flex flex-col h-full overflow-hidden shadow-lg transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : 'translate-x-full',
      )}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-rule-soft flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-navy" />
            <span className="heading-3">Public URLs</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-paper-tinted text-ink-muted hover:text-ink-strong transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Port range info */}
          {userInfo && (
            <div className="text-sm text-ink-muted bg-paper-tinted rounded-md px-4 py-3">
              Your port range is{' '}
              <span className="text-ink-strong font-mono">{userInfo.port_start}–{userInfo.port_end}</span>.
              Bind your app to a port in this range, then give it a public URL below.
            </div>
          )}

          {/* Claim form */}
          <div>
            <h3 className="eyebrow text-ink-muted mb-3">Claim a URL</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-ink-muted mb-1 block font-medium">Port</label>
                <input
                  type="number"
                  placeholder={userInfo ? `${userInfo.port_start}` : 'Port'}
                  value={port}
                  onChange={(e) => { setPortTouched(true); setPort(e.target.value); }}
                  className={cn(
                    inputClasses,
                    '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                  )}
                />
                {portOutOfRange && (
                  <p className="text-xs mt-1 text-tomato">
                    Must be between <span className="font-mono">{userInfo!.port_start}</span> and <span className="font-mono">{userInfo!.port_end}</span>.
                  </p>
                )}
                {conflictingRecord && (
                  <p className="text-xs mt-1 text-ochre">
                    Port {portNum} is already mapped to{' '}
                    <span className="font-mono">{appUrlLabel(conflictingRecord.subdomain, conflictingRecord.port)}</span> — claiming will replace it.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs text-ink-muted mb-1 block font-medium">Subdomain</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="name for your url"
                    value={subdomain}
                    onChange={(e) => handleSubdomainInput(e.target.value)}
                    maxLength={32}
                    className={inputClasses}
                  />
                  {subdomain.length >= 3 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center">
                      {checking ? (
                        <Loader2 size={14} className="animate-spin text-ink-muted" />
                      ) : availability?.available ? (
                        <Check size={14} className="text-forest" />
                      ) : (
                        <X size={14} className="text-tomato" />
                      )}
                    </span>
                  )}
                </div>
                {subdomain.length >= 3 && checking && (
                  <p className="text-xs mt-1 text-ink-muted inline-flex items-center gap-1">
                    Checking…
                  </p>
                )}
                {subdomain.length >= 3 && !checking && availability && (
                  <p className={cn('text-xs mt-1', availability.available ? 'text-forest' : 'text-tomato')}>
                    {availability.available
                      ? `${appUrlLabel(subdomain, portNum)} is available`
                      : availability.reason || 'Already taken'}
                  </p>
                )}
              </div>

              {error && <p className="text-tomato text-sm">{error}</p>}

              <PrimaryButton
                color="navy"
                size="md"
                onClick={handleClaim}
                disabled={!canClaim}
                className="w-full justify-center"
              >
                {saving ? 'Claiming…' : 'Add subdomain'}
              </PrimaryButton>
            </div>
          </div>

          {/* Existing mappings */}
          {records.length > 0 && (
            <div>
              <h3 className="eyebrow text-ink-muted mb-3">Active</h3>
              <div className="space-y-1">
                {records.map((r) => (
                  <div key={r.subdomain} className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-paper-tinted transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-ink-muted font-mono mb-0.5">port {r.port}</div>
                      <a
                        href={appUrl(r.subdomain, r.port)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-navy hover:text-navy/80 hover:underline font-mono break-all"
                      >
                        {appUrlLabel(r.subdomain, r.port)}
                      </a>
                    </div>
                    <a
                      href={appUrl(r.subdomain, r.port)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-navy hover:text-navy/80 transition-colors flex-shrink-0 p-1.5 rounded hover:bg-paper-deeper"
                      title="Open"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <button
                      onClick={() => handleRelease(r.subdomain)}
                      className="text-tomato hover:bg-tomato/10 transition-colors flex-shrink-0 p-1.5 rounded cursor-pointer"
                      title="Remove"
                      aria-label={`Remove ${r.subdomain}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useContext, useEffect, useRef, useState } from 'react';
import { ExternalLink, Globe, Trash2, X } from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';

interface SubdomainRecord {
  subdomain: string;
  port: number;
}

interface Props {
  onClose: () => void;
}

export default function PortsPanel({ onClose }: Props) {
  const { userInfo } = useContext(UserDataContext);
  const [records, setRecords] = useState<SubdomainRecord[]>([]);
  const [port, setPort] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<{ available: boolean; reason?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const checkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadRecords();
  }, []);

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
      if (!res.ok) { setError(data.detail || 'Failed to claim subdomain.'); return; }
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
  const portValid = userInfo && !isNaN(portNum) && portNum >= userInfo.port_start && portNum <= userInfo.port_end;
  const canClaim = portValid && subdomain.length >= 3 && availability?.available && !saving;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel — slides in from the right */}
      <div className="relative ml-auto w-full max-w-sm bg-gray-900 border-l border-gray-700 flex flex-col h-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-[#54daf4]" />
            <span className="font-semibold">Public URLs</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Port range info */}
          {userInfo && (
            <div className="text-sm text-gray-400 bg-gray-800/50 rounded-lg px-4 py-3">
              Your port range is{' '}
              <span className="text-white font-mono">{userInfo.port_start}–{userInfo.port_end}</span>.
              Bind your app to a port in this range, then give it a public URL below.
            </div>
          )}

          {/* Existing mappings */}
          {records.length > 0 && (
            <div>
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Active</h3>
              <div className="space-y-2">
                {records.map((r) => (
                  <div key={r.subdomain} className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500 font-mono mb-0.5">port {r.port}</div>
                      <a
                        href={`https://${r.subdomain}.app.3compute.org`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#54daf4] hover:underline font-mono break-all"
                      >
                        {r.subdomain}.app.3compute.org
                      </a>
                    </div>
                    <a
                      href={`https://${r.subdomain}.app.3compute.org`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-white transition-colors flex-shrink-0 p-1"
                      title="Open"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <button
                      onClick={() => handleRelease(r.subdomain)}
                      className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0 p-1"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Claim form */}
          <div>
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Claim a URL</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Port</label>
                <input
                  type="number"
                  placeholder={userInfo ? `${userInfo.port_start}` : 'Port'}
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#54daf4]/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Subdomain</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="my-app"
                    value={subdomain}
                    onChange={(e) => handleSubdomainInput(e.target.value)}
                    maxLength={32}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#54daf4]/60"
                  />
                  {subdomain.length >= 3 && (
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${
                      checking ? 'text-gray-500' :
                      availability?.available ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {checking ? '…' : availability?.available ? '✓' : '✗'}
                    </span>
                  )}
                </div>
                {subdomain.length >= 3 && !checking && availability && (
                  <p className={`text-xs mt-1 ${availability.available ? 'text-green-400' : 'text-red-400'}`}>
                    {availability.available
                      ? `${subdomain}.app.3compute.org is available`
                      : availability.reason || 'Already taken'}
                  </p>
                )}
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <button
                onClick={handleClaim}
                disabled={!canClaim}
                className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                  canClaim
                    ? 'bg-[#2a9bb8] hover:bg-[#238da8] text-white cursor-pointer'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}
              >
                {saving ? 'Claiming…' : 'Claim subdomain'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

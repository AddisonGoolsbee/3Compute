import { useContext, useEffect, useRef, useState } from 'react';
import { ExternalLink, Globe, Trash2, X } from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';

interface SubdomainRecord {
  subdomain: string;
  port: number;
}

export default function PortsPanel({ onClose }: { onClose: () => void }) {
  const { userInfo } = useContext(UserDataContext);
  const [records, setRecords] = useState<SubdomainRecord[]>([]);
  const [port, setPort] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<{ available: boolean; reason?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const checkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadRecords();
  }, []);

  // Close on Escape
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
    <div
      ref={panelRef}
      className="absolute bottom-full right-0 mb-1 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl shadow-black/60 z-50 text-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2 font-semibold">
          <Globe size={15} className="text-[#54daf4]" />
          Public URLs
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <X size={15} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Port range hint */}
        {userInfo && (
          <p className="text-xs text-gray-500">
            Your port range: <span className="text-gray-300 font-mono">{userInfo.port_start}–{userInfo.port_end}</span>.
            {' '}Bind your app to a port in this range, then assign it a subdomain below.
          </p>
        )}

        {/* Existing mappings */}
        {records.length > 0 && (
          <div className="space-y-2">
            {records.map((r) => (
              <div key={r.subdomain} className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-400 font-mono truncate">
                    :{r.port} →{' '}
                    <a
                      href={`https://${r.subdomain}.app.3compute.org`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#54daf4] hover:underline"
                    >
                      {r.subdomain}.app.3compute.org
                    </a>
                  </div>
                </div>
                <a
                  href={`https://${r.subdomain}.app.3compute.org`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-white transition-colors flex-shrink-0"
                  title="Open"
                >
                  <ExternalLink size={13} />
                </a>
                <button
                  onClick={() => handleRelease(r.subdomain)}
                  className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                  title="Remove"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Claim form */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="number"
              placeholder={userInfo ? `${userInfo.port_start}` : 'Port'}
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="w-24 flex-shrink-0 bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[#54daf4]/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="subdomain"
                value={subdomain}
                onChange={(e) => handleSubdomainInput(e.target.value)}
                maxLength={32}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[#54daf4]/60"
              />
              {subdomain.length >= 3 && (
                <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs ${
                  checking ? 'text-gray-500' :
                  availability?.available ? 'text-green-400' : 'text-red-400'
                }`}>
                  {checking ? '…' : availability?.available ? '✓' : '✗'}
                </span>
              )}
            </div>
          </div>

          {subdomain.length >= 3 && !checking && availability && (
            <p className={`text-xs ${availability.available ? 'text-green-400' : 'text-red-400'}`}>
              {availability.available
                ? `${subdomain}.app.3compute.org is available`
                : availability.reason || 'Already taken'}
            </p>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            onClick={handleClaim}
            disabled={!canClaim}
            className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors ${
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
  );
}

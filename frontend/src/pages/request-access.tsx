import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, AtSign, Check, Mail, ShieldAlert } from 'lucide-react';
import { apiUrl } from '../util/UserData';
import { PrimaryButton } from '../components/ui/Buttons';
import LogoCsRoom from '../components/LogoCsRoom';
import Footer from '../components/Footer';

type Method = 'domain' | 'list' | 'code';

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: { sitekey: string; callback: (token: string) => void; 'error-callback'?: () => void; 'expired-callback'?: () => void }
      ) => string;
      reset: (id?: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit';

function emailDomain(email: string): string {
  const at = email.indexOf('@');
  return at >= 0 ? email.slice(at + 1).trim().toLowerCase() : '';
}

export default function RequestAccessPage() {
  const [fullName, setFullName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [method, setMethod] = useState<Method>('domain');
  const [studentEmails, setStudentEmails] = useState('');
  const [isNonGoogle, setIsNonGoogle] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Make the page scrollable (the IDE layout disables this globally).
  useEffect(() => {
    const prev = document.documentElement.style.overflowY;
    document.documentElement.style.overflowY = 'auto';
    return () => { document.documentElement.style.overflowY = prev; };
  }, []);

  // Pull the Turnstile site key from the backend so the SPA doesn't hardcode it.
  useEffect(() => {
    fetch(`${apiUrl}/public-config`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setTurnstileSiteKey(data.turnstile_site_key))
      .catch(() => setTurnstileSiteKey(''));
  }, []);

  // Inject the Turnstile script and render the widget once we have the site key.
  useEffect(() => {
    if (!turnstileSiteKey || submitted) return;

    const renderWidget = () => {
      if (!turnstileRef.current || !window.turnstile) return;
      if (widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: turnstileSiteKey,
        callback: (token: string) => setTurnstileToken(token),
        'error-callback': () => setTurnstileToken(null),
        'expired-callback': () => setTurnstileToken(null),
      });
    };

    if (window.turnstile) {
      renderWidget();
      return;
    }

    window.onTurnstileLoad = renderWidget;
    if (!document.querySelector(`script[src^="${TURNSTILE_SCRIPT.split('?')[0]}"]`)) {
      const s = document.createElement('script');
      s.src = TURNSTILE_SCRIPT;
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }
  }, [turnstileSiteKey, submitted]);

  const domain = emailDomain(schoolEmail);
  const canSubmit =
    !!fullName.trim() &&
    !!schoolName.trim() &&
    schoolEmail.includes('@') && schoolEmail.includes('.') &&
    !!turnstileToken &&
    !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${apiUrl}/access-requests`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          school_name: schoolName.trim(),
          school_email: schoolEmail.trim(),
          student_access_method: method,
          student_emails_text: method === 'list' ? studentEmails : null,
          is_non_google: isNonGoogle,
          turnstile_token: turnstileToken,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `${res.status} ${res.statusText}`);
      }
      setSubmitted(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong');
      // Reset Turnstile so the user can retry with a fresh token.
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.reset(widgetIdRef.current);
        setTurnstileToken(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="px-7 py-5 border-b border-rule-soft">
        <Link to="/" className="inline-flex items-center gap-2.5 no-underline text-ink-strong">
          <LogoCsRoom size={28} />
          <span className="font-semibold tracking-tight">CS Room</span>
        </Link>
      </header>

      <main className="flex-1 flex items-start justify-center px-6 py-14">
        <div className="w-full max-w-[640px]">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-ink-muted no-underline hover:text-ink-strong mb-6">
            <ArrowLeft size={14} />
            Back home
          </Link>

          {submitted ? (
            <SubmittedCard email={schoolEmail.trim()} isNonGoogle={isNonGoogle} />
          ) : (
            <>
              <h1 className="heading-1 mb-3">Request access</h1>
              <p className="body text-ink-muted mb-9">
                CS Room is free for teachers and their students. Tell us a bit about your school and we'll
                get you set up. Most teachers hear back within a day or two.
              </p>

              <form
                onSubmit={(e) => { e.preventDefault(); submit(); }}
                className="flex flex-col gap-7"
              >
                <Field label="Your full name">
                  <input
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputClass}
                    required
                  />
                </Field>

                <Field label="School name">
                  <input
                    type="text"
                    autoComplete="organization"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className={inputClass}
                    required
                  />
                </Field>

                <Field label="Your school email">
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                    <input
                      type="email"
                      autoComplete="email"
                      value={schoolEmail}
                      onChange={(e) => setSchoolEmail(e.target.value)}
                      className={`${inputClass} pl-9`}
                      required
                    />
                  </div>
                </Field>

                <fieldset className="flex flex-col gap-3">
                  <legend className="block text-sm font-semibold text-ink-strong mb-1.5">
                    How should your students get access?
                  </legend>
                  <RadioOption
                    name="student_access"
                    value="domain"
                    checked={method === 'domain'}
                    onChange={() => setMethod('domain')}
                    label={
                      <span>
                        Allow anyone with{' '}
                        <span className="font-mono text-ink-strong">
                          @{domain || 'your-school.edu'}
                        </span>{' '}
                        to sign up
                      </span>
                    }
                    hint="Easiest if your students all have school-issued email. A .edu email is not required."
                  />
                  <RadioOption
                    name="student_access"
                    value="list"
                    checked={method === 'list'}
                    onChange={() => setMethod('list')}
                    label="I'll provide a specific list of student emails"
                    hint="One per line or comma-separated."
                  >
                    {method === 'list' && (
                      <textarea
                        value={studentEmails}
                        onChange={(e) => setStudentEmails(e.target.value)}
                        placeholder={'student1@example.com\nstudent2@example.com'}
                        rows={5}
                        className={`${inputClass} mt-3 font-mono text-sm leading-relaxed`}
                      />
                    )}
                  </RadioOption>
                  <RadioOption
                    name="student_access"
                    value="code"
                    checked={method === 'code'}
                    onChange={() => setMethod('code')}
                    label="Send me a signup code I can share with students"
                    hint="Each student enters the code once to join the platform."
                  />
                </fieldset>

                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isNonGoogle}
                    onChange={(e) => setIsNonGoogle(e.target.checked)}
                    className="mt-[3px] w-4 h-4 accent-navy cursor-pointer"
                  />
                  <span className="text-sm text-ink-default">
                    My students don't have Google accounts
                  </span>
                </label>

                {isNonGoogle && (
                  <div className="bg-ochre-soft border border-ochre/30 rounded-lg p-4 -mt-3 flex gap-3">
                    <ShieldAlert size={18} className="text-ochre shrink-0 mt-0.5" />
                    <p className="text-sm text-ink-default leading-relaxed">
                      CS Room currently signs in via Google. If you select this, we'll work on adding
                      support for other providers — but your request may be delayed by up to 7 days while
                      we set that up.
                    </p>
                  </div>
                )}

                <div>
                  <div ref={turnstileRef} className="cf-turnstile" />
                  {turnstileSiteKey === '' && (
                    <p className="text-sm text-tomato mt-2">
                      CAPTCHA is currently misconfigured. Please email csroom@birdflop.com.
                    </p>
                  )}
                </div>

                {submitError && (
                  <div className="bg-tomato-soft border border-tomato/30 rounded-lg p-4 text-sm text-ink-default">
                    {submitError}
                  </div>
                )}

                <PrimaryButton
                  type="submit"
                  size="lg"
                  color="navy"
                  icon={<AtSign size={18} />}
                  disabled={!canSubmit}
                  className="self-start"
                >
                  {submitting ? 'Sending…' : 'Send request'}
                </PrimaryButton>
              </form>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

const inputClass =
  'w-full px-3 py-2.5 bg-paper-elevated border border-rule rounded-md text-ink-strong text-[15px] focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/15 transition-colors';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink-strong">{label}</span>
      {children}
    </label>
  );
}

function RadioOption({
  name, value, checked, onChange, label, hint, children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: React.ReactNode;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`border rounded-lg p-4 transition-colors cursor-pointer ${
        checked ? 'border-navy bg-navy-soft/40' : 'border-rule bg-paper-elevated hover:border-rule-soft'
      }`}
      onClick={onChange}
    >
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="radio"
          name={name}
          value={value}
          checked={checked}
          onChange={onChange}
          className="mt-[3px] w-4 h-4 accent-navy cursor-pointer"
        />
        <span className="flex-1">
          <span className="block text-[15px] text-ink-strong leading-snug">{label}</span>
          {hint && <span className="block text-sm text-ink-muted mt-1">{hint}</span>}
        </span>
      </label>
      {children}
    </div>
  );
}

function SubmittedCard({ email, isNonGoogle }: { email: string; isNonGoogle: boolean }) {
  return (
    <div className="bg-paper-elevated border border-rule rounded-xl p-10 shadow-md text-center">
      <div className="w-14 h-14 rounded-full bg-forest-soft text-forest mx-auto mb-4 inline-flex items-center justify-center">
        <Check size={28} />
      </div>
      <h1 className="heading-1 mb-3">Request received</h1>
      <p className="body text-ink-muted mb-2">
        We'll review your request and email <span className="font-semibold text-ink-strong">{email}</span> when you're approved.
      </p>
      <p className="body text-ink-muted">
        {isNonGoogle
          ? 'Since you don\'t use Google accounts, this may take up to 7 days while we add support.'
          : 'Most teachers hear back within a day or two.'}
      </p>
      <Link
        to="/"
        className="inline-block mt-7 text-navy font-semibold no-underline"
      >
        Back to home
      </Link>
    </div>
  );
}

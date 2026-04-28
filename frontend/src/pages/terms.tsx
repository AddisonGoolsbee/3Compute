import { useEffect, type ReactNode } from 'react';
import ObfuscatedEmail from '../components/ObfuscatedEmail';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="heading-3 mb-3">{title}</h2>
      <div className="body text-ink-default space-y-3">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  useEffect(() => {
    document.documentElement.style.overflowY = 'auto';
    return () => { document.documentElement.style.overflowY = 'hidden'; };
  }, []);

  return (
    <div className="max-w-[760px] mx-auto px-7 py-16">
      <h1 className="heading-1 mb-2">Terms of service and privacy policy</h1>
      <p className="body-sm mb-10">Effective date: April 28, 2026</p>

      <p className="body mb-10 text-ink-default">
        CS Room is a free educational platform operated by Birdflop, a 501(c)(3) nonprofit
        organization (EIN: 93-2401009). By using CS Room, you agree to the terms below.
        If you are under 13, you may only use CS Room with the involvement and consent of a
        parent, guardian, or teacher. CS Room is intended for teachers and students based
        in the United States; we do not direct the service to users outside the U.S.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 className="eyebrow text-navy mb-6">Terms of service</h2>

      <Section title="1. Acceptable use">
        <p>
          CS Room is provided for educational and personal learning purposes. You agree not to:
        </p>
        <ul className="list-disc list-inside space-y-1 text-ink-muted pl-2">
          <li>Use the platform for any unlawful purpose</li>
          <li>Upload, run, or distribute malicious code, malware, or content that attacks other systems</li>
          <li>Attempt to access other users' environments or data</li>
          <li>Abuse platform resources (e.g., cryptocurrency mining, coordinated attacks)</li>
          <li>Upload content that is obscene, harassing, or violates the rights of others</li>
        </ul>
        <p>
          We reserve the right to suspend or terminate access for any violation of these terms,
          at our sole discretion and without advance notice.
        </p>
      </Section>

      <Section title="2. File storage and admin access">
        <p>
          Files you store in your CS Room environment are hosted on Birdflop infrastructure.
          Birdflop administrators have the technical ability
          to view the contents of any file stored on the platform. We access files
          only when necessary to operate, troubleshoot, or enforce these terms. We do not
          routinely monitor file contents.
        </p>
        <p>
          If you are a student in a classroom, your instructor may also have access to files
          in the shared classroom directory.
        </p>
        <p>
          Do not store sensitive personal information, passwords, private keys, or confidential
          data on CS Room.
        </p>
      </Section>

      <Section title="3. Service availability">
        <p>
          CS Room is provided free of charge and on an as-is, as-available basis. We make no
          guarantees of uptime, data retention, or continuity of service. We may modify,
          suspend, or discontinue the platform at any time.
        </p>
        <p>
          You are responsible for maintaining your own backups of any work you wish to keep.
        </p>
      </Section>

      <Section title="4. Intellectual property">
        <p>
          You retain ownership of code and files you create. By using CS Room, you grant
          Birdflop a limited license to host, store, and transmit your content as necessary
          to provide the service.
        </p>
        <p>
          The CS Room platform, its interface, and its code are the property of Birdflop.
        </p>
      </Section>

      <Section title="5. Disclaimer of warranties">
        <p>
          CS Room is provided without warranty of any kind, express or implied. Birdflop is
          not liable for any loss of data, loss of work, or damages arising from your use of
          the platform.
        </p>
      </Section>

      {/* ------------------------------------------------------------------ */}
      <h2 className="eyebrow text-navy mb-6 mt-10">Privacy policy</h2>

      <Section title="6. Information we collect">
        <p>When you sign in with Google, we receive and store:</p>
        <ul className="list-disc list-inside space-y-1 text-ink-muted pl-2">
          <li>Your Google account name</li>
          <li>Your Google account email address</li>
          <li>A unique identifier from Google used to recognize your account</li>
        </ul>
        <p>
          We also store files you upload or create in your coding environment, and records
          of classroom membership if you join or create a classroom.
        </p>
        <p>
          We use Google Analytics to understand how CS Room is used, to improve the
          platform, and to measure the effectiveness of our Google Search Ads (for example,
          whether visitors who arrive from an ad go on to sign up). Google Analytics may
          set cookies and collect information such as your IP address, device and browser
          type, pages viewed, referring URL, and approximate location. This information is
          processed by Google in accordance with{' '}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-navy font-semibold hover:underline"
          >
            Google's privacy policy
          </a>
          . We do not
          sell or share it with third parties.
        </p>
        <p>
          We do not collect payment information.
        </p>
      </Section>

      <Section title="7. How we use your information">
        <p>We use the information we collect solely to:</p>
        <ul className="list-disc list-inside space-y-1 text-ink-muted pl-2">
          <li>Identify your account and provide access to your environment</li>
          <li>Associate your work with your account</li>
          <li>Allow instructors to manage classroom membership</li>
          <li>Contact you about your account if necessary</li>
          <li>
            Send occasional product updates or short surveys about how
            CS Room is going, with an option to opt-out.
          </li>
        </ul>
        <p>
          We do not sell, rent, or share your personal information with third parties, except
          as required by law.
        </p>
      </Section>

      <Section title="8. Data retention">
        <p>
          Your account data and files are retained for as long as your account is active.
          You may request deletion of your account and associated data by emailing us at the
          address below. We will process deletion requests within a reasonable timeframe.
        </p>
      </Section>

      <Section title="9. Children's privacy">
        <p>
          CS Room is intended for use in educational settings and may be used by students
          under 13 only with teacher or parental oversight. We do not knowingly collect
          personal information from children under 13 outside of an educational context.
          Teachers and parents are responsible for supervising student use and ensuring
          appropriate content is stored on the platform.
        </p>
      </Section>

      <Section title="10. Changes to these terms">
        <p>
          We may update these terms from time to time. The effective date at the top of this
          page will reflect the most recent revision. Continued use of CS Room after changes
          are posted constitutes acceptance of the updated terms.
        </p>
      </Section>

      {/* ------------------------------------------------------------------ */}
      <div className="border-t border-rule-soft pt-8 mt-4">
        <h2 className="heading-4 mb-2">Contact</h2>
        <p className="body text-ink-default">
          Questions about these terms or your data? Email us at{' '}
          <ObfuscatedEmail
            className="text-navy font-semibold hover:underline cursor-pointer"
          />
          .
        </p>
        <p className="text-xs text-ink-subtle mt-4">
          Birdflop is a registered 501(c)(3) nonprofit organization. EIN: 93-2401009.
        </p>
      </div>
    </div>
  );
}

import { useEffect, type ReactNode } from 'react';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold text-white mb-3">{title}</h2>
      <div className="text-gray-300 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  useEffect(() => {
    document.documentElement.style.overflowY = 'auto';
    return () => { document.documentElement.style.overflowY = 'hidden'; };
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 py-16 text-sm">
      <h1 className="text-3xl font-bold text-white mb-2">Terms of Service and Privacy Policy</h1>
      <p className="text-gray-500 mb-10">Effective date: March 23, 2026</p>

      <p className="text-gray-300 leading-relaxed mb-10">
        3Compute is a free educational platform operated by Birdflop, a 501(c)(3) nonprofit
        organization (EIN: 93-2401009). By using 3Compute, you agree to the terms below.
        If you are under 13, you may only use 3Compute with the involvement and consent of a
        parent, guardian, or teacher.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2 className="text-lg font-semibold text-[#54daf4] uppercase tracking-wide mb-6">
        Terms of Service
      </h2>

      <Section title="1. Acceptable Use">
        <p>
          3Compute is provided for educational and personal learning purposes. You agree not to:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-400 pl-2">
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

      <Section title="2. File Storage and Admin Access">
        <p>
          Files you store in your 3Compute environment are hosted on Birdflop infrastructure.
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
          data on 3Compute.
        </p>
      </Section>

      <Section title="3. Service Availability">
        <p>
          3Compute is provided free of charge and on an as-is, as-available basis. We make no
          guarantees of uptime, data retention, or continuity of service. We may modify,
          suspend, or discontinue the platform at any time.
        </p>
        <p>
          You are responsible for maintaining your own backups of any work you wish to keep.
        </p>
      </Section>

      <Section title="4. Intellectual Property">
        <p>
          You retain ownership of code and files you create. By using 3Compute, you grant
          Birdflop a limited license to host, store, and transmit your content as necessary
          to provide the service.
        </p>
        <p>
          The 3Compute platform, its interface, and its code are the property of Birdflop.
        </p>
      </Section>

      <Section title="5. Disclaimer of Warranties">
        <p>
          3Compute is provided without warranty of any kind, express or implied. Birdflop is
          not liable for any loss of data, loss of work, or damages arising from your use of
          the platform.
        </p>
      </Section>

      {/* ------------------------------------------------------------------ */}
      <h2 className="text-lg font-semibold text-[#54daf4] uppercase tracking-wide mb-6 mt-10">
        Privacy Policy
      </h2>

      <Section title="6. Information We Collect">
        <p>When you sign in with Google, we receive and store:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-400 pl-2">
          <li>Your Google account name</li>
          <li>Your Google account email address</li>
          <li>A unique identifier from Google used to recognize your account</li>
        </ul>
        <p>
          We also store files you upload or create in your coding environment, and records
          of classroom membership if you join or create a classroom.
        </p>
        <p>
          We do not collect payment information. We do not use third-party analytics or
          advertising trackers.
        </p>
      </Section>

      <Section title="7. How We Use Your Information">
        <p>We use the information we collect solely to:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-400 pl-2">
          <li>Identify your account and provide access to your environment</li>
          <li>Associate your work with your account</li>
          <li>Allow instructors to manage classroom membership</li>
          <li>Contact you about your account if necessary</li>
        </ul>
        <p>
          We do not sell, rent, or share your personal information with third parties, except
          as required by law.
        </p>
      </Section>

      <Section title="8. Data Retention">
        <p>
          Your account data and files are retained for as long as your account is active.
          You may request deletion of your account and associated data by emailing us at the
          address below. We will process deletion requests within a reasonable timeframe.
        </p>
      </Section>

      <Section title="9. Children's Privacy">
        <p>
          3Compute is intended for use in educational settings and may be used by students
          under 13 only with teacher or parental oversight. We do not knowingly collect
          personal information from children under 13 outside of an educational context.
          Teachers and parents are responsible for supervising student use and ensuring
          appropriate content is stored on the platform.
        </p>
      </Section>

      <Section title="10. Changes to These Terms">
        <p>
          We may update these terms from time to time. The effective date at the top of this
          page will reflect the most recent revision. Continued use of 3Compute after changes
          are posted constitutes acceptance of the updated terms.
        </p>
      </Section>

      {/* ------------------------------------------------------------------ */}
      <div className="border-t border-gray-700 pt-8 mt-4">
        <h2 className="text-base font-semibold text-white mb-2">Contact</h2>
        <p className="text-gray-400">
          Questions about these terms or your data? Email us at{' '}
          <a
            href="mailto:3compute@birdflop.com"
            className="text-[#54daf4] hover:underline"
          >
            3compute@birdflop.com
          </a>
          .
        </p>
        <p className="text-gray-600 text-xs mt-4">
          Birdflop is a registered 501(c)(3) nonprofit organization. EIN: 93-2401009.
        </p>
      </div>
    </div>
  );
}

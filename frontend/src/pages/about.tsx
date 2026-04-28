import { useEffect, type ReactNode } from 'react';
import { Heart, ExternalLink } from 'lucide-react';
import Footer from '../components/Footer';
import ObfuscatedEmail from '../components/ObfuscatedEmail';
import { PrimaryButton } from '../components/ui/Buttons';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="heading-3 mb-3 text-ink-strong">{title}</h2>
      <div className="body text-ink-default space-y-3">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  useEffect(() => {
    document.documentElement.style.overflowY = 'auto';
    return () => { document.documentElement.style.overflowY = 'hidden'; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <main className="flex-1">
        <div className="max-w-[760px] mx-auto px-7 py-16">
          <h1 className="heading-1 mb-4">About CS Room</h1>
          <p className="body-lg text-ink-default mb-3">
            CS Room is a free, browser-based coding classroom for teachers and
            their students. Each user gets an isolated Linux environment, a
            full editor, and a real terminal. There is no installation, no
            payment, and no enterprise tier.
          </p>
          <p className="body text-ink-muted mb-12">
            CS Room is operated by Birdflop, a U.S.-based 501(c)(3) nonprofit,
            as part of its broader work to make computer science more
            accessible.
          </p>

          {/* ----- Mission ------------------------------------------------- */}
          <Section title="Our mission">
            <p>
              We built CS Room to remove the technical setup that often stands
              between a curious learner and the work they want to do. We provide
              free coding environments, classroom tools for teachers,
              and lessons that work out of the box.
            </p>
            <p>
              This work is part of the formal mission of our parent
              organization, Birdflop:
            </p>
            <blockquote className="bg-paper-elevated border-l-[3px] border-navy rounded-r-md py-4 pl-5 pr-4 my-2 italic text-ink-strong">
              Birdflop's mission is to promote and encourage interest in
              technology and computer science, generally but not exclusively
              through affordable and accessible virtual server hosting.
            </blockquote>
          </Section>

          {/* ----- What we do --------------------------------------------- */}
          <Section title="What CS Room offers">
            <ul className="list-disc list-inside space-y-1.5 text-ink-default pl-2">
              <li>
                <strong className="text-ink-strong">Isolated environments.</strong>{' '}
                Every user gets their own Linux container with a terminal,
                editor, and file system.
              </li>
              <li>
                <strong className="text-ink-strong">Classroom management.</strong>{' '}
                Teachers create classes and view student
                work from one place.
              </li>
              <li>
                <strong className="text-ink-strong">No setup, no cost.</strong>{' '}
                Students sign in with Google and start coding for free
              </li>
            </ul>
          </Section>

          {/* ----- Who we serve ------------------------------------------ */}
          <Section title="Who CS Room is for">
            <ul className="list-disc list-inside space-y-1.5 text-ink-default pl-2">
              <li>K-12 and higher-ed teachers running coding classes.</li>
              <li>Students learning to code for the first time.</li>
              <li>Self-directed learners and curious tinkerers.</li>
            </ul>
            <p>
              Across these groups, our priority is consistent: cost and
              technical complexity should not stand between learners and the
              resources they need.
            </p>
          </Section>

          {/* ----- Nonprofit status -------------------------------------- */}
          <Section title="Nonprofit status">
            <p>
              CS Room is a program of Birdflop, a registered 501(c)(3)
              tax-exempt organization in the United States (EIN: 93-2401009). Donations made to
              Birdflop are tax-deductible to the extent permitted by U.S. law.
            </p>
          </Section>

          {/* ----- Support ------------------------------------------------ */}
          <div className="bg-tomato-soft border border-tomato/30 rounded-xl p-7 my-10">
            <h2 className="heading-3 mb-2 text-ink-strong">Support our work</h2>
            <p className="body text-ink-default mb-5">
              CS Room is free for the students and teachers who use it, and it
              stays that way because of people who choose to give. Every
              donation goes directly toward running student environments,
              supporting teachers when they reach out, and building the next
              set of features. Your contribution is what keeps the door open
              for the next class.
            </p>
            <a
              href="https://www.paypal.com/US/fundraiser/charity/5036975"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-tomato text-white font-semibold px-5 py-[11px] rounded-md inline-flex items-center gap-2 shadow-cta no-underline transition-[filter] duration-150 hover:brightness-105"
            >
              <Heart size={16} /> Donate
              <ExternalLink size={12} className="opacity-70" />
            </a>
          </div>

          {/* ----- Contact ------------------------------------------------ */}
          <Section title="Contact">
            <p>
              Questions, partnership ideas, or feedback? We'd love to hear from
              you.
            </p>
            <p>
              <ObfuscatedEmail
                icon
                className="text-navy font-semibold no-underline hover:underline cursor-pointer"
              />
            </p>
          </Section>

          <div className="mt-10">
            <PrimaryButton color="navy" onClick={() => { window.location.href = '/'; }}>
              Back to home
            </PrimaryButton>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

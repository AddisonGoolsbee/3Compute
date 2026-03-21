import { useEffect } from 'react';
import { Link } from 'react-router';
import { LogoBirdflop } from '@luminescent/ui-react';
import {
  Terminal,
  Users,
  LayoutTemplate,
  ArrowRight,
  Code,
  BookOpen,
  Share2,
  UserPlus,
  Laptop,
  Send,
  GraduationCap,
} from 'lucide-react';
import { apiUrl } from '../util/UserData';

export default function LandingPage() {
  useEffect(() => {
    document.documentElement.style.overflowY = 'auto';
    return () => {
      document.documentElement.style.overflowY = 'hidden';
    };
  }, []);

  return (
    <div className="-mt-20 text-white">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(84,218,244,0.12)_0%,_rgba(84,94,182,0.06)_40%,_transparent_70%)]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(rgba(84, 218, 244, 0.05) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl mx-auto">
          <div className="mb-6 relative">
            <div className="absolute -inset-4 bg-[#54daf4]/5 rounded-full blur-2xl" />
            <LogoBirdflop
              size={110}
              fillGradient={['#54daf4', '#545eb6']}
              className="relative"
            />
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4">
            3Compute
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mb-3 leading-relaxed">
            A free coding classroom for teachers and students.
            <br />
            No setup required. Built by Birdflop, a 501(c)(3) nonprofit.
          </p>

          <div className="flex flex-wrap gap-4 justify-center mt-6">
            <a
              href={`${apiUrl}/auth/login`}
              className="lum-btn lum-pad-md text-lg rounded-lg bg-[#2a9bb8] hover:bg-[#238da8] text-white font-semibold inline-flex items-center gap-2 transition-colors shadow-lg shadow-[#2a9bb8]/20"
            >
              Sign in with Google
              <ArrowRight size={20} />
            </a>
            <a
              href="#how-it-works"
              className="lum-btn lum-pad-md text-lg rounded-lg border border-gray-600 hover:border-gray-400 font-semibold inline-flex items-center gap-2 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById('how-it-works')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              How it works
            </a>
            <Link
              to="/lessons"
              className="lum-btn lum-pad-md text-lg rounded-lg border border-gray-600 hover:border-gray-400 font-semibold inline-flex items-center gap-2 transition-colors"
            >
              Browse Lessons
              <LayoutTemplate size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-gray-700/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            What you get
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Terminal size={28} />}
              title="Python in the browser"
              description="Students get a full coding environment with no installation. Open a browser and start writing code."
            />
            <FeatureCard
              icon={<Users size={28} />}
              title="Classroom management"
              description="Create a classroom, share an access code, and students join with one click. See everyone's work in one place."
            />
            <FeatureCard
              icon={<LayoutTemplate size={28} />}
              title="Ready-to-use lessons"
              description="Import pre-built projects directly into your classroom. Each comes with a lesson plan and student-facing README."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 border-t border-gray-700/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            How it works
          </h2>

          <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#54daf4]/10 flex items-center justify-center">
                  <BookOpen size={20} className="text-[#54daf4]" />
                </div>
                <h3 className="text-xl font-semibold">For Teachers</h3>
              </div>
              <div className="space-y-5">
                <Step number={1} icon={<Code size={18} />} text="Create a classroom" />
                <Step number={2} icon={<Share2 size={18} />} text="Import a lesson or start from scratch" />
                <Step number={3} icon={<Send size={18} />} text="Share the access code with students" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#54daf4]/10 flex items-center justify-center">
                  <UserPlus size={20} className="text-[#54daf4]" />
                </div>
                <h3 className="text-xl font-semibold">For Students</h3>
              </div>
              <div className="space-y-5">
                <Step number={1} icon={<UserPlus size={18} />} text="Join with the code your teacher gave you" />
                <Step number={2} icon={<Laptop size={18} />} text="Open your personal coding environment" />
                <Step number={3} icon={<Send size={18} />} text="Write, run, and submit your code" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 border-t border-gray-700/50">
        <div className="max-w-xl mx-auto text-center">
          <GraduationCap size={32} className="mx-auto mb-4 text-[#54daf4]" />
          <h2 className="text-2xl font-bold mb-3">Free for everyone</h2>
          <p className="text-gray-400 mb-6">
            3Compute is free for schools, clubs, and individual learners. No credit card, no trial period.
          </p>
          <a
            href={`${apiUrl}/auth/login`}
            className="lum-btn lum-pad-md text-lg rounded-lg bg-[#2a9bb8] hover:bg-[#238da8] text-white font-semibold inline-flex items-center gap-2 transition-colors shadow-lg shadow-[#2a9bb8]/20"
          >
            Get started
            <ArrowRight size={20} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-700/50 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <LogoBirdflop size={20} fillGradient={['#54daf4', '#545eb6']} />
            <span className="text-gray-400 text-sm">3Compute by Birdflop</span>
          </div>
          <p className="text-gray-600 text-xs">
            &copy; 2025&ndash;2026 Birdflop. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="lum-card rounded-xl p-7 border border-gray-700 hover:border-[#54daf4]/30 transition-colors">
      <div className="w-11 h-11 rounded-lg bg-[#54daf4]/10 flex items-center justify-center text-[#54daf4] mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function Step({
  number,
  icon,
  text,
}: {
  number: number;
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#54daf4]/10 flex items-center justify-center text-sm font-bold text-[#54daf4]">
        {number}
      </div>
      <div className="flex items-center gap-2 pt-0.5">
        <span className="text-gray-400">{icon}</span>
        <span className="text-sm">{text}</span>
      </div>
    </div>
  );
}

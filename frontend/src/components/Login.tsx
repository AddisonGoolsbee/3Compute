import { SiGoogle } from '@icons-pack/react-simple-icons';
import { LogoBirdflop } from '@luminescent/ui-react';
import { backendUrl } from '../util/UserData';
import FourSquares from './4Squares';

export default function Login() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center mt-5 z-20 fade-in">
      <div className="lum-card flex-row items-center p-32 pl-24 fade-in-delayed rounded-4xl lum-bg-gray-950/50 gap-18">
        <LogoBirdflop size={200} fillGradient={['#54daf4', '#545eb6']} />

        <div className="flex flex-col">
          <h1 className="mt-0! mb-4!">3Compute</h1>
          <p className="max-w-80 mb-8">
            Start coding instantly for free
          </p>
          <p className="mb-2">
            Sign in with:
          </p>
          <a
            className="lum-btn lum-btn-p-3 lum-bg-gray-900 hover:lum-bg-gray-700 mb-2"
            href={`${backendUrl}/login?type=google`}
          >
            <SiGoogle size={20} />
            Google
          </a>
          <a
            className="lum-btn lum-btn-p-3 lum-bg-gray-900 hover:lum-bg-gray-700 mb-2"
            href={`${backendUrl}/login?type=microsoft`}
          >
            <FourSquares size={20} />
            Microsoft
          </a>
        </div>
      </div>
    </div>
  );
}

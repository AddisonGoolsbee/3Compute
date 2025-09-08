import BlurOverlay from '../components/BlurOverlay';
import { School } from 'lucide-react';

export default function Layout() {

  return (
    <>
      <BlurOverlay />
      <div className="h-[calc(100svh-6rem)] flex flex-col gap-1 max-w-6xl mx-auto">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="lum-card p-28 max-w-3xl rounded-4xl">
            <h3 className="mt-0! flex items-center gap-4">
              <School size={32} />
              Join a classroom to get started!
            </h3>
            <p>
              Classrooms are a way for educators to manage their students on 3Compute. If you have been given a classroom code,
              please enter it below to join the classroom and access the assignments.
            </p>
            <form className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="Enter classroom code"
                className="lum-input flex-1"
              />
              <button type="submit" className="lum-btn lum-bg-blue-600">
                Join
              </button>
              <button className="lum-btn lum-bg-transparent text-blue-200">
                Create a classroom
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

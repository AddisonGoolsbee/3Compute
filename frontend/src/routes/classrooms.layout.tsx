import { useRef } from 'react';
import BlurOverlay from '../components/BlurOverlay';
import { Save, School, X } from 'lucide-react';
import { getClasses } from '@luminescent/ui-react';

export default function Layout() {
  const modalRef = useRef<HTMLDialogElement>(null);
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
            </form>
            <div>
              <button className="lum-btn lum-bg-transparent text-blue-200"
                onClick={() => modalRef.current?.showModal()}
              >
                Create a classroom
              </button>
            </div>
          </div>
        </div>
      </div>
      <dialog ref={modalRef}
        className={getClasses({
          'm-auto hidden open:flex text-lum-text': true,
          'lum-card drop-shadow-2xl backdrop-blur-xl min-w-1/4': true,
          'open:animate-in open:fade-in open:slide-in-from-top-8 open:anim-duration-300': true,
          'animate-out fade-out slide-in-from-top-8 anim-duration-300': true,
        })}>
        <div className="flex flex-col">
          <h3 className="mt-0!">
            Create a Classroom
          </h3>
          <p className="max-w-md">
            Create a new classroom to manage your students on 3Compute. You will be able to invite students to join your classroom after it is created.
          </p>

          <hr/>
          <form className="flex flex-col gap-2" id="create-classroom-form" method="dialog">
            <label htmlFor="classroom-name">
              Classroom name
            </label>
            <input
              type="text"
              placeholder="My Classroom"
              className="lum-input"
              id="classroom-name"
            />
            <label htmlFor="classroom-description">
              Classroom description
            </label>
            <textarea className="lum-input" placeholder="This is my classroom" id="classroom-description" />
          </form>
          <hr/>
          <div className="flex gap-2 justify-end">
            <button className="lum-btn" onClick={() => {
              modalRef.current?.close();
            }}>
              <X size={20} /> Cancel
            </button>
            <button form="create-classroom-form" className="lum-btn lum-bg-green-900/50 hover:lum-bg-green-900" id="create-classroom">
              <Save size={20} /> Create Classroom
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

import BlurOverlay from '../components/BlurOverlay';
import { School } from 'lucide-react';

export default function Layout() {

  return (
    <>
      <BlurOverlay />
      <div className="h-[calc(100svh-6rem)] flex flex-col gap-1 max-w-6xl mx-auto">
        <h1 className="flex items-center gap-6">
          <School size={56} />
          Classrooms
        </h1>
      </div>
    </>
  );
}

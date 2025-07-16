import { SiGit } from '@icons-pack/react-simple-icons';

export default function GitButton() {

  return <button className="lum-btn lum-btn-p-1 rounded-lum-2 gap-1 text-xs lum-bg-orange-950 hover:lum-bg-orange-900">
    <SiGit size={16} />
    Clone from Git
  </button>;
}

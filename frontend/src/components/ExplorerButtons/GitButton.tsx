import { SiGit } from '@icons-pack/react-simple-icons';

export default function GitButton() {
  return (
    <button
      className="bg-paper-elevated text-ink-default border border-ide-rule px-2 py-1.5 rounded-sm text-xs font-medium cursor-pointer font-sans inline-flex items-center justify-center gap-1.5 hover:bg-paper-tinted transition-colors"
    >
      <SiGit size={14} />
      Clone from Git
    </button>
  );
}

// Recolored spot illustrations for paper background
const SpotLesson = ({ size = 220 }) => (
  <svg width={size} height={size} viewBox="0 0 240 240" fill="none">
    <rect x="50" y="60" width="120" height="150" rx="6" fill="#f5f0e3"/>
    <rect x="60" y="50" width="120" height="150" rx="6" fill="#fff" stroke="#d8cfb8" strokeWidth="1.5"/>
    <rect x="70" y="40" width="120" height="150" rx="6" fill="#fff" stroke="#2d6a4f" strokeWidth="1.5"/>
    <rect x="80" y="60" width="60" height="6" rx="2" fill="#e09733"/>
    <rect x="80" y="78" width="100" height="3" rx="1.5" fill="#b8b4a8"/>
    <rect x="80" y="88" width="90" height="3" rx="1.5" fill="#b8b4a8"/>
    <rect x="80" y="98" width="80" height="3" rx="1.5" fill="#b8b4a8"/>
    <rect x="80" y="118" width="100" height="40" rx="3" fill="#fbf7ec"/>
    <text x="86" y="135" fill="#6d3aed" style={{font: '500 9px DM Mono, monospace'}}>def hello():</text>
    <text x="86" y="148" fill="#1a1a1f" style={{font: '500 9px DM Mono, monospace'}}>{'    '}print("hi")</text>
    <rect x="80" y="168" width="50" height="3" rx="1.5" fill="#b8b4a8"/>
    <rect x="80" y="176" width="70" height="3" rx="1.5" fill="#b8b4a8"/>
  </svg>
);

const SpotClassroom = ({ size = 220 }) => (
  <svg width={size} height={size} viewBox="0 0 240 240" fill="none">
    <circle cx="120" cy="120" r="70" fill="none" stroke="#d8cfb8" strokeWidth="1.5" strokeDasharray="3 5"/>
    <rect x="105" y="40" width="30" height="30" rx="6" fill="#e85d3f"/>
    <circle cx="120" cy="55" r="6" fill="#fff"/>
    {[0, 1, 2, 3, 4, 5, 6].map((i) => {
      const angle = (Math.PI / 7) * i + Math.PI;
      const x = 120 + Math.cos(angle) * 70 - 13;
      const y = 120 + Math.sin(angle) * 70 - 13;
      const colors = ['#1f4e79','#2d6a4f','#e09733','#6d3aed','#1f4e79','#2d6a4f','#e09733'];
      return (
        <g key={i}>
          <rect x={x} y={y} width="26" height="26" rx="5" fill="#fff" stroke={colors[i]} strokeWidth="1.5"/>
          <circle cx={x + 13} cy={y + 11} r="4.5" fill={colors[i]}/>
        </g>
      );
    })}
  </svg>
);

const SpotEditor = ({ size = 220 }) => (
  <svg width={size} height={size} viewBox="0 0 240 240" fill="none">
    <rect x="30" y="50" width="180" height="140" rx="8" fill="#fff" stroke="#d8cfb8" strokeWidth="1.5"/>
    <rect x="30" y="50" width="180" height="22" rx="8" fill="#f5f0e3"/>
    <rect x="30" y="64" width="180" height="8" fill="#f5f0e3"/>
    <circle cx="44" cy="61" r="3.5" fill="#e85d3f"/>
    <circle cx="56" cy="61" r="3.5" fill="#e09733"/>
    <circle cx="68" cy="61" r="3.5" fill="#2d6a4f"/>
    <text x="48" y="92" fill="#6d3aed" style={{font: '500 11px DM Mono, monospace'}}>def</text>
    <text x="72" y="92" fill="#1a1a1f" style={{font: '500 11px DM Mono, monospace'}}>welcome():</text>
    <text x="60" y="108" fill="#6d3aed" style={{font: '500 11px DM Mono, monospace'}}>print</text>
    <text x="92" y="108" fill="#2d6a4f" style={{font: '500 11px DM Mono, monospace'}}>"hello!"</text>
    <text x="48" y="132" fill="#908e8a" style={{font: '500 11px DM Mono, monospace'}}># try changing</text>
    <text x="48" y="148" fill="#908e8a" style={{font: '500 11px DM Mono, monospace'}}># the message</text>
    <rect x="48" y="160" width="50" height="20" rx="4" fill="#2d6a4f"/>
    <text x="60" y="174" fill="#fff" style={{font: '600 10px DM Sans, sans-serif'}}>Run ▸</text>
  </svg>
);

const SpotGlobe = ({ size = 180 }) => (
  <svg width={size} height={size} viewBox="0 0 240 240" fill="none">
    <circle cx="120" cy="120" r="74" fill="#fff" stroke="#d8cfb8" strokeWidth="1.5"/>
    <ellipse cx="120" cy="120" rx="74" ry="32" fill="none" stroke="#1f4e79" strokeWidth="1.5"/>
    <ellipse cx="120" cy="120" rx="32" ry="74" fill="none" stroke="#1f4e79" strokeWidth="1.5"/>
    <line x1="46" y1="120" x2="194" y2="120" stroke="#1f4e79" strokeWidth="1.5"/>
    <circle cx="120" cy="76" r="7" fill="#e85d3f"/>
    <circle cx="86" cy="138" r="7" fill="#e09733"/>
    <circle cx="160" cy="100" r="7" fill="#2d6a4f"/>
    <line x1="120" y1="76" x2="86" y2="138" stroke="#1a1a1f" strokeWidth="1" strokeDasharray="2 3"/>
    <line x1="86" y1="138" x2="160" y2="100" stroke="#1a1a1f" strokeWidth="1" strokeDasharray="2 3"/>
  </svg>
);

window.SpotLesson = SpotLesson;
window.SpotClassroom = SpotClassroom;
window.SpotEditor = SpotEditor;
window.SpotGlobe = SpotGlobe;

// Lucide icons inlined — codebase uses lucide-react for everything.
// Stroke 2, currentColor, 16–28px depending on usage.
const Ico = ({ d, size = 16, stroke = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

// Each icon ↔ lucide-react export name (kept identical to the source).
const I = {
  Terminal:    p => <Ico {...p} d={["M4 17l6-6-6-6", "M12 19h8"]} />,
  Users:       p => <Ico {...p} d={["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2","M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z","M22 21v-2a4 4 0 0 0-3-3.87","M16 3.13a4 4 0 0 1 0 7.75"]} />,
  School:      p => <Ico {...p} d={["M14 22v-4a2 2 0 1 0-4 0v4","M18 5v17","M6 5v17","m4 6 8-4 8 4","M18 22h2a2 2 0 0 0 2-2V6.5L12 2 2 6.5V20a2 2 0 0 0 2 2h2"]} />,
  GraduationCap:p => <Ico {...p} d={["M22 10v6","M2 10l10-5 10 5-10 5z","M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"]} />,
  BookOpen:    p => <Ico {...p} d={["M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z","M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"]} />,
  LayoutTemplate: p => <Ico {...p} d={["M21 3H3v7h18z","M21 14h-9v7h9z","M9 14H3v7h6z"]} />,
  ArrowRight:  p => <Ico {...p} d={["M5 12h14","m12 5 7 7-7 7"]} />,
  ChevronRight:p => <Ico {...p} d="m9 18 6-6-6-6" />,
  ChevronDown: p => <Ico {...p} d="m6 9 6 6 6-6" />,
  Code:        p => <Ico {...p} d={["m16 18 6-6-6-6","m8 6-6 6 6 6"]} />,
  FileText:    p => <Ico {...p} d={["M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z","M14 2v6h6","M16 13H8","M16 17H8","M10 9H8"]} />,
  Folder:      p => <Ico {...p} d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z" />,
  Eye:         p => <Ico {...p} d={["M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z","M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"]} />,
  Plus:        p => <Ico {...p} d={["M12 5v14","M5 12h14"]} />,
  Upload:      p => <Ico {...p} d={["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","m17 8-5-5-5 5","M12 3v12"]} />,
  Play:        p => <Ico {...p} d="M6 3v18l15-9z" />,
  Heart:       p => <Ico {...p} d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />,
  Globe:       p => <Ico {...p} d={["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z","M2 12h20","M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"]} />,
  Zap:         p => <Ico {...p} d="M13 2 3 14h9l-1 8 10-12h-9z" />,
  Server:      p => <Ico {...p} d={["M2 4h20v6H2z","M2 14h20v6H2z","M6 7h.01","M6 17h.01"]} />,
  FlaskConical:p => <Ico {...p} d={["M10 2v7.31","M14 9.3V1.99","M8.5 2h7","M14 9.3a7 7 0 0 1-1.5 13.7c-1.86 0-3.41-.85-4.6-1.85","M5.52 16h12.96","M6 14a7 7 0 0 0 4 6.32"]} />,
  Send:        p => <Ico {...p} d="m22 2-7 20-4-9-9-4z" />,
  UserPlus:    p => <Ico {...p} d={["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2","M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z","M19 8v6","M22 11h-6"]} />,
  Laptop:      p => <Ico {...p} d={["M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9","M2 20h20","M2 16h20","M6 20v-2","M18 20v-2"]} />,
  Share2:      p => <Ico {...p} d={["M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z","M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z","M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z","m8.59 13.51 6.83 3.98","m15.41 6.51-6.82 3.98"]} />,
  LogOut:      p => <Ico {...p} d={["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4","m16 17 5-5-5-5","M21 12H9"]} />,
  LogIn:       p => <Ico {...p} d={["M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4","m10 17 5-5-5-5","M15 12H3"]} />,
  Search:      p => <Ico {...p} d={["M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z","m21 21-4.35-4.35"]} />,
  X:           p => <Ico {...p} d={["M18 6 6 18","m6 6 12 12"]} />,
  RefreshCw:   p => <Ico {...p} d={["M3 12a9 9 0 0 1 15-6.7L21 8","M21 3v5h-5","M21 12a9 9 0 0 1-15 6.7L3 16","M3 21v-5h5"]} />,
  ExternalLink:p => <Ico {...p} d={["M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6","m15 3 6 0 0 6","m10 14 11-11"]} />,
};

window.I = I;

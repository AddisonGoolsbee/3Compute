import { clientLoader } from "./root";

// eslint-disable-next-line react-refresh/only-export-components
export { clientLoader };

export default function App() {
  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="lum-card h-[80dvh] max-w-7xl w-full">
          <div className="lum-loading animate-spin w-8 h-8 border-3" />
        </div>
      </div>
    </>
  );
}

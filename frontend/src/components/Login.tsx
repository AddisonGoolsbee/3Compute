import { SiGoogle } from "@icons-pack/react-simple-icons";
// @ts-expect-error types not working yet
import { LogoBirdflop } from "@luminescent/ui-react";

const backendUrl =
  import.meta.env.VITE_ENVIRONMENT === "production"
    ? import.meta.env.VITE_PROD_BACKEND_URL
    : import.meta.env.VITE_BACKEND_URL;

export default function Login() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center mt-5 z-20 fade-in">
      <div className="lum-card flex-row items-center p-16 pl-10 fade-in-delayed">
        <LogoBirdflop size={200} fillGradient={["#54daf4", "#545eb6"]} />

        <div>
          <h1 className="mt-0!">3Compute</h1>
          <a
            className="lum-btn lum-btn-p-3 lum-bg-blue-800 hover:lum-bg-blue-700 justify-center"
            href={`${backendUrl}/login`}
          >
            <SiGoogle size={20} />
            Sign in with Google
          </a>
        </div>
      </div>
    </div>
  );
}

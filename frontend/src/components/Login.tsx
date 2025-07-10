import { SiGoogle } from "@icons-pack/react-simple-icons";

const backendUrl = import.meta.env.VITE_ENVIRONMENT === "production"
  ? import.meta.env.VITE_PROD_BACKEND_URL
  : import.meta.env.VITE_BACKEND_URL;
console.log(backendUrl);

export default function Login() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center mt-5 backdrop-blur-lg bg-gray-900/50">
      <div className="lum-card">
        <h1 className="mt-0!">3Compute</h1>
        <a
          className="lum-btn lum-btn-p-3 lum-bg-gray-700 hover:lum-bg-gray-600"
          href={`${backendUrl}/login`}
        >
          <SiGoogle size={20} />
          Sign in with Google
        </a>
      </div>
    </div>
  );
}

import { SiGoogle } from "@icons-pack/react-simple-icons";

const backendUrl = import.meta.env.VITE_BACKEND_URL;
console.log(backendUrl);

export default function Login() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="mb-10!">3Compute</h1>
      <a
        className="lum-btn lum-btn-p-3 lum-bg-gray-700 hover:lum-bg-gray-600"
        href={`${backendUrl}/login`}
      >
        <SiGoogle size={20} />
        Sign in with Google
      </a>
    </div>
  );
}

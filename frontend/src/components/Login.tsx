const backendUrl = import.meta.env.VITE_BACKEND_URL;
console.log(backendUrl);

export default function Login() {
  return (
    <div className="p-4">
      <a className="lum-btn" href={`${backendUrl}/login`}>
        Sign in with Google
      </a>
    </div>
  );
}

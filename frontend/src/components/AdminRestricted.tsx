export default function AdminRestricted() {
  return (
    <div className="-mt-20 text-white min-h-screen">
      <div className="pt-32 px-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Admin</h1>
        <p className="text-gray-400">This page is restricted to 3Compute administrators.</p>
      </div>
    </div>
  );
}

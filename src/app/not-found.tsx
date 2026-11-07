import Link from "next/link";

export default function NotFound() {
  return (
    <div className="text-center py-16 space-y-4">
      <h2 className="text-2xl font-bold">Page Nahi Mila</h2>
      <p className="text-stone-400">Jo safha aap dhoond rahe hain woh mojood nahi hai.</p>
      <Link
        href="/"
        className="inline-block mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-white font-medium"
      >
        Wapas Home Jayein
      </Link>
    </div>
  );
}



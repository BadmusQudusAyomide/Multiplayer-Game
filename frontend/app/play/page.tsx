import Link from "next/link";

export default function PlayIndexPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Play</h1>
      <p className="text-gray-600">Choose a game to start playing.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/play/ttt" className="block rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition bg-white">
          <div className="text-xl font-bold">Tic‑Tac‑Toe</div>
          <p className="text-gray-600 mt-1">Classic 3x3 strategy. Play vs AI or players.</p>
        </Link>
        <Link href="/play/rps" className="block rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition bg-white">
          <div className="text-xl font-bold">Rock‑Paper‑Scissors</div>
          <p className="text-gray-600 mt-1">Best of skill and luck. Challenge anyone.</p>
        </Link>
      </div>
    </div>
  );
}

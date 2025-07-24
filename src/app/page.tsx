import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black">
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <h1 className="text-6xl font-light mb-8 text-gray-900 dark:text-white">Scribbl</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-12 text-lg">
            Draw. Guess. Play.
          </p>
          
          <div className="space-y-4">
            <Link
              className="btn-primary w-full text-lg py-4"
              href="/create"
            >
              Create Game
            </Link>
            <Link
              className="btn-secondary w-full text-lg py-4"
              href="/join"
            >
              Join Game
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

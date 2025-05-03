import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-3xl w-full flex flex-col items-center text-center">
          <h1 className="text-5xl font-bold mb-4">Scribbl</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-lg">
            Draw, guess, and have fun with friends! An online multiplayer drawing and guessing game.
          </p>
          
          <div className="flex gap-5 mt-6 flex-col sm:flex-row w-full max-w-md">
            <Link
              className="btn-primary flex items-center justify-center gap-2 py-4 px-8 text-center w-full"
              href="/create"
            >
              Create Game
            </Link>
            <Link
              className="btn-secondary flex items-center justify-center gap-2 py-4 px-8 text-center w-full"
              href="/join"
            >
              Join Game
            </Link>
          </div>
        </div>
      </main>
      <footer className="p-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">© 2025 Scribbl Game</p>
      </footer>
    </div>
  );
}

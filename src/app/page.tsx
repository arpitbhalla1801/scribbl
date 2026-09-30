import Link from "next/link";
import { SignInWithDiscord } from "@/components/SignInWithDiscord";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-lg w-full text-center">
          <div className="text-6xl mb-2 select-none" aria-hidden="true">
            ✏️
          </div>
          <h1
            className="text-7xl mb-3"
            style={{
              color: "var(--marker-blue)",
              textShadow: "3px 3px 0 var(--ink)",
            }}
          >
            Scribbl
          </h1>
          <p className="text-secondary mb-10 text-lg">
            Grab some friends, pick up a marker, and guess what everyone else is drawing.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link className="btn-primary flex-1 text-lg py-4" href="/create">
              Create a room
            </Link>
            <Link className="btn-secondary flex-1 text-lg py-4" href="/join">
              Join a room
            </Link>
          </div>

          <div className="mt-6">
            <SignInWithDiscord />
          </div>
        </div>
      </main>
    </div>
  );
}

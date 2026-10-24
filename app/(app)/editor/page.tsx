import type { Metadata } from "next";
import Link from "next/link";
import { EditorWorkspace } from "@/components/editor/EditorWorkspace";

export const metadata: Metadata = { title: "Room editor" };

export default function EditorPage() {
  return (
    <main className="flex flex-1 flex-col bg-stone-50 text-stone-900">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-white px-4 py-3 lg:px-6 print:hidden">
        <div>
          <h1 className="text-xl font-semibold">Will it fit?</h1>
          <p className="text-sm text-stone-600">Confirm the room, then move furniture. Problems show up as you go.</p>
        </div>
        <Link href="/" className="text-sm font-medium text-stone-700 underline underline-offset-2 hover:text-stone-900">
          Start the guided version
        </Link>
      </header>
      <EditorWorkspace />
    </main>
  );
}

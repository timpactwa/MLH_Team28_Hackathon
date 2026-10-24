import type { Metadata } from "next";
import { EditorWorkspace } from "@/components/editor/EditorWorkspace";

export const metadata: Metadata = { title: "Room editor" };

export default function EditorPage() {
  return (
    <main className="flex flex-1 flex-col bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-4 py-3 lg:px-6">
        <h1 className="text-xl font-semibold text-stone-900">Will it fit?</h1>
        <p className="text-sm text-stone-600">Confirm the room, then move furniture. Problems show up as you go.</p>
      </header>
      <EditorWorkspace />
    </main>
  );
}

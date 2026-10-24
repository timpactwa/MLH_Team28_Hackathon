import { FlowApp } from "@/components/flow/FlowApp";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col bg-stone-50 text-stone-900">
      <header className="flex flex-wrap items-baseline justify-between gap-2 bg-stone-900 px-4 py-4 text-white lg:px-8 print:bg-white print:text-stone-900">
        <div>
          <h1 className="text-lg font-semibold">Room Fit</h1>
          <p className="text-sm text-stone-300 print:text-stone-700">Before you sign a lease, see how your life fits.</p>
        </div>
        <p className="text-xs text-stone-300 print:hidden">Checks a room model you confirm. Not an accessibility certification.</p>
      </header>
      <FlowApp />
    </main>
  );
}

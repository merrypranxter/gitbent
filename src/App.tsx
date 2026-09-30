/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export default function App() {
  return (
    <main className="min-h-screen w-full bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-6 selection:bg-neutral-800">
      <div className="max-w-md w-full rounded-2xl border border-neutral-800/80 bg-neutral-900/40 backdrop-blur p-8 text-center shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-neutral-800/60 border border-neutral-700/50 flex items-center justify-center mx-auto mb-4 text-neutral-400">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
        </div>
        <h1 className="text-xl font-medium tracking-tight text-neutral-100 mb-2">
          Ready for your repository
        </h1>
        <p className="text-sm text-neutral-400 leading-relaxed">
          Clean slate initialized. Drop in your files, push code, or connect your GitHub repository whenever you're ready.
        </p>
      </div>
    </main>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POL-03 — /privacy page with friendly bullet-list trust signals (~12 bullets).
 *
 * The AI bullet records the hosted-build privacy boundary. Other bullets are
 * planner-picked wording
 * matching the calm-modernist tone: single-claim sentences, verifiable in
 * DevTools, no legalese.
 *
 * Rendered inside the existing MainLayout children slot — keeps the Sidebar
 * + Header + DisclaimerFooter chrome around it. Reached via:
 *   1. Direct URL /privacy (full page reload → getRouteKind() → 'privacy')
 *   2. DisclaimerFooter /privacy link on any view (Plan 14-2 Task 4)
 */

export function PrivacyPage() {
  return (
    <main
      role="main"
      aria-labelledby="privacy-heading"
      data-testid="privacy-page"
      className="max-w-2xl mx-auto py-8 px-4 space-y-6"
    >
      <h1 id="privacy-heading" className="text-3xl font-bold">
        Privacy
      </h1>
      <p className="text-sm text-gray-600">
        AussieLedger is built so your data never leaves your browser. This page
        is the receipts — every claim below is verifiable in DevTools.
      </p>
      <ul
        className="space-y-3 text-sm leading-relaxed list-disc pl-5"
        data-testid="privacy-bullets"
      >
        <li>
          No third-party scripts are loaded. The browser&apos;s Content
          Security Policy is set to <code>script-src &apos;self&apos;</code> —
          verifiable in DevTools &rarr; Network.
        </li>
        <li>
          No cookies are set. Verifiable in DevTools &rarr; Application &rarr;
          Cookies (the list is empty).
        </li>
        <li>No analytics. No Google Analytics, no Plausible, no PostHog, nothing.</li>
        <li>
          No server-side storage of your data. The LocalAdapter writes only to
          your browser&apos;s IndexedDB.
        </li>
        <li>No telemetry of any kind — not even opt-in.</li>
        <li>
          Open source under Apache 2.0 — full source at{' '}
          <a
            href="https://github.com/tech-taitan/AussieLedger"
            className="text-blue-600 underline hover:text-blue-800"
            data-testid="privacy-repo-link"
          >
            github.com/tech-taitan/AussieLedger
          </a>
          .
        </li>
        <li data-testid="privacy-ai-bullet">
          AI features are not available on the public hosted version. Self-host
          with your own <code>GEMINI_API_KEY</code> on a local Express server
          to enable AI account-matching today. The public hosted build does not
          send data to Google.
        </li>
        <li>
          Custom domain and TLS provided by Vercel; static assets served from
          Vercel&apos;s CDN. There is no AussieLedger server in the data path.
        </li>
        <li>
          Print working papers use <code>window.print()</code> directly — no
          PDF library and no server-side rendering.
        </li>
        <li>
          Data export is a JSON file download via{' '}
          <code>&lt;a download&gt;</code> — your data is never POSTed anywhere.
        </li>
        <li>
          All security headers and the full CSP are visible in your
          browser&apos;s DevTools &rarr; Network tab. This page is the receipts.
        </li>
        <li>
          Contact, contribute, or report a security issue via{' '}
          <a
            href="https://github.com/tech-taitan/AussieLedger/issues"
            className="text-blue-600 underline hover:text-blue-800"
          >
            GitHub Issues
          </a>
          .
        </li>
      </ul>
    </main>
  );
}

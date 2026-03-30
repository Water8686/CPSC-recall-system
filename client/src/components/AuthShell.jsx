import { Shield } from 'lucide-react';

/**
 * Public auth pages — matches wireframe home gradient and Shield branding.
 */
export default function AuthShell({ children, subtitle }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4 py-12">
      <div className="mb-8 w-full max-w-lg text-center">
        <div className="mb-3 flex flex-wrap items-center justify-center gap-2 md:gap-3">
          <Shield className="size-10 shrink-0 text-blue-600 md:size-12" aria-hidden />
          <h1 className="text-balance text-2xl font-bold text-gray-900 md:text-3xl">
            CPSC Recall Violation Monitoring System
          </h1>
        </div>
        {subtitle ? (
          <p className="text-pretty text-sm text-gray-600 md:text-base">{subtitle}</p>
        ) : null}
      </div>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-10 max-w-xl text-center text-xs text-gray-500">
        Student prototype — not endorsed by or affiliated with the U.S. Consumer Product Safety
        Commission (CPSC)
      </p>
    </div>
  );
}

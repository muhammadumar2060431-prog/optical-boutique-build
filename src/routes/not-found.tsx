import { Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/not-found")({
  component: NotFoundPage,
});

function NotFoundPage() {
  return (
    <SiteLayout>
      <div className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-[#f6f4ef]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <span
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-[22vw] font-bold leading-none text-[#1b1b1d]/[0.04] tracking-tighter"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            404
          </span>
          <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full border border-[#666]/10 opacity-60" />
          <div className="absolute -top-10 -left-10 h-56 w-56 rounded-full border border-[#666]/8 opacity-50" />
          <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full border border-[#666]/10 opacity-60" />
          <div className="absolute -bottom-12 -right-12 h-64 w-64 rounded-full border border-[#666]/8 opacity-50" />
        </div>
        <div className="relative z-10 mx-auto max-w-lg px-6 py-16 text-center">
          <div className="mb-8 flex justify-center">
            <div className="group relative inline-flex items-center justify-center">
              <div className="absolute inset-0 -m-2 rounded-full bg-[#666]/8 transition-all duration-500 group-hover:scale-110" />
              <svg
                width="72"
                height="40"
                viewBox="0 0 72 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="relative"
              >
                <circle cx="18" cy="20" r="14" stroke="#666666" strokeWidth="2.5" fill="none" />
                <circle cx="54" cy="20" r="14" stroke="#666666" strokeWidth="2.5" fill="none" />
                <path
                  d="M32 20 C34 16, 38 16, 40 20"
                  stroke="#666666"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <path d="M4 20 L4 12" stroke="#666666" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M68 20 L68 12" stroke="#666666" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <p
            className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#666]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Error 404
          </p>
          <h1
            className="mb-4 text-3xl font-bold leading-tight text-[#1b1b1d] sm:text-4xl"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Lost Your Frames?
          </h1>
          <p
            className="mb-3 text-base text-[#6b6a65]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            The page you're looking for seems to have slipped off the shelf.
          </p>
          <p
            className="mb-10 text-sm text-[#6b6a65]/80"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            It may have been moved, renamed, or it never existed. Let's get you back to finding your
            perfect pair.
          </p>
          <div className="mx-auto mb-10 h-px w-16 bg-[#666]/30" />
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/"
              id="not-found-back-home"
              className="group inline-flex items-center justify-center gap-2 rounded-none bg-[#1b1b1d] px-8 py-3 text-sm font-medium tracking-[0.12em] uppercase text-white transition-all duration-300 hover:bg-[#666]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className="transition-transform duration-300 group-hover:-translate-x-1"
              >
                <path
                  d="M9 2L4 7L9 12"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back to Home
            </Link>
            <Link
              to="/glasses"
              id="not-found-browse-shop"
              className="group inline-flex items-center justify-center gap-2 rounded-none border border-[#1b1b1d] bg-transparent px-8 py-3 text-sm font-medium tracking-[0.12em] uppercase text-[#1b1b1d] transition-all duration-300 hover:border-[#666] hover:text-[#666]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Browse Shop
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                <path
                  d="M5 2L10 7L5 12"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
          <div className="mt-12">
            <p
              className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-[#6b6a65]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Popular Pages
            </p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <Link
                to="/glasses"
                className="text-xs text-[#6b6a65] underline-offset-4 hover:text-[#1b1b1d] hover:underline"
              >
                Eyeglasses
              </Link>
              <Link
                to="/glasses"
                className="text-xs text-[#6b6a65] underline-offset-4 hover:text-[#1b1b1d] hover:underline"
              >
                Sunglasses
              </Link>
              <Link
                to="/lenses"
                className="text-xs text-[#6b6a65] underline-offset-4 hover:text-[#1b1b1d] hover:underline"
              >
                Contact Lenses
              </Link>
              <Link
                to="/faqs"
                className="text-xs text-[#6b6a65] underline-offset-4 hover:text-[#1b1b1d] hover:underline"
              >
                FAQ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

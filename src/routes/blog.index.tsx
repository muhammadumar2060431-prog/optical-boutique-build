import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { fetchBlogPosts, blogReadingMinutes } from "@/lib/blog-data";
import { getSiteUrl } from "@/lib/utils";

export const Route = createFileRoute("/blog/")({
  loader: () => fetchBlogPosts(false),
  head: () => ({
    meta: [
      { title: "Eyewear Journal | Frame, Lens & Eye Care Guides | Nigah" },
      {
        name: "description",
        content:
          "Expert eyewear guides, lens advice, frame styling tips and eye care insights from Nigah.",
      },
      {
        name: "keywords",
        content:
          "eyewear blog, eyeglasses guide, sunglasses tips, lens care, frame styling Pakistan",
      },
      { property: "og:title", content: "The Nigah Eyewear Journal" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: getSiteUrl("/blog") },
    ],
    links: [{ rel: "canonical", href: getSiteUrl("/blog") }],
  }),
  component: BlogPage,
});

function BlogPage() {
  const posts = Route.useLoaderData();
  const [category, setCategory] = useState("All");
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(posts.map((p) => p.category)))],
    [posts],
  );
  const visible = category === "All" ? posts : posts.filter((p) => p.category === category);
  const featured = visible.find((p) => p.featured) || visible[0];
  const cards = visible.filter((p) => p.id !== featured?.id);
  return (
    <SiteLayout>
      <main className="bg-white text-zinc-950">
        <header className="mx-auto max-w-7xl px-4 pb-10 pt-14 sm:px-6 sm:pt-20 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Nigah editorial
          </p>
          <div className="mt-3 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h1 className="font-display text-4xl font-semibold sm:text-5xl lg:text-6xl">
                Eyewear journal
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
                Expert notes on frame fit, lens technology, eye health and considered personal
                style.
              </p>
            </div>
            <p className="text-sm text-zinc-500">{posts.length} articles</p>
          </div>
          <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={
                  "shrink-0 border px-4 py-2 text-xs font-medium transition-colors " +
                  (category === item
                    ? "border-black bg-black text-white"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-500")
                }
              >
                {item}
              </button>
            ))}
          </div>
        </header>
        {featured ? (
          <section className="border-y border-zinc-200 bg-zinc-50">
            <div className="mx-auto grid max-w-7xl lg:grid-cols-[1.45fr_0.8fr]">
              <Link
                to="/blog/$slug"
                params={{ slug: featured.slug }}
                className="block min-h-[280px] overflow-hidden sm:min-h-[420px]"
              >
                <img
                  src={featured.coverImage || "/about-sunglasses.jpg"}
                  alt={featured.coverAlt || featured.title}
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                />
              </Link>
              <div className="flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-12">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  {featured.category}
                </p>
                <h2 className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-4xl">
                  {featured.title}
                </h2>
                <p className="mt-5 text-sm leading-7 text-zinc-600">{featured.excerpt}</p>
                <div className="mt-6 flex items-center gap-4 text-xs text-zinc-500">
                  <span>{featured.author}</span>
                  <span>/</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {blogReadingMinutes(featured)} min read
                  </span>
                </div>
                <Link
                  to="/blog/$slug"
                  params={{ slug: featured.slug }}
                  className="mt-8 inline-flex w-fit items-center gap-2 border-b border-black pb-1 text-xs font-semibold uppercase tracking-[0.14em]"
                >
                  Read article <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <div className="px-4 py-24 text-center text-zinc-500">No published articles yet.</div>
        )}
        {cards.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Latest articles</p>
            <h2 className="mb-8 mt-2 font-display text-3xl font-semibold sm:text-4xl">
              Clarity, fit and style
            </h2>
            <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((post) => (
                <article key={post.id}>
                  <Link
                    to="/blog/$slug"
                    params={{ slug: post.slug }}
                    className="block aspect-[4/3] overflow-hidden bg-zinc-100"
                  >
                    <img
                      src={post.coverImage || "/about-sunglasses.jpg"}
                      alt={post.coverAlt || post.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                    />
                  </Link>
                  <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    {post.category}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-semibold leading-snug">
                    <Link to="/blog/$slug" params={{ slug: post.slug }}>
                      {post.title}
                    </Link>
                  </h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-600">
                    {post.excerpt}
                  </p>
                  <p className="mt-4 text-xs text-zinc-500">{blogReadingMinutes(post)} min read</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </SiteLayout>
  );
}

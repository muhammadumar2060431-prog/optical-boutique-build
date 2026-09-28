import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Clock } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { blogReadingMinutes, fetchBlogPostBySlug } from "@/lib/blog-data";
import type { BlogBlock } from "@/lib/blog-types";
import { getSiteUrl } from "@/lib/utils";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const post = await fetchBlogPostBySlug(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData: post }) =>
    post
      ? {
          meta: [
            { title: post.seoTitle || post.title + " | OPTIQUE Journal" },
            { name: "description", content: post.seoDescription || post.excerpt },
            { name: "keywords", content: post.keywords.join(", ") },
            { name: "author", content: post.author },
            { property: "og:title", content: post.seoTitle || post.title },
            { property: "og:description", content: post.seoDescription || post.excerpt },
            { property: "og:type", content: "article" },
            { property: "og:image", content: post.coverImage },
            { name: "twitter:card", content: "summary_large_image" },
          ],
          links: [{ rel: "canonical", href: getSiteUrl("/blog/" + post.slug) }],
        }
      : {},
  component: BlogArticle,
});

function Block({ block }: { block: BlogBlock }) {
  if (block.type === "image")
    return (
      <figure className="my-10">
        <img
          src={block.image || "/about-sunglasses.jpg"}
          alt={block.alt || ""}
          loading="lazy"
          className="w-full object-cover"
        />
        {block.alt && (
          <figcaption className="mt-2 text-center text-xs text-zinc-500">{block.alt}</figcaption>
        )}
      </figure>
    );
  const style = (block.bold ? " font-semibold" : "") + (block.italic ? " italic" : "");
  if (block.type === "heading2")
    return (
      <h2 className={"mt-12 font-display text-3xl leading-tight text-zinc-950 sm:text-4xl" + style}>
        {block.text}
      </h2>
    );
  if (block.type === "heading3")
    return (
      <h3 className={"mt-9 font-display text-2xl leading-tight text-zinc-950" + style}>
        {block.text}
      </h3>
    );
  if (block.type === "quote")
    return (
      <blockquote
        className={
          "my-10 border-l-2 border-black pl-6 font-display text-2xl leading-relaxed text-zinc-700" +
          style
        }
      >
        {block.text}
      </blockquote>
    );
  const size =
    block.fontSize === "small"
      ? "text-sm"
      : block.fontSize === "large"
        ? "text-lg sm:text-xl"
        : "text-base sm:text-[17px]";
  return (
    <p className={"mt-6 whitespace-pre-line leading-8 text-zinc-700 " + size + style}>
      {block.text}
    </p>
  );
}

function BlogArticle() {
  const post = Route.useLoaderData();
  const date = post.publishedAt || post.updatedAt;
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    image: post.coverImage,
    author: { "@type": "Organization", name: post.author },
    datePublished: date,
    dateModified: post.updatedAt,
    mainEntityOfPage: getSiteUrl("/blog/" + post.slug),
  };
  return (
    <SiteLayout>
      <main className="bg-white text-zinc-950">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\u003c") }}
        />
        <article>
          <header className="mx-auto max-w-4xl px-4 pb-10 pt-12 text-center sm:px-6 sm:pb-14 sm:pt-20">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 hover:text-black"
            >
              <ArrowLeft className="h-4 w-4" /> Journal
            </Link>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {post.category}
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">
              {post.title}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
              {post.excerpt}
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-500">
              <span>{post.author}</span>
              <span>/</span>
              <time dateTime={date}>
                {new Date(date).toLocaleDateString("en-PK", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </time>
              <span>/</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {blogReadingMinutes(post)} min read
              </span>
            </div>
          </header>
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <img
              src={post.coverImage || "/about-sunglasses.jpg"}
              alt={post.coverAlt || post.title}
              className="aspect-[16/9] w-full object-cover"
              fetchPriority="high"
            />
          </div>
          <div className="mx-auto max-w-3xl px-5 pb-20 pt-8 sm:px-6 sm:pb-28 sm:pt-12">
            {post.blocks.map((block) => (
              <Block key={block.id} block={block} />
            ))}
          </div>
        </article>
      </main>
    </SiteLayout>
  );
}

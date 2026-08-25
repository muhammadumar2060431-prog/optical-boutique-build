import { Video } from "lucide-react";

import { useStore } from "@/lib/store";

import { Reveal } from "./Reveal";

export function VideoSection({ heading = "Inside our warehouse" }: { heading?: string }) {
  const { video } = useStore();

  return (
    <section className="bg-mist py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Reveal>
          <p className="eyebrow text-gold">Behind the counter</p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl">{heading}</h2>
        </Reveal>
        <Reveal delay={80} className="mt-8">
          {video.videoId ? (
            <div className="aspect-video w-full overflow-hidden rounded-xl border border-stone bg-jet">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${video.videoId}`}
                title={heading}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="grid aspect-video w-full place-items-center rounded-xl border border-dashed border-stone bg-card text-center">
              <div className="space-y-3 px-6">
                <Video className="mx-auto h-8 w-8 text-gold" />
                <p className="font-display text-2xl">Video coming soon</p>
                <p className="mx-auto max-w-sm text-sm text-ink-muted">
                  Our workshop film is being finished. It will appear here once published from the
                  approved channel.
                </p>
              </div>
            </div>
          )}
          <p className="mt-4 text-sm text-ink-muted">{video.caption}</p>
        </Reveal>
      </div>
    </section>
  );
}

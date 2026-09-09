const YOUTUBE_VIDEO_ID: string | null = null;

export function MarketingVideo() {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-graphite-900/10 bg-graphite-50 shadow-[0_14px_45px_rgba(24,58,89,0.06)] sm:rounded-[2rem]">
      <div className="aspect-video w-full">
        {YOUTUBE_VIDEO_ID ? (
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}`}
            title="Présentation de LETI"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-pool-200 bg-white text-pool-700 shadow-[0_4px_16px_rgba(24,58,89,0.06)] sm:h-20 sm:w-20">
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="currentColor"
                className="ml-1 h-6 w-6 sm:h-7 sm:w-7"
              >
                <path d="M8.4 5.6a1 1 0 0 1 1.54-.84l9.14 6.4a1 1 0 0 1 0 1.68l-9.14 6.4A1 1 0 0 1 8.4 18.4V5.6Z" />
              </svg>
            </span>
            <p className="mt-5 text-base font-semibold text-graphite-800 sm:text-lg">
              Présentation vidéo LETI
            </p>
            <p className="mt-1.5 text-sm text-graphite-400">Vidéo à venir</p>
          </div>
        )}
      </div>
    </div>
  );
}

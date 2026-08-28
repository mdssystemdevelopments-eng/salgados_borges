import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "menu-cover-seen:";

export function hasSeenMenuCover(slug: string) {
  try {
    return sessionStorage.getItem(`${STORAGE_PREFIX}${slug}`) === "1";
  } catch {
    return true;
  }
}

function markMenuCoverSeen(slug: string) {
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${slug}`, "1");
  } catch {
    /* ignore */
  }
}

type MenuCoverSplashProps = {
  slug: string;
  coverSrc?: string;
  onComplete: () => void;
};

export function MenuCoverSplash({
  slug,
  coverSrc = "/cms/menu-cover.png",
  onComplete,
}: MenuCoverSplashProps) {
  const [leaving, setLeaving] = useState(false);

  const dismiss = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    markMenuCoverSeen(slug);
    window.setTimeout(onComplete, 650);
  }, [leaving, onComplete, slug]);

  useEffect(() => {
    const timer = window.setTimeout(dismiss, 2400);
    return () => window.clearTimeout(timer);
  }, [dismiss]);

  return (
    <button
      type="button"
      className={`menu-cover-splash ${leaving ? "menu-cover-splash--leaving" : ""}`}
      onClick={dismiss}
      aria-label="Abrir cardápio"
    >
      <img src={coverSrc} alt="" className="menu-cover-splash__image" draggable={false} />
      <span className="menu-cover-splash__hint">Toque para abrir</span>
    </button>
  );
}

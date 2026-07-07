import { Send } from "lucide-react";

interface Props {
  title: string;
  url: string;
  compact?: boolean;
}

/** WhatsApp + Telegram share pills. Card-friendly. */
export function ShareButtons({ title, url, compact }: Props) {
  const text = `${title} — ${url}`;
  const waHref = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const tgHref = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;

  const size = compact ? "h-8 w-8" : "h-9 w-9";

  return (
    <div className="flex items-center gap-1.5">
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        aria-label="Share on WhatsApp"
        title="Share on WhatsApp"
        className={`${size} grid place-items-center rounded-full bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25 transition active:scale-90`}
      >
        <WhatsAppIcon className="h-4 w-4" />
      </a>
      <a
        href={tgHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        aria-label="Share on Telegram"
        title="Share on Telegram"
        className={`${size} grid place-items-center rounded-full bg-[#229ED9]/15 text-[#229ED9] hover:bg-[#229ED9]/25 transition active:scale-90`}
      >
        <Send className="h-4 w-4" />
      </a>
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.05 0C5.5 0 .18 5.32.18 11.87c0 2.09.55 4.13 1.6 5.93L0 24l6.35-1.66a11.9 11.9 0 0 0 5.7 1.45h.01c6.55 0 11.87-5.32 11.87-11.87 0-3.17-1.24-6.15-3.4-8.44Zm-8.47 18.2h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.77.99 1-3.67-.23-.38a9.87 9.87 0 0 1-1.5-5.16C2.15 6.4 6.58 1.98 12.05 1.98c2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.9 6.99c0 5.47-4.43 9.9-9.89 9.9Zm5.42-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.64-2.06-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.08 3.18 5.04 4.46.7.3 1.25.48 1.68.62.7.22 1.34.19 1.85.11.56-.08 1.76-.72 2-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35Z"/>
    </svg>
  );
}

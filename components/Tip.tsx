import type { ReactNode } from "react";

const ICONS = { info: "i", warn: "!", err: "!", ok: "✓" } as const;

export default function Tip({
  kind = "info",
  title,
  children,
}: {
  kind?: keyof typeof ICONS;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className={`tip ${kind === "info" ? "" : kind}`} role={kind === "err" ? "alert" : undefined}>
      <span className="ico" aria-hidden>
        {ICONS[kind]}
      </span>
      <div>
        {title && (
          <p>
            <strong>{title}</strong>
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

import { useEffect, useState, type ReactNode } from "react";
import { LuArrowLeft, LuChevronRight } from "react-icons/lu";
import { back, go, href, type Route } from "../router";
import { cx } from "../util";

export function Link({ to, className, children, label }: { to: Route; className?: string; children: ReactNode; label?: string }) {
  return (
    <a
      href={href(to)}
      className={className}
      aria-label={label}
      onClick={(e: MouseEvent) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        go(to);
      }}
    >
      {children}
    </a>
  );
}

export function BackLink({ to, label }: { to: Route; label: string }) {
  return (
    <button type="button" className="backlink" onClick={() => back(to)}>
      <LuArrowLeft aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

export function PageTitle({ kicker, title, children }: { kicker?: string; title: string; children?: ReactNode }) {
  return (
    <header className="pagetitle">
      {kicker ? <p className="eyebrow">{kicker}</p> : null}
      <h1>{title}</h1>
      {children ? <div className="lede">{children}</div> : null}
    </header>
  );
}

export function Section({ title, kicker, children, className, id }: { title?: string; kicker?: string; children: ReactNode; className?: string; id?: string }) {
  return (
    <section className={cx("sheet", className)} id={id}>
      {kicker ? <p className="eyebrow">{kicker}</p> : null}
      {title ? <h2 className="sheet__title">{title}</h2> : null}
      {children}
    </section>
  );
}

export function Facts({ items }: { items: Array<[string, ReactNode | null | undefined | false]> }) {
  const shown = items.filter(([, v]) => v !== null && v !== undefined && v !== false && v !== "");
  if (shown.length === 0) return null;
  return (
    <dl className="facts">
      {shown.map(([k, v]) => (
        <div key={k} className="facts__row">
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Bar({ label, value, max = 100 }: { label: string; value: number | null | undefined; max?: number }) {
  if (value == null) return null;
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <li className="bar">
      <span className="bar__label">{label}</span>
      <span className="bar__value">{value}</span>
      <span className="bar__track" aria-hidden="true">
        <span className="bar__fill" style={{ width: `${pct}%` }} />
      </span>
    </li>
  );
}

export function Chips<T extends string>({ value, options, onChange, label, scroll }: { value: T; options: Array<[T, string]>; onChange: (v: T) => void; label: string; scroll?: boolean }) {
  return (
    <div className={cx("chips", scroll && "chips--scroll")} role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" className={cx("chip", v === value && "chip--on")} aria-pressed={v === value} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

export function Loading({ text = "Ouverture…" }: { text?: string }) {
  return (
    <div className="loading" role="status">
      <span className="loading__ball" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

export function Failure({ text, retry }: { text: string; retry?: () => void }) {
  return (
    <div className="failure" role="alert">
      <p>{text}</p>
      {retry ? (
        <button type="button" className="btn btn--ghost" onClick={retry}>
          Réessayer
        </button>
      ) : null}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconType = (props: { className?: string; "aria-hidden"?: boolean | "true" }) => any;

export function Door({ to, kicker, title, figure, tone = "glass", icon: Icon }: { to: Route; kicker: string; title: string; figure?: string; tone?: "glass" | "pitch" | "gold"; icon?: IconType }) {
  return (
    <Link to={to} className={cx("door", `door--${tone}`)}>
      {Icon ? (
        <span className="door__icon">
          <Icon aria-hidden="true" />
        </span>
      ) : null}
      <span className="door__kicker">{kicker}</span>
      <span className="door__title">{title}</span>
      {figure ? <span className="door__figure">{figure}</span> : null}
      <LuChevronRight className="door__arrow" aria-hidden="true" />
    </Link>
  );
}

/** Generic promise loader for a page. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]): { data: T | null; error: string | null; retry: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  useEffect(() => {
    let alive = true;
    setError(null);
    load()
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, round]);
  return { data, error, retry: () => setRound((r) => r + 1) };
}

export function More({ shown, total, onMore, step = 48 }: { shown: number; total: number; onMore: () => void; step?: number }) {
  if (shown >= total) return null;
  return (
    <button type="button" className="btn btn--more" onClick={onMore}>
      Voir {Math.min(step, total - shown).toLocaleString("fr-FR")} de plus <span className="muted">({(total - shown).toLocaleString("fr-FR")} restants)</span>
    </button>
  );
}

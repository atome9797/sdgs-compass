// 여러 화면이 같이 쓰는 작은 부품들(버튼·배너·입력 칸·제목 줄 등). 스타일은 globals.css 의 같은 이름 클래스예요.
import Link from "next/link";
import { useId, type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

function buttonClass(variant: ButtonVariant, size: "md" | "sm", block: boolean): string {
  return ["btn", variant === "primary" ? "" : `btn--${variant}`, size === "sm" ? "btn--sm" : "", block ? "btn--block" : ""].filter(Boolean).join(" ");
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "md" | "sm";
  block?: boolean;
}

export function Button({ variant = "primary", size = "md", block = false, type = "button", className, ...rest }: ButtonProps) {
  return <button type={type} className={[buttonClass(variant, size, block), className].filter(Boolean).join(" ")} {...rest} />;
}

export function ButtonLink({ href, children, variant = "primary", size = "md", block = false }: { href: string; children: ReactNode; variant?: ButtonVariant; size?: "md" | "sm"; block?: boolean }) {
  return (
    <Link href={href} className={buttonClass(variant, size, block)}>
      {children}
    </Link>
  );
}

export type Tone = "info" | "success" | "warning" | "danger";
const TONE_ICON: Record<Tone, string> = { info: "ℹ️", success: "✅", warning: "⚠️", danger: "⛔" };

/** 알림 상자. 성공·안내는 조용히(status), 경고·오류는 바로 읽어 주도록(alert) 알려요 */
export function Banner({ tone = "info", children, icon }: { tone?: Tone; children: ReactNode; icon?: string }) {
  return (
    <div className={`banner banner--${tone}`} role={tone === "danger" || tone === "warning" ? "alert" : "status"}>
      <span className="banner__icon" aria-hidden="true">
        {icon ?? TONE_ICON[tone]}
      </span>
      <div className="grow">{children}</div>
    </div>
  );
}

export function Tag({ tone, children }: { tone?: "info" | "success" | "warning" | "danger" | "donation"; children: ReactNode }) {
  return <span className={tone ? `tag tag--${tone}` : "tag"}>{children}</span>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card card--pad ${className}`.trim()}>{children}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function Section({ title, hint, action, children }: { title: string; hint?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section__head">
        <h2 className="section__title">{title}</h2>
        {action}
      </div>
      {hint ? <p className="section__hint">{hint}</p> : null}
      {children}
    </section>
  );
}

/** 화면 맨 위의 제목 줄 (뒤로 가기 링크 + 제목 + 오른쪽 끝 요소) */
export function ScreenHead({ title, back, backLabel, side }: { title: string; back?: string; backLabel?: string; side?: ReactNode }) {
  return (
    <div className="screen-head">
      {back ? (
        <Link href={back} className="screen-head__back" aria-label={backLabel}>
          <span aria-hidden="true">←</span>
        </Link>
      ) : null}
      <h1 className="screen-head__title">{title}</h1>
      {side ? <div className="screen-head__side">{side}</div> : null}
    </div>
  );
}

export interface FieldControlProps {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
}

/** 라벨·도움말·오류 문구를 입력 칸에 연결해 줘요: <Field label="..." error={...}>{(props) => <input className="input" {...props} />}</Field> */
export function Field({ label, hint, error, right, children }: { label: string; hint?: string; error?: string | null; right?: ReactNode; children: (props: FieldControlProps) => ReactNode }) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ");
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {children({ id, "aria-describedby": describedBy || undefined, "aria-invalid": error ? true : undefined })}
      {hint ? (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="field__error">
          {error}
        </p>
      ) : null}
      {right}
    </div>
  );
}

/** 글자 수 표시 (예: 23/300). 넘치면 빨갛게 */
export function Counter({ text }: { text: string }) {
  return <span className="field__count">{text}</span>;
}

/** 오류 목록 상자 (입력 오류를 한꺼번에 알려요) */
export function ErrorList({ title, messages }: { title?: string; messages: readonly string[] }) {
  if (messages.length === 0) return null;
  return (
    <Banner tone="danger">
      {title ? <p className="strong">{title}</p> : null}
      <ul>
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </Banner>
  );
}

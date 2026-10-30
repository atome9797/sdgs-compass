"use client";

// 글쓰기(F-503 학생 자랑 글 · F-504 기업 홍보 글): 학생은 내 실적 1건을 골라 한마디를, 기업은 제목·본문·SDGs(·챌린지 연결·공식 SNS 게시 신청)를 써서 올려요.
// 입력 검사는 core 의 validatePostDraft, 오류를 보여 주는 때와 미리보기는 lib/postForm.ts 가 정해요. 설계는 docs/sns-feed.md.
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import type { PostKind } from "@sdgs-compass/core/domain";
import { postContext, postErrorText, validatePostDraft } from "@sdgs-compass/core/post";
import { selectComposer, selectSdgTiles } from "@sdgs-compass/core/selectors";
import { PostCard } from "@/components/PostCard";
import { SdgChips, SdgMiniRow } from "@/components/sdg";
import { Banner, Button, ButtonLink, Counter, Empty, Field, ScreenHead } from "@/components/ui";
import { chooseChallenge, counterOf, initialPostFields, previewDraft, previewPost, toggleSdg, toPostDraft, visibleFieldErrors, type PostField, type PostFields } from "@/lib/postForm";
import { buildHref, feedHref, ROUTES } from "@/lib/routes";
import { useSession } from "@/lib/session";
import { nowIso } from "@/lib/time";

function Composer({ kind, presetId }: { kind: PostKind; presetId: string | null }) {
  const { demo, locale, role, t, dispatch } = useSession();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const officialHintId = useId();
  const previewHeadingId = useId();

  const composer = useMemo(() => selectComposer(demo, locale, kind, kind === "brag" ? { activityId: presetId } : { challengeId: presetId }), [demo, locale, kind, presetId]);
  const tiles = useMemo(() => selectSdgTiles(locale), [locale]);
  const [fields, setFields] = useState<PostFields>(() => initialPostFields(composer));
  const [touched, setTouched] = useState<PostField[]>([]);
  const [tried, setTried] = useState(false);
  const [focusTick, setFocusTick] = useState(0);
  const [busy, setBusy] = useState(false);

  const update = (patch: Partial<PostFields>) => setFields((current) => ({ ...current, ...patch }));
  const touch = (field: PostField) => setTouched((current) => (current.includes(field) ? current : [...current, field]));

  const draft = toPostDraft(kind, fields);
  const errors = validatePostDraft(draft, postContext(demo));
  const shown = visibleFieldErrors(errors, kind, fields, { tried, touched });
  const message = (field: PostField): string | null => {
    const first = shown[field]?.[0];
    return first ? postErrorText(first, kind, locale) : null;
  };
  const bodyCount = counterOf(fields.body, composer.bodyLimit);
  const titleCount = counterOf(fields.title, composer.titleLimit);

  // 미리보기: 올린 뒤 피드에 나올 카드를 그대로 (입력 도중에는 안내 문구로 채워서 모양만 보여요)
  const preview = useMemo(() => {
    const sample = previewDraft(kind, fields, composer, t("post.titlePlaceholder"));
    const post = previewPost(demo, locale, role, sample.draft);
    return post ? { post, placeholder: sample.placeholder } : null;
  }, [demo, locale, role, kind, fields, composer, t]);

  // 올리기를 눌렀는데 오류가 있으면, 오류가 표시된 뒤에 맨 위의 오류 칸으로 포커스를 옮겨요
  useEffect(() => {
    if (focusTick === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]')?.focus();
  }, [focusTick]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (errors.length > 0) {
      setTried(true);
      setFocusTick((n) => n + 1);
      return;
    }
    setBusy(true);
    const id = `po${demo.seq}`; // reducer 가 새 글에 붙이는 번호 — 피드가 이 글을 강조해요
    dispatch({ type: "createPost", draft, at: nowIso() });
    router.replace(feedHref(role, id));
  };

  const backHref = feedHref(role);
  const shell = role === "b2c" ? "screen" : "stack stack--lg";

  if (kind === "brag" && composer.activities.length === 0) {
    return (
      <div className={shell}>
        <ScreenHead title={composer.title} back={backHref} backLabel={t("common.back")} />
        <Empty>{t("post.noActivity")}</Empty>
        <ButtonLink href={buildHref(ROUTES.home)} variant="secondary">
          {t("nav.home")}
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className={shell}>
      <ScreenHead title={composer.title} back={backHref} backLabel={t("common.back")} />
      <p className="small muted">{t("post.postAs", { name: composer.author.name })}</p>

      <div className={role === "b2b" ? "composer composer--wide" : "composer"}>
        <form ref={formRef} className="card card--pad stack stack--lg" onSubmit={submit} noValidate aria-label={composer.title}>
          {kind === "brag" ? (
            <div className="stack stack--sm">
              <Field label={t("post.activityLabel")} hint={t("post.activityHint")} error={message("activity")}>
                {(props) => (
                  <select {...props} className="select" value={fields.activityId ?? ""} onChange={(event) => update({ activityId: event.target.value || null })} onBlur={() => touch("activity")}>
                    {composer.activities.map((activity) => (
                      <option key={activity.id} value={activity.id}>
                        {activity.label}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <p className="row small muted">
                <span>{t("post.sdgAuto")}</span>
                <SdgMiniRow ids={composer.activities.find((activity) => activity.id === fields.activityId)?.sdgIds ?? []} />
              </p>
            </div>
          ) : (
            <Field label={t("post.titleLabel")} error={message("title")} right={<Counter text={t("post.counter", { count: titleCount.count, max: composer.titleLimit })} over={titleCount.over} />}>
              {(props) => <input {...props} className="input" value={fields.title} onChange={(event) => update({ title: event.target.value })} onBlur={() => touch("title")} placeholder={t("post.titlePlaceholder")} autoComplete="off" />}
            </Field>
          )}

          <Field label={t("post.bodyLabel")} error={message("body")} right={<Counter text={t("post.counter", { count: bodyCount.count, max: composer.bodyLimit })} over={bodyCount.over} />}>
            {(props) => (
              <textarea
                {...props}
                className="textarea"
                rows={kind === "brag" ? 5 : 8}
                value={fields.body}
                onChange={(event) => update({ body: event.target.value })}
                onBlur={() => touch("body")}
                placeholder={composer.bodyPlaceholder}
              />
            )}
          </Field>

          {kind === "pr" ? (
            <>
              <div className="stack stack--sm" tabIndex={-1} data-invalid={shown.sdgs ? "true" : undefined}>
                <p className="field__label">
                  {t("post.sdgLabel")}{" "}
                  <span className="muted">
                    ({fields.sdgIds.length}/{composer.maxSdgs})
                  </span>
                </p>
                <SdgChips
                  tiles={tiles}
                  selected={fields.sdgIds}
                  onToggle={(id) => {
                    setFields((current) => toggleSdg(current, id));
                    touch("sdgs");
                  }}
                  label={t("post.sdgLabel")}
                  max={composer.maxSdgs}
                />
                {message("sdgs") ? <p className="field__error">{message("sdgs")}</p> : null}
              </div>

              <Field label={t("post.challengeLabel")} error={message("challenge")}>
                {(props) => (
                  <select {...props} className="select" value={fields.challengeId ?? ""} onChange={(event) => setFields((current) => chooseChallenge(current, composer, event.target.value || null))}>
                    <option value="">{t("post.challengeNone")}</option>
                    {composer.challenges.map((challenge) => (
                      <option key={challenge.id} value={challenge.id}>
                        {challenge.title}
                      </option>
                    ))}
                  </select>
                )}
              </Field>

              <div className="stack stack--sm">
                <label className="check">
                  <input type="checkbox" checked={fields.requestOfficial} aria-describedby={officialHintId} onChange={(event) => update({ requestOfficial: event.target.checked })} />
                  {t("post.officialLabel")}
                </label>
                <p id={officialHintId} className="field__hint">
                  {composer.official.hint}
                </p>
                {fields.requestOfficial ? (
                  <Banner tone="info" icon="📣">
                    {composer.official.nextDateLabel}
                  </Banner>
                ) : null}
              </div>
            </>
          ) : null}

          <p className="small muted">🔒 {composer.privacyNote}</p>
          <div className="row">
            <Link className="btn btn--secondary" href={backHref}>
              {t("common.cancel")}
            </Link>
            <div className="grow" />
            <Button type="submit" disabled={busy}>
              {t("post.submit")}
            </Button>
          </div>
        </form>

        {preview ? (
          <section className="composer__preview stack" aria-labelledby={previewHeadingId}>
            <h2 className="section__title" id={previewHeadingId}>
              {t("post.preview")}
            </h2>
            <PostCard post={preview.post} preview={{ placeholder: preview.placeholder }} />
          </section>
        ) : null}
      </div>
    </div>
  );
}

/** kind: 학생(/feed/new/)은 brag, 기업(/b2b/feed/new/)은 pr. 주소의 activity / challenge 로 미리 골라 둔 채로 열어요 */
export function PostComposerScreen({ kind }: { kind: PostKind }) {
  const presetId = useSearchParams().get(kind === "brag" ? "activity" : "challenge");
  return <Composer key={`${kind}:${presetId ?? ""}`} kind={kind} presetId={presetId} />;
}

"use client";

// #25 リワード残高(데모): 잔액 · 입출금 내역 · 본인 확인(데모 버튼) · 출금 신청 폼 · 고지 ①~④ (늘 보여요)
// 운영사가 第二種資金移動業 등록을 받은 뒤에 제공할 기능이라, 실제 송금·eKYC 는 하지 않아요. 설계는 docs/rewards.md.
import { useMemo, useState, type FormEvent } from "react";
import { parseYenInput } from "@sdgs-compass/core/wallet";
import { checkWithdrawal, selectWallet, type WalletEntryVM } from "@sdgs-compass/core/walletView";
import { Banner, Button, Empty, Field, ScreenHead, Section, Tag } from "@/components/ui";
import { buildHref, ROUTES } from "@/lib/routes";
import { useSession } from "@/lib/session";
import { nowIso } from "@/lib/time";

function EntryItem({ entry }: { entry: WalletEntryVM }) {
  return (
    <li className="card activity">
      <span className="activity__icon" aria-hidden="true">
        {entry.emoji}
      </span>
      <div className="activity__main">
        <p className="activity__title">{entry.title}</p>
        <p className="activity__meta">
          {entry.kindLabel} · {entry.dateLabel}
        </p>
        {entry.statusLabel ? <Tag tone="warning">{entry.statusLabel}</Tag> : null}
      </div>
      <span className={entry.credit ? "wallet-amount wallet-amount--in" : "wallet-amount"}>{entry.amountLabel}</span>
    </li>
  );
}

function WithdrawForm() {
  const { demo, locale, t, dispatch } = useSession();
  const vm = useMemo(() => selectWallet(demo, locale), [demo, locale]);
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const amount = parseYenInput(raw);
    const problem = checkWithdrawal(demo, amount, locale);
    setError(problem);
    if (problem !== null || amount === null) {
      setDone(false);
      return;
    }
    dispatch({ type: "requestWithdrawal", amountYen: amount, at: nowIso() });
    setRaw("");
    setDone(true);
  };

  return (
    <form className="card card--pad stack" onSubmit={submit} noValidate>
      {!vm.kycVerified ? <p className="small muted">{t("wallet.withdraw.needKyc")}</p> : null}
      <Field label={t("wallet.withdraw.amount")} hint={t("wallet.withdraw.hint", { balance: vm.balanceLabel, max: vm.maxLabel })} error={error}>
        {(props) => (
          <input
            {...props}
            className="input"
            inputMode="numeric"
            autoComplete="off"
            value={raw}
            disabled={!vm.kycVerified}
            onChange={(event) => {
              setRaw(event.target.value);
              setError(null);
              setDone(false);
            }}
            placeholder="10000"
          />
        )}
      </Field>
      <div className="row">
        <Button type="submit" disabled={!vm.kycVerified}>
          🏦 {t("wallet.withdraw.submit")}
        </Button>
      </div>
      <div className="live" aria-live="polite">
        {done ? <Banner tone="success">{t("wallet.withdraw.done")}</Banner> : null}
      </div>
    </form>
  );
}

export function WalletScreen() {
  const { demo, locale, t, dispatch } = useSession();
  const vm = useMemo(() => selectWallet(demo, locale), [demo, locale]);
  return (
    <div className="screen">
      <ScreenHead title={t("wallet.title")} back={buildHref(ROUTES.impact)} backLabel={t("wallet.back")} side={<Tag tone="warning">{t("wallet.demo")}</Tag>} />

      {/* 고지 ① — 등록 전에는 제공하지 않는 기능이라는 것을 맨 위에 늘 보여요 */}
      <Banner tone="info" icon="🏦">
        {vm.notices.registration}
      </Banner>

      <section className="card card--pad stack stack--sm wallet-balance" aria-label={t("wallet.title")}>
        <p className="small muted">{t("wallet.balance")}</p>
        <p className="profile__total">{vm.balanceLabel}</p>
        <p className="small muted">{vm.totalsLabel}</p>
      </section>

      <Section title={t("wallet.history")}>
        {vm.entries.length === 0 ? (
          <Empty>{t("wallet.historyEmpty")}</Empty>
        ) : (
          <ul className="card-list">
            {vm.entries.map((entry) => (
              <EntryItem key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("wallet.kyc.title")} hint={t("wallet.kyc.hint")}>
        <div className="card card--pad row row--between">
          <p className="strong">
            {vm.kycVerified ? "✅ " : ""}
            {vm.kycLabel}
          </p>
          {!vm.kycVerified ? (
            <Button variant="secondary" onClick={() => dispatch({ type: "verifyKyc", at: nowIso() })}>
              🪪 {t("wallet.kyc.button")}
            </Button>
          ) : null}
        </div>
      </Section>

      <Section title={t("wallet.withdraw.title")} hint={vm.notices.kyc}>
        <WithdrawForm />
      </Section>

      <Section title={t("wallet.about.title")}>
        <ul className="card card--pad stack stack--sm wallet-about">
          <li>🏆 {t("wallet.about.prize")}</li>
          <li>🤝 {t("wallet.about.return")}</li>
          <li>🔒 {t("wallet.about.noBuy")}</li>
        </ul>
      </Section>

      {/* 고지 ①~④ — 순서대로 늘 보여요 (① 은 맨 위에도) */}
      <Section title={t("wallet.noticesTitle")}>
        <ol className="wallet-notices">
          <li className="disclaimer">{vm.notices.registration}</li>
          <li className="disclaimer">{vm.notices.kyc}</li>
          <li className="disclaimer">{vm.notices.tax}</li>
          <li className="disclaimer">{vm.notices.level}</li>
        </ol>
      </Section>
    </div>
  );
}

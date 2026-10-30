"use client";

// 수지·자금 화면의 입력 칸. 글자는 칸 안에서만 들고 있다가, 올바른 값일 때만 위(편집기)로 올려요.
// 고치는 중에 틀린 글자(빈 칸 · 숫자 아님 · 범위 밖)가 있어도 위의 값은 그대로라서, 계산은 "직전의 올바른 값"으로 이어져요.
// 오류는 칸 아래에 말로 보여 주고, 같은 문구를 편집기의 오류 요약에도 알려요. 알리는 일은 모두 입력 이벤트 안에서 해요(effect 를 쓰지 않아요).
import { numberToFieldText, parseFieldNumber, parseFieldPercent, ratioToPercentText, type FieldSpec } from "@sdgs-compass/core/adminFinance";
import { fieldErrorText } from "@sdgs-compass/core/adminFinanceText";
import { formatNumber } from "@sdgs-compass/core/format";
import { useState } from "react";
import { Field } from "@/components/ui";
import { useAdmin } from "@/lib/adminSession";

/** 칸에 처음 보여 줄 글자: 정수는 쉼표로 읽기 쉽게(1,200,000), 소수는 그대로, 비율은 퍼센트(0.075 → 7.5) */
function initialText(value: number, percent: boolean): string {
  if (percent) return ratioToPercentText(value);
  return Number.isInteger(value) ? formatNumber(value) : numberToFieldText(value);
}

interface CommonProps {
  label: string;
  hint?: string;
  /** 오류 요약에 쓸 이름 (어느 기의 어느 칸인지 알 수 있게) */
  problemLabel: string;
  /** 오류가 생기거나(문구) 풀릴 때(null) 알려요 */
  onProblem: (message: string | null) => void;
}

interface NumberFieldProps extends CommonProps {
  /** 지금 계산에 쓰는 값 (비율 칸은 0~1) */
  value: number;
  spec: FieldSpec;
  /** 비율 칸: 화면에는 %(0~100)로 보이고, 위로 올리는 값은 0~1 */
  percent?: boolean;
  inputMode?: "numeric" | "decimal";
  onCommit: (value: number) => void;
}

export function NumberField({ label, hint, value, spec, percent = false, inputMode = "decimal", problemLabel, onProblem, onCommit }: NumberFieldProps) {
  const { t, locale } = useAdmin();
  // 칸의 글자는 처음 한 번만 값에서 만들어요. 줄 수가 바뀌는 편집 뒤에는 편집기가 칸을 새로 그려서(key) 다시 맞춰요
  const [text, setText] = useState(() => initialText(value, percent));
  const [error, setError] = useState<string | null>(null);

  const change = (next: string) => {
    setText(next);
    const result = percent ? parseFieldPercent(next) : parseFieldNumber(next, spec);
    if (result.ok) {
      setError(null);
      onProblem(null);
      onCommit(result.value);
      return;
    }
    const message = fieldErrorText(result.error, percent ? { min: 0, max: 100 } : spec, locale);
    setError(message);
    onProblem(t("admin.finance.edit.errorItem", { field: problemLabel, reason: message }));
  };

  return (
    <Field label={label} hint={hint} error={error}>
      {(props) => <input {...props} className="input" type="text" inputMode={inputMode} autoComplete="off" value={text} onChange={(event) => change(event.target.value)} />}
    </Field>
  );
}

interface TextFieldProps extends CommonProps {
  value: string;
  maxLength: number;
  onCommit: (value: string) => void;
}

/** 이름 칸(기 이름 · 경비 항목): 앞뒤 공백을 뺀 글자가 1자 이상 maxLength 자 이하일 때만 올려요 */
export function TextField({ label, hint, value, maxLength, problemLabel, onProblem, onCommit }: TextFieldProps) {
  const { t } = useAdmin();
  const [text, setText] = useState(value);
  const [error, setError] = useState<string | null>(null);

  const change = (next: string) => {
    setText(next);
    const trimmed = next.trim();
    if (trimmed === "" || trimmed.length > maxLength) {
      const message = t("admin.finance.error.label", { max: maxLength });
      setError(message);
      onProblem(t("admin.finance.edit.errorItem", { field: problemLabel, reason: message }));
      return;
    }
    setError(null);
    onProblem(null);
    onCommit(trimmed);
  };

  return (
    <Field label={label} hint={hint} error={error}>
      {(props) => <input {...props} className="input" type="text" autoComplete="off" value={text} onChange={(event) => change(event.target.value)} />}
    </Field>
  );
}

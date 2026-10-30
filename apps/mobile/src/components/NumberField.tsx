// 숫자만 받는 입력 칸. 입력 중에는 칸 안의 글자를 그대로 두고(지우는 중의 빈 칸 포함), 바깥 값이 바뀌면(범위 밖 값이 잘린 경우 등)
// 그 값으로 맞춰요. 상태를 렌더 중에 맞추는 방식이라 별도 effect 가 필요 없어요.
import { useState } from "react";
import { digitsOnly, parseCount } from "@/lib/forms";
import { Field, type FieldProps } from "@/components/ui";

export interface NumberFieldProps extends Omit<FieldProps, "value" | "onChangeText" | "keyboardType" | "inputMode"> {
  value: number;
  onChangeValue: (value: number) => void;
  maxLength?: number;
}

export function NumberField({ value, onChangeValue, maxLength = 10, ...rest }: NumberFieldProps) {
  const [text, setText] = useState(String(value));
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    if (parseCount(text) !== value) setText(String(value));
  }
  return (
    <Field
      {...rest}
      value={text}
      keyboardType="number-pad"
      inputMode="numeric"
      maxLength={maxLength}
      onChangeText={(raw) => {
        // 앞의 0 은 지워요 ("05" → "5")
        const digits = digitsOnly(raw, maxLength).replace(/^0+(?=\d)/, "");
        setText(digits);
        onChangeValue(digits === "" ? 0 : Number(digits));
      }}
    />
  );
}

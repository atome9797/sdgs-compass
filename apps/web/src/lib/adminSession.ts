"use client";

// 운영자 화면(/admin/*)용 세션 훅. 언어는 필요하지만 역할(학생·기업)은 필요 없어요 — useSession 은 역할까지 정해져야 쓸 수 있어서 따로 뒀어요.
// 데모 데이터(demo)는 읽기만 해요: 운영자 화면은 앱의 데이터를 바꾸는 동작(dispatch)을 하지 않아서 일부러 내주지 않아요.
import { useMemo } from "react";
import type { DemoState } from "@sdgs-compass/core/domain";
import { DEFAULT_LOCALE, type Locale } from "@sdgs-compass/core/i18n";
import { makeT, type TFunction } from "@sdgs-compass/core/messages";
import { useBoot } from "./session";

export interface AdminSessionValue {
  locale: Locale;
  t: TFunction;
  /** 읽기 전용으로 쓰세요 (이용 현황의 숫자를 여기서 세요) */
  demo: DemoState;
}

/** 게이트(언어 선택)를 지난 뒤에만 쓸 수 있어요 */
export function useAdmin(): AdminSessionValue {
  const { app } = useBoot();
  const locale = app?.locale ?? DEFAULT_LOCALE;
  const t = useMemo(() => makeT(locale), [locale]);
  if (!app || app.locale === null) throw new Error("언어를 고른 뒤에만 쓸 수 있어요");
  return { locale: app.locale, t, demo: app.demo };
}

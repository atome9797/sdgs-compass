// 테스트용 최소 데이터 (실제 샘플 데이터는 @sdgs-compass/data 에 있어요)
import type { Challenge, StudentProfile } from "../domain";

export function makeChallenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: "ch-test",
    companyId: "co-test",
    title: { ja: "テスト", ko: "테스트" },
    summary: { ja: "概要", ko: "개요" },
    background: { ja: "背景", ko: "배경" },
    mission: { ja: "ミッション", ko: "미션" },
    deliverables: [{ ja: "企画書", ko: "기획서" }],
    sdgIds: [14],
    skills: ["design"],
    prizeYen: 100_000,
    rewards: ["prize"],
    participation: "both",
    impactPoints: 100,
    opensOn: "2026-10-01",
    closesOn: "2026-11-10",
    status: "open",
    applicants: 0,
    hue: 200,
    ...overrides,
  };
}

export function makeProfile(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return {
    id: "stu-test",
    nickname: "Tester",
    university: "Test University",
    faculty: "Test Faculty",
    gradYear: 2028,
    skills: ["design", "marketing"],
    sdgInterests: [14, 12, 13],
    scoutable: true,
    bio: "",
    ...overrides,
  };
}

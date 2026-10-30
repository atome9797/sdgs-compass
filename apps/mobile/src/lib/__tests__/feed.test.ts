// SNS 피드 화면의 작은 규칙들: 글을 쓰는 쪽, 글 카드의 바로가기(역할별로 갈 수 있는 곳만), 자랑 글에 붙은 실적 찾기.
import type { DemoState } from "@sdgs-compass/core/domain";
import { MESSAGES } from "@sdgs-compass/core/messages";
import { selectFeed, type PostVM } from "@sdgs-compass/core/selectors";
import { reducer } from "@sdgs-compass/core/state";
import { createInitialState } from "@sdgs-compass/data/seed";
import { bragActivityId, FEED_LINK_ICON, FEED_LINK_LABEL, feedLinks, kindOfRole, type FeedLinkKind } from "../feed";

const TODAY = "2026-10-30";
const demo: DemoState = createInitialState(TODAY);

/** 내가 우수상 실적(h-5b)으로 자랑 글을 하나 올린 뒤의 상태 */
const withMyBrag: DemoState = reducer(demo, { type: "createPost", draft: { kind: "brag", body: "해커톤에서 우수상을 받았어요!", activityId: "h-5b" }, at: `${TODAY}T09:00` });

function postOf(state: DemoState, role: "b2c" | "b2b", id: string): PostVM {
  const post = selectFeed(state, "ko", role, "all").posts.find((p) => p.id === id);
  if (!post) throw new Error(`no post ${id}`);
  return post;
}
function myBragId(state: DemoState): string {
  const mine = state.posts.find((p) => p.kind === "brag" && p.mine);
  if (!mine) throw new Error("no brag of mine");
  return mine.id;
}

test("글을 쓰는 쪽: 학생은 자랑 글, 기업은 홍보 글", () => {
  expect(kindOfRole("b2c")).toBe("brag");
  expect(kindOfRole("b2b")).toBe("pr");
});

test("바로가기 단추마다 이름 문구와 아이콘이 있어요", () => {
  const kinds: FeedLinkKind[] = ["certificate", "makeCard", "challenge"];
  expect(Object.keys(FEED_LINK_LABEL).sort()).toEqual([...kinds].sort());
  expect(Object.keys(FEED_LINK_ICON).sort()).toEqual([...kinds].sort());
  for (const kind of kinds) {
    expect(Object.keys(MESSAGES)).toContain(FEED_LINK_LABEL[kind]);
    expect(FEED_LINK_ICON[kind].length).toBeGreaterThan(0);
  }
});

// ───────── 학생 계정 ─────────

test("학생: 내 자랑 글에는 증명서 보기와 카드뉴스로 만들기(그 실적을 미리 골라서)가 있어요", () => {
  const id = myBragId(withMyBrag);
  const post = postOf(withMyBrag, "b2c", id);
  expect(post.mine).toBe(true);
  expect(post.achievement?.certificateId).toBeTruthy();
  const links = feedLinks(post, "b2c", bragActivityId(withMyBrag.posts, id));
  expect(links).toEqual([
    { kind: "certificate", href: `/certificate/${post.achievement?.certificateId}` },
    { kind: "makeCard", href: "/share?activity=h-5b" },
  ]);
});

test("학생: 다른 학생의 샘플 자랑 글에는 갈 곳이 없어요 (남의 증명서·카드뉴스는 열 수 없어요)", () => {
  for (const id of ["po-5", "po-6", "po-7", "po-8"]) {
    const post = postOf(demo, "b2c", id);
    expect(post.kind).toBe("brag");
    expect(feedLinks(post, "b2c", bragActivityId(demo.posts, id))).toEqual([]);
  }
});

test("학생: 기업의 홍보 글에는 챌린지 보기가 있어요", () => {
  expect(feedLinks(postOf(demo, "b2c", "po-1"), "b2c", null)).toEqual([{ kind: "challenge", href: "/challenge/ch-foodloss" }]);
  expect(feedLinks(postOf(demo, "b2c", "po-4"), "b2c", null)).toEqual([{ kind: "challenge", href: "/challenge/ch-bottle" }]);
});

test("학생: 챌린지를 연결하지 않은 홍보 글에는 바로가기가 없어요", () => {
  const post: PostVM = { ...postOf(demo, "b2c", "po-1"), challenge: null };
  expect(feedLinks(post, "b2c", null)).toEqual([]);
});

test("학생: 내 글이지만 증명서가 없는 실적이면 카드뉴스로 만들기만 있어요", () => {
  const base = postOf(withMyBrag, "b2c", myBragId(withMyBrag));
  if (!base.achievement) throw new Error("achievement expected");
  const post: PostVM = { ...base, achievement: { ...base.achievement, certificateId: null } };
  expect(feedLinks(post, "b2c", "h-5b")).toEqual([{ kind: "makeCard", href: "/share?activity=h-5b" }]);
  // 어떤 실적인지 모르면 카드뉴스 화면에서 고르도록 그냥 열어요
  expect(feedLinks(post, "b2c", null)).toEqual([{ kind: "makeCard", href: "/share" }]);
});

// ───────── 기업 계정 ─────────

test("기업: 우리 회사의 홍보 글에서 그 챌린지의 응모자 화면으로 가요", () => {
  const post = postOf(demo, "b2b", "po-4");
  expect(post.mine).toBe(true);
  expect(feedLinks(post, "b2b", null)).toEqual([{ kind: "challenge", href: "/b2b/applicants?id=ch-bottle" }]);
});

test("기업: 다른 회사의 홍보 글은 열 곳이 없어요 (챌린지 상세는 학생 화면이에요)", () => {
  for (const id of ["po-1", "po-2", "po-3"]) {
    expect(feedLinks(postOf(demo, "b2b", id), "b2b", null)).toEqual([]);
  }
});

test("기업: 학생의 자랑 글에는 바로가기가 없어요 (증명서·카드뉴스는 학생 화면이에요)", () => {
  for (const id of ["po-5", "po-6", "po-7", "po-8", myBragId(withMyBrag)]) {
    expect(feedLinks(postOf(withMyBrag, "b2b", id), "b2b", null)).toEqual([]);
  }
});

test("기업이 새로 올린 글(챌린지 연결)도 응모자 화면으로 이어져요", () => {
  const next = reducer(demo, {
    type: "createPost",
    draft: { kind: "pr", title: "아침시장 챌린지", body: "참여해 주세요", sdgIds: [14, 8], challengeId: "ch-asaichi", requestOfficial: false },
    at: `${TODAY}T09:00`,
  });
  const created = next.posts[0];
  expect(feedLinks(postOf(next, "b2b", created.id), "b2b", null)).toEqual([{ kind: "challenge", href: "/b2b/applicants?id=ch-asaichi" }]);
  // 같은 글을 학생이 보면 챌린지 상세로 가요
  expect(feedLinks(postOf(next, "b2c", created.id), "b2c", null)).toEqual([{ kind: "challenge", href: "/challenge/ch-asaichi" }]);
});

// ───────── 자랑 글에 붙은 실적 찾기 ─────────

test("내 자랑 글에는 붙인 실적의 id 가 있고, 샘플 글·홍보 글·없는 글은 null 이에요", () => {
  expect(bragActivityId(withMyBrag.posts, myBragId(withMyBrag))).toBe("h-5b");
  expect(bragActivityId(demo.posts, "po-5")).toBeNull();
  expect(bragActivityId(demo.posts, "po-1")).toBeNull();
  expect(bragActivityId(demo.posts, "nope")).toBeNull();
  expect(bragActivityId([], "po-5")).toBeNull();
});

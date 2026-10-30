import { describe, expect, it } from "vitest";
import { MESSAGES } from "@sdgs-compass/core/messages";
import { activeTabId, B2B_TABS, B2C_TABS, tabsFor } from "./nav";
import {
  areaOf, applicantsHref, buildHref, certificateHref, challengeHref, feedHref, guardRedirect, homeFor, normalizeBasePath, normalizePath, parseSdgParam,
  postNewHref, receiptHref, ROUTES, searchHref, shareHref, stripBasePath, submitHref, withBase,
} from "./routes";

describe("buildHref", () => {
  it("항상 슬래시로 끝나는 앱 안 주소를 만들어요", () => {
    expect(buildHref(ROUTES.root)).toBe("/");
    expect(buildHref(ROUTES.home)).toBe("/home/");
    expect(buildHref(ROUTES.b2bTalent)).toBe("/b2b/talent/");
  });

  it("상세 화면은 동적 경로가 아니라 쿼리(?id=)를 써요", () => {
    expect(challengeHref("ch-plastic")).toBe("/challenge/?id=ch-plastic");
    expect(submitHref("ch-plastic")).toBe("/challenge/submit/?id=ch-plastic");
    expect(receiptHref("ch-plastic")).toBe("/challenge/submit/?id=ch-plastic&receipt=1");
    expect(certificateHref("SC-C-0001")).toBe("/certificate/?id=SC-C-0001");
    expect(applicantsHref("ch-bottle")).toBe("/b2b/applicants/?id=ch-bottle");
    for (const href of [challengeHref("a"), submitHref("a"), certificateHref("a"), applicantsHref("a")]) expect(href).not.toContain("[");
  });

  it("비어 있거나 없는 값은 빼고, 글자는 인코딩해요", () => {
    expect(certificateHref()).toBe("/certificate/");
    expect(buildHref(ROUTES.search, { q: "", sdg: undefined, x: null })).toBe("/search/");
    expect(buildHref(ROUTES.search, { q: "海 & 空" })).toBe("/search/?q=%E6%B5%B7%20%26%20%E7%A9%BA");
    expect(buildHref(ROUTES.search, { n: 0 })).toBe("/search/?n=0");
  });

  it("검색 주소에는 SDG 번호 목록이 들어가요", () => {
    expect(searchHref()).toBe("/search/");
    expect(searchHref({ sdgIds: [14] })).toBe("/search/?sdg=14");
    expect(searchHref({ q: "海", sdgIds: [14, 12] })).toBe("/search/?q=%E6%B5%B7&sdg=14%2C12");
  });

  it("피드 주소: 역할마다 다른 경로에, 막 올린 글(posted)과 미리 고른 실적·챌린지는 쿼리로 넘겨요", () => {
    expect(feedHref("b2c")).toBe("/feed/");
    expect(feedHref("b2b")).toBe("/b2b/feed/");
    expect(feedHref("b2c", "po100")).toBe("/feed/?posted=po100");
    expect(feedHref("b2b", "po100")).toBe("/b2b/feed/?posted=po100");
    expect(feedHref("b2c", null)).toBe("/feed/");
    expect(postNewHref("b2c")).toBe("/feed/new/");
    expect(postNewHref("b2b")).toBe("/b2b/feed/new/");
    expect(postNewHref("b2c", "h-5b")).toBe("/feed/new/?activity=h-5b");
    expect(postNewHref("b2b", "ch-bottle")).toBe("/b2b/feed/new/?challenge=ch-bottle");
    expect(postNewHref("b2c", null)).toBe("/feed/new/");
    expect(shareHref()).toBe("/share/");
    expect(shareHref("h-5b")).toBe("/share/?activity=h-5b");
    expect(shareHref(null)).toBe("/share/");
  });
});

describe("parseSdgParam", () => {
  it("1~17 의 정수만 받고, 겹치는 값과 이상한 값은 버려요", () => {
    expect(parseSdgParam("14,12,abc,99,14,0,17,1.5, 3 ")).toEqual([14, 12, 17, 3]);
    expect(parseSdgParam("")).toEqual([]);
    expect(parseSdgParam(null)).toEqual([]);
    expect(parseSdgParam(undefined)).toEqual([]);
  });
});

describe("basePath", () => {
  it("normalizeBasePath: 앞 슬래시 하나, 뒤 슬래시 없음", () => {
    expect(normalizeBasePath("")).toBe("");
    expect(normalizeBasePath(undefined)).toBe("");
    expect(normalizeBasePath(null)).toBe("");
    expect(normalizeBasePath("/")).toBe("");
    expect(normalizeBasePath("sdgs-compass")).toBe("/sdgs-compass");
    expect(normalizeBasePath("/sdgs-compass/")).toBe("/sdgs-compass");
    expect(normalizeBasePath(" //a/b// ")).toBe("/a/b");
  });

  it("withBase: Next 가 손대지 않는 원본 주소에 basePath 를 붙여요", () => {
    expect(withBase("/icons/icon-192.png", "/sdgs-compass")).toBe("/sdgs-compass/icons/icon-192.png");
    expect(withBase("icons/icon-192.png", "sdgs-compass/")).toBe("/sdgs-compass/icons/icon-192.png");
    expect(withBase("/icons/icon-192.png", "")).toBe("/icons/icon-192.png");
    expect(withBase("/", "/sdgs-compass")).toBe("/sdgs-compass/");
  });

  it("stripBasePath: 경로 앞의 basePath 만 떼요", () => {
    expect(stripBasePath("/sdgs-compass/home/", "/sdgs-compass")).toBe("/home/");
    expect(stripBasePath("/sdgs-compass", "/sdgs-compass")).toBe("/");
    expect(stripBasePath("/sdgs-compass/", "/sdgs-compass")).toBe("/");
    expect(stripBasePath("/sdgs-compassX/home/", "/sdgs-compass")).toBe("/sdgs-compassX/home/");
    expect(stripBasePath("/home/", "/sdgs-compass")).toBe("/home/");
    expect(stripBasePath("/home/", "")).toBe("/home/");
  });

  it("normalizePath: 쿼리·해시·끝 슬래시를 정리해요", () => {
    expect(normalizePath("/b2b/")).toBe("/b2b");
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath("")).toBe("/");
    expect(normalizePath("/home/?x=1#y")).toBe("/home");
    expect(normalizePath("home")).toBe("/home");
  });
});

describe("areaOf / guardRedirect", () => {
  it("경로가 학생 영역인지 기업 영역인지 구분해요", () => {
    expect(areaOf("/home/")).toBe("b2c");
    expect(areaOf("/challenge/submit/")).toBe("b2c");
    expect(areaOf("/settings")).toBe("b2c");
    expect(areaOf("/b2b/")).toBe("b2b");
    expect(areaOf("/b2b/talent/")).toBe("b2b");
    expect(areaOf("/feed/")).toBe("b2c");
    expect(areaOf("/feed/new/")).toBe("b2c");
    expect(areaOf("/b2b/feed/")).toBe("b2b");
    expect(areaOf("/b2b/feed/new/")).toBe("b2b");
    expect(areaOf("/")).toBe("neutral");
    expect(areaOf("/nope/")).toBe("neutral");
    expect(areaOf("/b2bx/")).toBe("neutral");
  });

  it("역할을 아직 안 골랐으면 옮기지 않아요 (게이트가 화면을 가려요)", () => {
    for (const path of ["/", "/home/", "/b2b/", "/nope/"]) expect(guardRedirect(path, null)).toBeNull();
  });

  it("b2c 는 학생 화면만 — 기업 화면으로 가면 홈으로, 루트도 홈으로", () => {
    expect(guardRedirect("/", "b2c")).toBe("/home/");
    expect(guardRedirect("/home/", "b2c")).toBeNull();
    expect(guardRedirect("/challenge/", "b2c")).toBeNull();
    expect(guardRedirect("/b2b/", "b2c")).toBe("/home/");
    expect(guardRedirect("/b2b/talent/", "b2c")).toBe("/home/");
    expect(guardRedirect("/feed/", "b2c")).toBeNull();
    expect(guardRedirect("/feed/new/", "b2c")).toBeNull();
    expect(guardRedirect("/b2b/feed/", "b2c")).toBe("/home/");
    expect(guardRedirect("/b2b/feed/new/", "b2c")).toBe("/home/");
    expect(guardRedirect("/nope/", "b2c")).toBeNull();
  });

  it("b2b 는 /b2b/* 만 — 학생 화면으로 가면 기업 대시보드로", () => {
    expect(guardRedirect("/", "b2b")).toBe("/b2b/");
    expect(guardRedirect("/home/", "b2b")).toBe("/b2b/");
    expect(guardRedirect("/settings/", "b2b")).toBe("/b2b/");
    expect(guardRedirect("/b2b/", "b2b")).toBeNull();
    expect(guardRedirect("/b2b/esg/", "b2b")).toBeNull();
    expect(guardRedirect("/b2b/settings/", "b2b")).toBeNull();
    expect(guardRedirect("/b2b/feed/", "b2b")).toBeNull();
    expect(guardRedirect("/b2b/feed/new/", "b2b")).toBeNull();
    expect(guardRedirect("/feed/", "b2b")).toBe("/b2b/");
    expect(guardRedirect("/feed/new/", "b2b")).toBe("/b2b/");
    expect(homeFor("b2c")).toBe("/home/");
    expect(homeFor("b2b")).toBe("/b2b/");
  });

  it("basePath 가 붙은 경로도, 빠진 경로(usePathname)도 같게 다뤄요", () => {
    expect(guardRedirect("/sdgs-compass/", "b2c", "/sdgs-compass")).toBe("/home/");
    expect(guardRedirect("/sdgs-compass/home/", "b2b", "/sdgs-compass")).toBe("/b2b/");
    expect(guardRedirect("/sdgs-compass/b2b/", "b2b", "/sdgs-compass")).toBeNull();
    expect(guardRedirect("/home/", "b2b", "/sdgs-compass")).toBe("/b2b/");
  });
});

describe("탭 정의", () => {
  it("모든 탭은 실제 경로와 사전에 있는 문구를 가리켜요", () => {
    const routes: readonly string[] = Object.values(ROUTES);
    for (const tab of [...B2C_TABS, ...B2B_TABS]) {
      expect(routes).toContain(tab.path);
      expect(MESSAGES[tab.labelKey]).toBeDefined();
      if (tab.tabLabelKey) expect(MESSAGES[tab.tabLabelKey]).toBeDefined();
      for (const p of tab.match) expect(routes).toContain(p);
    }
    // 피드는 두 번째 탭이에요 (6개 — 390px 폭에 들어가도록 짧은 이름을 써요)
    expect(B2C_TABS.map((t) => t.id)).toEqual(["home", "feed", "search", "impact", "messages", "settings"]);
    expect(B2B_TABS.map((t) => t.id)).toEqual(["dashboard", "feed", "applicants", "talent", "esg", "settings"]);
    expect(tabsFor("b2c")).toBe(B2C_TABS);
    expect(tabsFor("b2b")).toBe(B2B_TABS);
  });

  it("지금 주소에 맞는 탭을 켜요", () => {
    expect(activeTabId(B2C_TABS, "/home/")).toBe("home");
    expect(activeTabId(B2C_TABS, "/challenge/")).toBe("home");
    expect(activeTabId(B2C_TABS, "/challenge/submit/")).toBe("home");
    expect(activeTabId(B2C_TABS, "/search/")).toBe("search");
    expect(activeTabId(B2C_TABS, "/feed/")).toBe("feed");
    expect(activeTabId(B2C_TABS, "/feed/new/")).toBe("feed");
    expect(activeTabId(B2C_TABS, "/certificate/")).toBe("impact");
    expect(activeTabId(B2C_TABS, "/share/")).toBe("impact");
    expect(activeTabId(B2C_TABS, "/nope/")).toBeNull();
    expect(activeTabId(B2B_TABS, "/b2b/")).toBe("dashboard");
    expect(activeTabId(B2B_TABS, "/b2b/new/")).toBe("dashboard");
    expect(activeTabId(B2B_TABS, "/b2b/feed/")).toBe("feed");
    expect(activeTabId(B2B_TABS, "/b2b/feed/new/")).toBe("feed");
    expect(activeTabId(B2B_TABS, "/sdgs-compass/b2b/feed/", "/sdgs-compass")).toBe("feed");
    expect(activeTabId(B2B_TABS, "/b2b/applicants/")).toBe("applicants");
    expect(activeTabId(B2B_TABS, "/b2b/settings/")).toBe("settings");
    expect(activeTabId(B2B_TABS, "/sdgs-compass/b2b/talent/", "/sdgs-compass")).toBe("talent");
  });
});

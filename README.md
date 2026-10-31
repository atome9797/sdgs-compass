# SDGsコンパス (SDGs Compass)

**企業と学生をつなぐ、SDGs特化型マッチングプラットフォーム.**
기업이 SDGs 과제(챌린지)를 내면 학생이 기획서로 응모하고, 심사·수상 기록이 **SDG별 Impact Index(레이더 차트)** 와
**위·변조를 확인할 수 있는 디지털 증명서**로 남아요. 그 실적을 본 기업이 인재를 스카우트·채용하면
**중개 수수료 ¥30,000 중 50%를 기업 이름으로 SDGs 활동에 기부**하는 구조예요.
(専修大学ベンチャービジネスコンテスト 第25回(2026) 출품 아이디어를 **직접 만져 볼 수 있는 데모 — 웹 + 모바일 앱(Android APK 제공)** 으로 만든 저장소입니다.)

[![CI](https://github.com/atome9797/sdgs-compass/actions/workflows/ci.yml/badge.svg)](https://github.com/atome9797/sdgs-compass/actions/workflows/ci.yml)
[![Pages](https://github.com/atome9797/sdgs-compass/actions/workflows/pages.yml/badge.svg)](https://github.com/atome9797/sdgs-compass/actions/workflows/pages.yml)
[![Android APK](https://github.com/atome9797/sdgs-compass/actions/workflows/android-apk.yml/badge.svg)](https://github.com/atome9797/sdgs-compass/actions/workflows/android-apk.yml)

- **일본어 / 한국어 둘 다**: 웹·앱을 처음 열면 **언어를 먼저 고르고**(기기 언어를 미리 강조만 해요), 언제든 머리글의 **日本語 | 한국어** 토글로 바꿔요.
  발표는 일본어로, 개발·확인은 한국어로 같은 앱을 써요.
- **두 가지 역할**: 언어 다음에 **학생·개인(B2C)** / **기업·기관(B2B)** 중 고르고, 머리글의 역할 칩으로 언제든 전환해요. 한 앱에서 양쪽 흐름을 모두 시연할 수 있어요.
- **서버 없이 전체 흐름이 돌아가는 데모**: 샘플 데이터(모두 가상)로 챌린지 출제 → 응모 → 심사 → 수상 → Impact → 증명서 → 스카우트 → 채용 → 수수료·기부까지 한 바퀴를 돌려 볼 수 있어요. 화면마다 `DEMO` 배지가 붙어요.
- **SNS 피드**: 학생은 수상·제출·참가 실적을 **자랑 글**로, 기업은 SDGs 활동을 **홍보 글**(항상 `PR` 표시)로 올려요. 이메일 주소·전화번호처럼 보이는 글자는 올릴 수 없고, 공식 SNS(X·Instagram·Facebook 중 하나) 게시 신청은 채널마다 하루에 한 회사만 받아요 → [설계](docs/sns-feed.md).
- **운영자 화면(웹 전용 · 데모)**: 이용 현황 · SNS 지표 · 수지·자금 시뮬레이션을 한 곳에서 봐요. 이용 현황은 앱의 데모 데이터를 세고, SNS 지표는 사람이 옮겨 적은 숫자(CSV 가능)를 주별로 보여 주고, 수지·자금은 입력한 가정으로 흑자 전환 시기·자금 잔액·손익분기 기업 수를 계산해 두 시나리오를 겹쳐 비교해요. 로그인 없는 데모이고 입력은 이 브라우저에만 저장돼요 → [docs/admin.md](docs/admin.md).
- **リワード残高(보상 잔액 · 데모)**: 기업이 과제에 건 **상금**(출제할 때 운영사에 예치 → 최우수상 팀에 송금)과 **운영 환원**(각 기 말에 운전자금 3개월분을 남긴 이익 전부를 미리 공개한 실적 기준으로)을 학생이 엔 단위 잔액으로 받고, 본인 확인 뒤 출금(1회 100만 엔 이하)을 신청해요. 운영사가 **第二種資金移動業 등록을 받은 뒤 제공할 기능**이라 데모는 실제로 보내지 않아요 → [docs/rewards.md](docs/rewards.md).
- **웹(Next.js) + 모바일(Expo / React Native)** 이 한 저장소(npm 워크스페이스 모노레포)에 있고, 규칙·계산·화면 모델·문구는 `packages/core`, 샘플 데이터·저장은 `packages/data`를 함께 써요.
  그래서 어느 쪽에서 해도 결과와 문구가 같아요. ([SchedulAI](https://github.com/atome9797/SchedulAI) 와 같은 방식)
- **DB 설계까지 검증**: PostgreSQL 16 스키마(표 68개 · 뷰 8개)를 실제 DB에 올려 시험 7개 파일(구조·규칙·흐름·앱↔DB 대조·운영·SNS 피드·リワード残高)을 통과시켰어요. ERD 는 그 DB에서 읽어 자동으로 만들어요.
- **GitHub Actions**: CI(웹·앱·DB 검사), GitHub Pages 웹 데모 자동 배포, Android 데모 APK 자동 빌드(+ Releases 업로드), 마일스톤을 닫으면 태그·Release 자동 생성.
- **QR 로 바로 체험**: 발표 당일에는 QR 코드를 공개하고, 청중이 휴대폰으로 읽어 설치 없이 웹 데모에 들어와요 → [열기](#열기).

> 🇯🇵 日本語の概要は[一番下](#日本語の概要)にあります.

## 목차

1. [서비스 한눈에 보기](#서비스-한눈에-보기)
2. [데모 열기와 발표용 사용법](#데모-열기와-발표용-사용법)
3. [서비스 흐름 (플로우차트)](#서비스-흐름-플로우차트)
4. [화면 목업](#화면-목업)
5. [ERD (DB 설계)](#erd-db-설계)
6. [기능 구현 현황](#기능-구현-현황)
7. [저장소 구조](#저장소-구조)
8. [실행하기](#실행하기)
9. [CI / 배포 (GitHub Actions)](#ci--배포-github-actions)
10. [설계 결정 — SchedulAI 와 다른 점](#설계-결정--schedulai-와-다른-점)
11. [데모의 한계와 알려진 점](#데모의-한계와-알려진-점)
12. [공개 저장소 안내](#공개-저장소-안내)
13. [日本語の概要](#日本語の概要)

## 서비스 한눈에 보기

| | 학생·개인 (B2C) | 기업·기관 (B2B) |
| --- | --- | --- |
| 하는 일 | 관심 SDGs·스킬에 맞는 챌린지를 찾고, 팀을 꾸려 기획서를 내요 | SDGs 과제를 출제하고, 응모작을 심사·수상·채용해요 |
| 얻는 것 | 수상·참가 실적이 **Impact Index · 배지 · 디지털 증명서 · SNS 카드뉴스**로 남고, 피드에 **자랑 글**로 올릴 수 있어요 | 과제 해결 아이디어, 검증된 인재, **ESG 성과 리포트 · 실천 마크**, 피드의 **홍보 글** |
| 핵심 화면 | 홈 · 피드 · 검색 · 챌린지 상세 · 기획서 제출 · Impact · 증명서 · 카드뉴스 · 메시지 | 대시보드 · 피드 · 새 챌린지 · 응모자·심사 · 인재 검색·스카우트 · ESG·실천 마크 |
| 돈 | 무료 · 기업 상금과 운영 환원을 **リワード残高**로 받아 출금 (등록 후 제공 예정 — 데모) | 채용(매칭) 1건당 **¥30,000** (그중 **50%는 기업 이름으로 SDGs 활동에 기부**) · 상금은 출제할 때 운영사에 예치 |

- **왜 플랫폼을 거치나요?** 학생의 SDGs 활동 이력이 한곳에 쌓이고(포트폴리오), 기업은 같은 자리에서 아이디어·인재·ESG 성과를 얻어요.
  기부 내역이 투명하게 보이는 것이 "직접 계약(중간 생략)" 대신 플랫폼을 쓸 명분이에요.
- **실천 마크**(일본어 화면은 「取組みマーク」)는 기업의 SDGs 활동을 앱이 정한 **독자 기준**으로 보여 주는 표시예요. 국가·자치체·국제연합의 인증이 아니고, UN·SDGs 공식 로고는 쓰지 않았어요(번호를 넣은 색 타일만 사용).
  마크 화면에는 그 안내가, 첫 화면·설정·(PC) 사이드바에는 "이 앱은 유엔의 승인을 받은 것이 아니에요" 고지가 항상 보여요. 코드·DB 이름은 예전 그대로 `cert_*` 예요.
- **학생은 무엇을 얻나요?** 무료로 쓰고, 활동이 **기록과 디지털 증명서(QR)** 로 남아요. "SDGs 활동만으로 받는 전국 공통 장학금"은 조사에서 확인되지 않았고, 가장 가까운 실제 제도는 대학의 활동 장려 제도(예: 専修大学 自己啓発奨学生)예요.
  그래서 앱은 장학금을 주지 않고, **신청할 때 쓸 활동 기록·증명서**를 갖추는 데까지가 범위예요. Impact 화면의 「申請用のまとめを作る」로 기간을 골라 활동·증명서를 **A4 한 장(인쇄·PDF)** 으로 정리할 수 있어요 → [docs/student-merit.md](docs/student-merit.md).
- **실적은 레벨로 보여요.** 학생의 실적(참가·제출·수상)은 화면에서 포인트 숫자 대신 **임팩트 레벨(Lv.1~5) + 다음 레벨까지 진행률(%)** 로 보여요. 포인트는 레벨 계산과 정렬에 쓰는 내부 점수이고 돈과는 관계없어요(바꿀 수 없어요). 기업의 인재 검색에도 레벨·수상 수가 보여요.
- **돈은 リワード残高로만 받아요(데모).** 기업이 과제에 건 상금은 출제할 때 운영사에 맡기고 **최우수상 팀**의 잔액으로 보내요(최우수상 없이 끝나면 기업에 반환). 운영사는 각 기 말에 **운전자금 3개월분**(그 기 경비 + 매출원가의 3/12)을 남기고 **그 기 경상이익 중 남는 금액 전부**를 미리 공개한 기준(수상·제출 실적 — 작업 시간·양이 아니에요)으로 학생에게 환원해요. 학생은 **본인 확인 뒤 은행 계좌로 출금**해요(1회 100만 엔 이하). 운영사(株式会社)가 **第二種資金移動業 등록**을 받은 뒤 제공할 기능이고, 등록 전에는 상금을 기업이 수상자에게 직접 지급해요. 잔액은 살 수 없고(충전 없음) 남에게 넘길 수 없어요 → [docs/rewards.md](docs/rewards.md).

## 데모 열기와 발표용 사용법

### 열기

발표 당일은 **QR 코드를 공개하고, 청중이 휴대폰으로 읽어서 웹 데모에 들어오는** 방식으로 설명해요. 설치할 것이 없어요.

<table>
<tr>
<td width="210"><img src="docs/qr/web-demo.svg" alt="웹 데모 QR 코드" width="190"></td>
<td>
<b>휴대폰 카메라로 읽어 보세요</b> → <a href="https://atome9797.github.io/sdgs-compass/?lang=ja">https://atome9797.github.io/sdgs-compass/?lang=ja</a><br>
QR 주소 끝의 <code>?lang=ja</code> 덕분에 언어 선택 없이 <b>일본어</b>로 시작해요(역할 선택부터). 입력한 내용은 각자 기기에만 저장돼서 서로 영향이 없어요.<br>
슬라이드용 이미지: <a href="docs/qr/web-demo.png">PNG</a> · <a href="docs/qr/web-demo.svg">SVG</a> (주소가 바뀌면 <code>npm run qr</code> 로 다시 만들어요)
</td>
</tr>
</table>

| 방법 | 어디서 | 메모 |
| --- | --- | --- |
| **웹** (QR) | https://atome9797.github.io/sdgs-compass/ | **발표 당일의 기본 경로**예요. GitHub Pages(`pages.yml`)가 main 에 푸시될 때마다 배포해요. **처음 한 번** 저장소 Settings › Pages › Source 를 **GitHub Actions** 로 바꿔야 해요 ([자세히](#github-pages-웹-데모-켜기)). 휴대폰 브라우저에서 "홈 화면에 추가"하면 앱처럼 열려요 |
| **Android 앱(APK)** | [Releases › demo-latest](https://github.com/atome9797/sdgs-compass/releases/tag/demo-latest) 의 `sdgs-compass-demo.apk` | 인터넷이 불안할 때의 **백업**이에요. 서버·개발 서버 없이 혼자 실행돼요. 설치할 때 "출처를 알 수 없는 앱" 허용이 필요해요 ([자세히](#android-데모-apk-받기)) |
| **내 컴퓨터** | `npm install` → `npm run dev` (웹) / `npm run mobile` (앱) | [실행하기](#실행하기) |

> iPhone 용 설치 파일(IPA)은 Apple 개발자 계정과 서명이 필요해서 만들지 않았어요. iPhone 에서는 **웹 데모**("홈 화면에 추가")가 가장 확실해요. 개발용으로는 컴퓨터에서 `npm run mobile` 후 Expo Go 로 열 수도 있지만, 이 앱이 쓰는 Expo SDK 58 을 지원하는 Expo Go 여야 해요.

### 발표 당일: QR → 웹

1. 슬라이드에 QR(`docs/qr/web-demo.png`)과 주소를 함께 보여 줘요. **슬라이드 높이의 1/3 정도로 크게** 넣고, QR 둘레의 흰 여백은 자르지 마세요(어두운 배경 위에서도 읽혀요).
2. 청중이 휴대폰 카메라(iPhone 은 카메라 앱, Android 는 카메라나 Google 렌즈, 일본에서는 LINE 의 QR 리더도 많이 써요)로 읽으면 웹 데모가 열려요.
3. QR 주소에 `?lang=ja` 가 붙어 있어서 **일본어로 바로 시작**해요(언어 선택을 건너뛰고 역할 선택부터 — 그 기기에 한국어가 저장돼 있어도 일본어가 우선). 머리글의 `日本語 | 한국어` 로 언제든 바꿀 수 있어요.
4. 발표자는 자기 폰(또는 노트북)으로 아래 [시연 순서](#시연-순서예시)대로 보여 주고, 청중은 각자 폰에서 따라 눌러 봐요.

| 알아 둘 점 | 내용 |
| --- | --- |
| 인터넷 | 청중 폰이 인터넷에 연결돼야 해요. 배포물 전체(모든 화면 포함)가 압축하면 약 0.3MB 라 느린 회선에서도 가벼워요. 발표장 인터넷이 약하면 발표자 폰의 APK(화면 미러링)와 화면 녹화로 이어 가요 |
| 데이터 | 입력한 내용은 **각자 기기의 브라우저에만** 저장되고 서버로 보내지 않아요. 청중이 눌러도 발표자 화면에 영향이 없고, `설정 › 데모 초기화` 로 처음 상태로 돌려요 |
| 화면 | 개발 중에 폰 폭(390px·320px)에서 가로 넘침과 터치 영역(44px)을 점검했어요. 실제 iPhone·Android·LINE 앱에서 열리는지는 [발표 전 점검표](#발표-전-점검표-5분)로 직접 확인해 주세요 |
| QR | 주소는 `https://atome9797.github.io/sdgs-compass/?lang=ja`, 오류 정정 M 단계의 33×33 칸 QR 이에요. OpenCV 판독기 3종으로 원본·100px 까지 축소·흐림·JPEG·기울기 상태를 읽어 봤어요. `npm run qr:check` 로 주소와 맞는지 확인해요 |

### 첫 화면과 역할 전환

1. **언어 선택** — `日本語` / `한국어` 큰 버튼 두 개. 기기 언어는 미리 강조만 하고 자동으로 고르지 않아요. 한 번 고르면 기기에 기억해요.
   주소에 `?lang=ja`(또는 `?lang=ko`)가 붙어 있으면 이 화면을 건너뛰고 그 언어로 시작해요 — 저장된 언어보다 우선하고, 그 값을 기억해요(발표용 QR 이 이 주소예요).
2. **역할 선택** — "학생·개인(B2C)" / "기업·기관(B2B)" 카드. 데모에서는 로그인 없이 바로 들어가요.
3. 머리글 오른쪽의 **日本語 | 한국어** 토글과 **역할 칩**으로 언제든 바꿔요. 설정 화면의 **데모 초기화**는 샘플 데이터와 설정을 지우고 1번 화면부터 다시 시작해요.
4. **운영자 화면(데모, 웹 전용)** — 역할 선택 화면 아래의 `運営者画面（デモ）`(한국어 `운영자 화면(데모)`) 링크로 들어가요. 역할 선택은 건너뛰고, 위쪽 탭으로 이용 현황 · SNS 지표 · 수지·자금을 오가요. 학생·기업 화면의 메뉴에는 나오지 않아요 → [docs/admin.md](docs/admin.md).

### 시연 순서(예시)

| 순서 | 역할 | 보여 줄 것 | 눈여겨볼 점 |
| --- | --- | --- | --- |
| ⓪ | — | 슬라이드의 **QR 공개** → 청중이 휴대폰으로 웹 데모에 접속 | 설치 없이 바로 열림 · 각자 기기에서 독립 실행 |
| ① | — | 언어 선택 → `日本語` → 학생(B2C) | 같은 앱이 일본어/한국어로 바뀜 |
| ② | B2C | 홈: SDGs 17 타일, 추천(「おすすめの課題」 — 매칭률·이유), 마감 임박 | 관심 SDGs·스킬·마감 임박도·상금으로 계산한 규칙 기반 추천 |
| ③ | B2C | 챌린지 상세(브리핑·상금·마감) → 팀 탭 → "함께하고 싶어요" | SDGs 태그, 팀 모집 게시판 |
| ④ | B2C | 기획서 제출(팀 → 파일 → 제목·요약 → 확인) → **제출 수령증** `SC-YYYYMMDD-NNNN` | 입력 검사(글자 수·파일 형식·마감), 다시 내면 버전이 쌓임 |
| ⑤ | B2C | Impact: **임팩트 레벨 + 다음 레벨까지 진행률(%)**·SDG 레이더 차트·배지 → **디지털 증명서(QR)** → **진위 확인 ✓ / 변조 ✗** → (선택) **신청용 요약**: 기간 고르기 → 「印刷・PDFで保存」 → (선택) **リワード残高**: Impact 의 카드 → 잔액·내역 → 「本人確認を完了する（デモ）」 → 출금 신청 | SHA-256 해시, 변조하면 검증 실패 · 요약은 A4 한 장에 활동·SDGs·증명서 QR·고지(장학금·선정 보장 아님, 대학과 제휴 아님) · 잔액 화면은 고지 ①~④(등록 후 제공 예정·본인 확인·세금/在留資格·레벨은 돈이 아님)가 늘 보이고, 잔액·100만 엔을 넘는 출금은 오류 |
| ⑥ | B2C | SNS 카드뉴스(Instagram 1:1 / LinkedIn 1.91:1) → 공유 | 공유도 발신 실적으로 레벨에 반영(최대 5회) |
| ⑦ | B2C | **피드**: 기업의 홍보 글(`PR` 표시)을 보고 좋아요 → **자랑 글 쓰기**(내 수상·제출·참가 실적 1건 선택 → 본문) → 올리기 | 닉네임·레벨만 공개 · 이메일/전화번호는 올릴 수 없음 · 올린 글이 맨 위에 |
| ⑧ | B2C | 메시지: 기업의 스카우트 수신 → 수락 | 수락하면 1:1 대화로 이어지는 설계(대화는 DB 설계까지) · 스카우트를 받을지는 **설정의 「스카우트 받기」 스위치**로 학생이 정해요(레벨과 무관) |
| ⑨ | B2B | 역할 전환 → 대시보드(KPI 5개) · 새 챌린지(SDGs 최대 3개, 마감 7~90일) | 입력 검사 |
| ⑩ | B2B | 응모자: 심사(1~5점 × 3축) → 수상(**최우수상이면 맡긴 상금을 수상 팀의 リワード残高로 송금 — 데모**) → **채용(매칭)** | 채용하면 **수수료 ¥30,000 / 기부 ¥15,000**이 대시보드에 반영 · 대시보드 「賞金の預け入れ（デモ）」에 예치 중 → 송금이 반영 · 학생의 기획서가 최우수상이면 학생 화면의 잔액이 늘어요 |
| ⑪ | B2B | **피드**: 수상 건의 `홍보하기` → 홍보 글(제목·본문·SDGs·챌린지 연결) → **공식 SNS 게시 신청**(X·Instagram·Facebook 중 채널 선택) | 채널마다 하루에 한 회사만 · 빈 날짜가 자동 배정(샘플에서는 X 는 내일, Instagram·Facebook 은 모레 — 채널을 바꾸면 날짜가 달라져요) · 학생 자랑 글에 좋아요도 눌러 볼 수 있음 |
| ⑫ | B2B | 인재 검색 → 스카우트(하루 3건 제한) | 스카우트 받기를 끈 학생은 「스카우트 수신 안 함」으로 보이고 보낼 수 없음 · 레벨 기준선은 없음(레벨·수상 수는 카드 표시와 정렬에만 써요, 포인트 숫자는 보이지 않아요) |
| ⑬ | B2B | ESG·실천 마크(取組みマーク): 6개 기준 입력 → 점수·★ 단계 → 리포트 생성 | **증빙을 올린 기준만** 점수에 들어감, 면책 문구 |
| ⑭ | 운영자 | 역할 선택 화면 아래 `運営者画面（デモ）` → **이용 현황**: 지금의 숫자 12개 · 기간(7·30·90일) 추이 · 한 줄 읽기 | 학생·기업 화면과 같은 데모 데이터를 세기만 해요(날짜 없는 값은 "지금 값"만) |
| ⑮ | 운영자 | **SNS 지표**: 샘플 불러오기 → X·Instagram·Facebook·YouTube 의 주별 추이 · 최신 주 비교 · CSV 내보내기 | 숫자는 사람이 옮겨 적는 방식(API 연동 없음), 같은 주·같은 SNS 는 덮어써요 |
| ⑯ | 운영자 | **수지·자금**: 샘플 불러오기 → 흑자 전환 시기 · 자금 잔액 · 손익분기 기업 수 → 시나리오 복제·수정 → 두 시나리오 **겹쳐 비교** | 가정 숫자만 계산(세금·감가상각 제외), 결과 문장은 "표시한 기간 안에서는 …"처럼 정직하게 써요 |

### 발표 전 점검표 (5분)

실제 폰에서의 실행은 자동 검사로 확인되지 않아요. 발표 전날 한 번 해 보세요.

- [ ] 슬라이드의 QR 을 **iPhone 과 Android 의 카메라**로 읽는다 → 웹 데모가 열리고 **언어 선택**이 나온다 (LINE 앱의 QR 리더로도 열어 본다)
- [ ] 발표장과 같은 조건(와이파이 또는 모바일 데이터)에서 첫 화면이 몇 초 안에 뜬다
- [ ] 프로젝터·모니터에 띄운 QR 을 **맨 뒤 자리**에서도 읽을 수 있다 (크기·밝기·화면 비율 확인)
- [ ] `日本語` → 역할 선택 → 학생(B2C) 홈이 일본어로 보인다
- [ ] 머리글의 `日本語 | 한국어` 로 한국어로 바뀌고, 다시 일본어로 돌아온다
- [ ] 역할 칩으로 기업(B2B) 대시보드에 갔다가 학생 홈으로 돌아온다
- [ ] 기획서 제출 → 수령증(`SC-…`) → Impact → 디지털 증명서 → 진위 확인 ✓ / 변조 ✗ 까지 한 바퀴 돈다
- [ ] 학생 피드에서 자랑 글을 올리면(실적 선택 → 본문) 맨 위에 보이고, 기업 피드에서 홍보 글에 공식 SNS 게시 신청을 켜고 채널(X·Instagram·Facebook)을 고르면 그 채널의 게시 예정일이 붙는다 (이메일·전화번호를 넣으면 올라가지 않는다)
- [ ] 역할 선택 화면 아래 `運営者画面（デモ）` → 이용 현황 · SNS 지표 · 수지·자금 탭이 열리고, SNS 지표와 수지·자금에서 `サンプルを読み込む（仮想）` 를 누르면 그래프가 보인다 (발표용 시나리오가 있으면 수지·자금의 `JSONファイルを選ぶ` 로 파일을 골라 미리 넣어 둔다 — 고르면 바로 새 시나리오로 추가되고, 이 브라우저에만 저장돼요)
- [ ] 설정 › 데모 초기화 → 언어 선택부터 다시 시작한다 (**발표 직전에 한 번 눌러 두면** 깨끗한 샘플 상태로 시작해요)
- [ ] (백업) Android 폰에 `sdgs-compass-demo.apk` 를 설치해 두었고 같은 순서로 열린다 — 인터넷이 안 될 때는 이 화면을 미러링해요
- [ ] (백업) 시연 화면을 녹화한 영상을 준비했다
- [ ] 폰 화면을 띄울 방법(케이블·미러링)과 충전기를 챙겼다

## 서비스 흐름 (플로우차트)

### 1. 첫 실행: 언어 → 역할 → 앱

```mermaid
flowchart TD
  open(["앱 · 웹 열기"]) --> load["저장된 설정 읽기<br/>(앱: AsyncStorage · 웹: localStorage)"]
  load --> q1{"언어를 골랐나요?"}
  q1 -- "아니요 (첫 실행)" --> lang["① 언어 선택<br/>日本語 · 한국어<br/>기기 언어는 미리 강조만"]
  q1 -- "예" --> q2
  lang --> q2{"역할을 골랐나요?"}
  q2 -- "아니요" --> role["② 역할 선택<br/>학생·개인 (B2C) / 기업·기관 (B2B)"]
  q2 -- "예" --> route{"역할"}
  role --> route
  route -- "B2C" --> b2c["학생 앱<br/>홈 · 검색 · Impact · 메시지 · 설정"]
  route -- "B2B" --> b2b["기업 앱<br/>대시보드 · 응모자 · 인재 · ESG · 설정"]
  b2c <-- "머리글의 역할 칩" --> b2b
  b2c -. "언제든 日本語 | 한국어" .-> toggle["언어 즉시 전환<br/>(화면 · 날짜 · 금액 · 문구)"]
  b2b -. "언제든 日本語 | 한국어" .-> toggle
  reset["설정 › 데모 초기화"] --> lang
```

### 2. 서비스 한 바퀴 (B2C ↔ B2B)

```mermaid
flowchart TD
  A["① 기업이 챌린지 출제<br/>SDGs 태그 최대 3개 · 마감 7~90일<br/>(실서비스: 관리자 승인 후 공개)"]
  B["② 학생이 발견<br/>규칙 기반 추천(관심 SDGs · 스킬 · 마감 임박도 · 상금) · 검색 · SDGs 필터"]
  C["③ 팀 빌딩 (선택)<br/>팀원 모집 게시판 · 함께하고 싶어요"]
  D["④ 기획서 제출<br/>PDF/PPTX ≤ 50MB · 수령증 번호<br/>마감 전 재제출 = 새 버전 (SHA-256)"]
  E["⑤ 심사위원 심사<br/>창의성 · 실현가능성 · SDGs 기여도 (1~5점)"]
  F["⑥ 수상<br/>대상 400 · 우수상 300 · 특별상 200 (내부 점수)"]
  G["⑦ Impact 갱신<br/>활동 → SDG별 점수 · 레벨(진행률) · 배지<br/>화면에는 포인트 숫자 대신 레벨"]
  H["⑧ 실적 활용<br/>디지털 증명서(QR) · SNS 카드뉴스"]
  I["⑨ 기업이 인재 검색 → 스카우트<br/>하루 3건 · 수락 후 1:1 대화 · 면접"]
  J["⑩ 채용(매칭) 성립"]
  K["⑪ 중개 수수료 ¥30,000<br/>그중 50% 를 기업 이름으로 SDGs 활동에 기부"]
  L["⑫ 기업 ESG 성과 정리<br/>실천 마크 · 리포트"]
  A --> B --> C --> D --> E --> F --> G --> H
  F --> J
  G --> I
  H -. "실적을 보고" .-> I
  I --> J --> K --> L
  L -. "다음 챌린지" .-> A
```

### 3. 기획서 제출 (SCR-03)

```mermaid
flowchart LR
  s1["① 팀<br/>팀 이름 ≤ 30자"] --> s2["② 파일<br/>PDF · PPTX ≤ 50MB"]
  s2 --> s3["③ 내용<br/>제목 ≤ 60자 · 요약 ≤ 300자<br/>동영상 URL (선택, https)"]
  s3 --> s4["④ 최종 확인"]
  s4 --> v{"입력 검사<br/>마감 · 글자 수 · 파일 형식"}
  v -- "오류" --> fix["오류 문구를 보여 주고<br/>해당 단계로 돌아가요"]
  fix --> s1
  v -- "통과" --> r["제출 수령증 SC-YYYYMMDD-NNNN<br/>버전 v1 + 파일 지문 SHA-256"]
  r --> again["마감 전 다시 제출<br/>→ 버전 v2, v3 … (이전 버전은 고칠 수 없음)"]
```

### 4. 챌린지·응모작 상태

```mermaid
stateDiagram-v2
  direction LR
  state "챌린지 (DB: challenge_status)" as C {
    [*] --> draft: 기업이 작성
    draft --> pending_review: 승인 요청
    pending_review --> draft: 수정 요청
    pending_review --> open: 관리자 승인 (F-701)
    open --> judging: 마감 · 심사 시작<br/>(심사위원 지정 필요)
    judging --> closed: 심사 종료
    open --> blinded: 신고 (F-702)
    judging --> blinded
    closed --> blinded
    blinded --> closed: 해제
  }
  state "응모작 (proposal_status)" as P {
    [*] --> submitted: 제출
    submitted --> reviewed: 심사 점수
    reviewed --> awarded: 수상
    awarded --> adopted: 채용(매칭)
    reviewed --> adopted: 채용(매칭)
  }
```

> 앱 데모는 `open → judging → closed` 3단계만 쓰고, `draft`·`pending_review`·`blinded` 는 관리자 기능이 필요해서 DB 설계에만 있어요.

### 5. 중개 수수료와 기부

```mermaid
sequenceDiagram
  autonumber
  participant C as 기업
  participant P as SDGsコンパス
  participant D as 기부처 (SDGs 활동 단체)
  C->>P: 응모작 채용(매칭) 확정
  P-->>C: 중개 수수료 ¥30,000
  P->>D: 수수료의 50% = ¥15,000 을 기업 이름으로 기부
  P-->>C: 기부 내역을 대시보드에 투명하게 표시
  Note over P: 나머지 ¥15,000 은 운영 수익
```

> 데모는 금액 계산과 표시까지만 해요(`packages/core/src/fees.ts`: 기부는 내림, 나머지가 수익이라 합계가 항상 수수료와 같아요). 실제 결제·송금은 없어요.

### 6. ESG 입력 → 실천 마크 · 리포트

```mermaid
flowchart LR
  e1["6개 기준 입력<br/>친환경 포장 · 재생에너지 · 기부 · 여성 관리직 · 봉사 · 정보 공개"] --> e2{"증빙 자료를<br/>올렸나요?"}
  e2 -- "아니요" --> e3["그 기준은 0점<br/>(입력만 하면 '증빙 필요' 안내)"]
  e2 -- "예" --> e4["기준 득점 = 배점 × min(1, 값 ÷ 목표)"]
  e3 --> e5["합계 100점 만점<br/>40점 ★1 · 60점 ★2 · 80점 ★3"]
  e4 --> e5
  e5 --> e6["ESG 리포트 생성<br/>E · S · G 막대 · 요약"]
  e5 --> e7["실천 마크 표시(取組みマーク)<br/>(독자 기준, 국가·자치체·유엔의 인증 아님 — 안내 문구 필수)"]
```

### 7. 화면 구성 (사이트 맵)

```mermaid
flowchart LR
  subgraph gate["첫 실행"]
    g1["언어 선택"] --> g2["역할 선택"]
  end
  subgraph b2c["학생·개인 (B2C) — 하단 탭 6개"]
    direction TB
    home["🏠 홈 · SCR-01"]
    feed1["💬 SNS 피드 · F-503"]
    search["🔎 검색"]
    impact["📊 Impact · SCR-04"]
    msg["✉️ 메시지"]
    set1["⚙️ 설정"]
    ch["챌린지 상세 · SCR-02<br/>(상세 | 팀)"]
    sub["기획서 제출 · SCR-03 → 수령증"]
    cert["디지털 증명서"]
    share["SNS 카드뉴스 · SCR-05"]
    post1["자랑 글 쓰기"]
    home --> ch
    search --> ch
    ch --> sub
    impact --> cert
    impact --> share
    feed1 --> post1
    share -. "피드에도 올리기" .-> post1
  end
  subgraph b2b["기업·기관 (B2B) — 하단 탭 6개"]
    direction TB
    dash["📋 대시보드 · SCR-06"]
    new["새 챌린지"]
    app["👥 응모자 · 심사 · 수상 · 채용"]
    tal["🧭 인재 검색 · 스카우트"]
    esg["🌱 ESG · 실천 마크 · 리포트"]
    set2["⚙️ 설정"]
    feed2["📣 SNS 피드 · F-504"]
    post2["홍보 글 쓰기<br/>(공식 SNS 게시 신청)"]
    dash --> new
    feed2 --> post2
    app -. "홍보하기" .-> post2
  end
  g2 -- "B2C" --> b2c
  g2 -- "B2B" --> b2b
```

### 8. SNS 피드 (F-503 · F-504)

학생의 자랑 글과 기업의 홍보 글이 한 피드에 최신순으로 모여요. 설계 전문은 [docs/sns-feed.md](docs/sns-feed.md).

```mermaid
flowchart TD
  s1["학생: 피드 › 자랑 글 쓰기<br/>(카드뉴스 화면의 '피드에도 올리기'로도 들어와요)"] --> s2["내 실적 1건 선택<br/>수상 · 제출 · 참가 (공유 기록은 제외)"]
  s2 --> s3["본문 1~200자<br/>SDGs 태그는 실적에서 자동 (최대 3개)"]
  c1["기업: 피드 › 홍보 글 쓰기<br/>(응모자 화면의 '홍보하기'로도 들어와요)"] --> c2["제목 1~40자 · 본문 1~400자<br/>SDGs 1~3개 · 우리 회사 챌린지 연결(선택)"]
  c2 --> c3{"공식 SNS 게시를<br/>신청하나요?"}
  c3 -- "예" --> c4["채널 선택: X · Instagram · Facebook<br/>내일부터 가장 빠른 빈 날짜를 배정<br/>채널마다 하루에 한 회사만 · 게시료 ¥3,000(샘플)"]
  c3 -- "아니요" --> v
  s3 --> v{"이메일 주소·전화번호처럼<br/>보이는 글자가 있나요?"}
  c4 --> v
  v -- "있음" --> x["올릴 수 없어요<br/>(오류 문구가 보여요)"]
  v -- "없음" --> p["피드에 최신순으로 표시<br/>기업 글에는 항상 PR 표시"]
  p --> l["좋아요: 내가 쓰지 않은 글에만<br/>삭제: 내 글만 (삭제하면 그 채널의 공식 게시 날짜가 비워져요)"]
```

### 9. 학생 메리트 (활동 증명서 · 대학 제도 연계)

학생은 **무료**로 쓰고, 활동이 **기록과 디지털 증명서(QR)** 로 남아요. 그 증명서를 대학의 활동 장려 제도(예: 専修大学 自己啓発奨学生)에 **신청할 때 쓰는 자료**로 삼는 것이 앱이 그리는 그림이고, 앱이 장학금을 주지는 않아요(기업 상금·운영 환원은 등록 후 「リワード残高」로 — [docs/rewards.md](docs/rewards.md)). 조사 결과·신청 과정·출처는 [docs/student-merit.md](docs/student-merit.md).

| 학생이 얻는 것 | 상태 |
| --- | --- |
| 무료 이용 · Impact(레벨·SDG 레이더·배지) · 디지털 증명서(SHA-256 + QR, 진위 확인 ✓ / 변조 ✗) · 확정한 활동 기록·증명서는 수정 불가 | **지금** (시제품에서 동작) |
| 신청용 요약 「申請用のまとめ」 — 기간(전체 · 최근 1년 · 최근 6개월)을 골라 활동 · SDGs · 증명서 ID·QR · 고지를 A4 한 장으로 (웹은 인쇄·PDF, 앱은 글로 공유) | **지금** (시제품, #22) |
| 기업 상금·운영 환원을 「リワード残高」로 받고 본인 확인 뒤 출금 신청 | **데모** (#25 — 第二種資金移動業 등록 후 제공 예정, 실제 송금 없음) |
| 대학·재단 제도 일람 · 결과 자기 신고 | **구상** (화면 없음) |
| 대학이 앱의 증명서를 증빙으로 인정하는지 | **미확인** (대학에 확인할 일) |

## 화면 목업

<!-- mockups:begin -->
> 웹 데모(`apps/web`)를 실제로 실행해서 찍은 화면이에요(샘플 데이터).
> 학생(B2C) 화면은 휴대폰 폭(390×844, 자랑 글 쓰기만 미리보기가 보이도록 390×1180), 기업(B2B) 화면은 PC 폭(1280)으로 찍었어요. 하단 탭(왼쪽 메뉴)은 학생·기업 모두 6개예요.
> 모바일 앱(`apps/mobile`)은 같은 화면 구성·같은 문구(`packages/core`)를 React Native 로 만든 것이라 모양이 같아요.
> 화면 번호(SCR-01 ~ 06)와 기능 ID(F-xxx)는 기능명세(SPEC-2026-SDGS-01)를 따라요(F-503·F-504 는 명세에 없어서 이어 붙인 번호예요).

### 1. 첫 실행 — 언어 → 역할

앱·웹에 처음 들어오면 **언어(日本語 / 한국어)** 를 먼저 고르고, 이어서 **학생·개인 / 기업·단체** 를 골라요. 고른 값은 기기에 저장돼서 다음부터는 바로 시작하고, 설정(또는 위쪽 버튼)에서 언제든 바꿀 수 있어요.

<table>
<tr>
<td align="center" valign="top"><img src="docs/mockups/web-gate-language.png" width="260" alt="언어 선택 (처음 한 번)"><br><sub>언어 선택 (처음 한 번)</sub></td>
<td align="center" valign="top"><img src="docs/mockups/web-gate-role-ja.png" width="260" alt="역할 선택 — 학생·개인 / 기업·단체"><br><sub>역할 선택 — 학생·개인 / 기업·단체</sub></td>
</tr>
</table>

### 2. 학생·개인 (B2C)

<table>
<tr>
<td align="center" valign="top"><img src="docs/mockups/web-b2c-home-ja.png" width="220" alt="홈 · SCR-01 (일본어, F-202)"><br><sub>홈 · SCR-01 (일본어, F-202)</sub></td>
<td align="center" valign="top"><img src="docs/mockups/web-b2c-home-ko.png" width="220" alt="홈 · SCR-01 (한국어, F-202)"><br><sub>홈 · SCR-01 (한국어, F-202)</sub></td>
<td align="center" valign="top"><img src="docs/mockups/web-b2c-challenge-ja.png" width="220" alt="챌린지 상세 · SCR-02 (F-202 · F-203)"><br><sub>챌린지 상세 · SCR-02 (F-202 · F-203)</sub></td>
</tr>
<tr>
<td align="center" valign="top"><img src="docs/mockups/web-b2c-submit-ja.png" width="220" alt="기획서 제출 · SCR-03 (F-301 · F-302)"><br><sub>기획서 제출 · SCR-03 (F-301 · F-302)</sub></td>
<td align="center" valign="top"><img src="docs/mockups/web-b2c-receipt-ja.png" width="220" alt="제출 수령증 (F-301)"><br><sub>제출 수령증 (F-301)</sub></td>
<td align="center" valign="top"><img src="docs/mockups/web-b2c-messages-ja.png" width="220" alt="메시지 — 기업 스카우트 수신함 (F-602)"><br><sub>메시지 — 기업 스카우트 수신함 (F-602)</sub></td>
</tr>
<tr>
<td align="center" valign="top"><img src="docs/mockups/web-b2c-impact-ja.png" width="220" alt="마이 Impact · SCR-04 (일본어, F-401 · F-402) — 임팩트 레벨·진행률(포인트 숫자 없음)과 선으로 나눈 「스카우트 받기」 설정 줄"><br><sub>마이 Impact · SCR-04 (일본어, F-401 · F-402) — 임팩트 레벨·진행률(포인트 숫자 없음)과 선으로 나눈 「스카우트 받기」 설정 줄</sub></td>
<td align="center" valign="top"><img src="docs/mockups/web-b2c-impact-ko.png" width="220" alt="마이 Impact · SCR-04 (한국어, F-401 · F-402)"><br><sub>마이 Impact · SCR-04 (한국어, F-401 · F-402)</sub></td>
<td align="center" valign="top"><img src="docs/mockups/web-b2c-certificate-ja.png" width="220" alt="디지털 증명서 (F-502)"><br><sub>디지털 증명서 (F-502)</sub></td>
</tr>
<tr>
<td align="center" valign="top"><img src="docs/mockups/web-b2c-share-ja.png" width="220" alt="SNS 카드뉴스 · SCR-05 (F-501)"><br><sub>SNS 카드뉴스 · SCR-05 (F-501)</sub></td>
<td align="center" valign="top"><img src="docs/mockups/web-b2c-feed-ja.png" width="220" alt="SNS 피드 · 학생 (F-503) — 방금 올린 내 글이 맨 위, 필터 칩, 하단 탭 6개"><br><sub>SNS 피드 · 학생 (F-503) — 방금 올린 내 글이 맨 위, 필터 칩, 하단 탭 6개</sub></td>
<td align="center" valign="top"><img src="docs/mockups/web-b2c-feed-ko.png" width="220" alt="SNS 피드 · 학생 (한국어)"><br><sub>SNS 피드 · 학생 (한국어)</sub></td>
</tr>
<tr>
<td align="center" valign="top"><img src="docs/mockups/web-b2c-post-new-ja.png" width="220" alt="자랑 글 쓰기 (F-503) — 실적 선택 + 한마디(200자) + 올린 뒤 모습 미리보기"><br><sub>자랑 글 쓰기 (F-503) — 실적 선택 + 한마디(200자) + 올린 뒤 모습 미리보기</sub></td>
<td align="center" valign="top"><img src="docs/mockups/web-b2c-summary-ja.png" width="220" alt="신청용 요약 (#22) — 기간 고르기 · 인쇄·PDF 버튼 · A4 미리보기"><br><sub>신청용 요약 (#22) — 기간 고르기 · 인쇄·PDF 버튼 · A4 미리보기</sub></td>
<td align="center" valign="top"><img src="docs/mockups/web-b2c-summary-print-ja.png" width="220" alt="신청용 요약을 인쇄한 A4 한 장 — 활동 기록 · 관련 SDGs · 증명서 QR · 고지"><br><sub>신청용 요약을 인쇄한 A4 한 장 — 활동 기록 · 관련 SDGs · 증명서 QR · 고지</sub></td>
</tr>
<tr>
<td align="center" valign="top"><img src="docs/mockups/web-b2c-wallet-ja.png" width="220" alt="リワード残高 (#25, 데모) — 잔액 · 입출금 내역 · 본인 확인 · 출금 신청 · 고지 ①~④"><br><sub>リワード残高 (#25, 데모) — 잔액 · 입출금 내역 · 본인 확인 · 출금 신청 · 고지 ①~④</sub></td>
<td align="center" valign="top"><img src="docs/mockups/web-b2c-wallet-ko.png" width="220" alt="보상 잔액 (#25, 한국어)"><br><sub>보상 잔액 (#25, 한국어)</sub></td>
<td></td>
</tr>
</table>

### 3. 기업·기관 (B2B)

PC 폭에서는 왼쪽 메뉴, 좁은 화면에서는 하단 탭으로 바뀌어요.

<table>
<tr>
<td align="center" valign="top"><img src="docs/mockups/web-b2b-dashboard-ja.png" width="460" alt="대시보드 · SCR-06 (일본어) — 챌린지 관리, 중개 수수료와 기부 내역 (F-703)"><br><sub>대시보드 · SCR-06 (일본어) — 챌린지 관리, 중개 수수료와 기부 내역 (F-703)</sub></td>
<td align="center" valign="top"><img src="docs/mockups/web-b2b-dashboard-ko.png" width="460" alt="대시보드 · SCR-06 (한국어)"><br><sub>대시보드 · SCR-06 (한국어)</sub></td>
</tr>
<tr>
<td align="center" valign="top"><img src="docs/mockups/web-b2b-new-ja.png" width="460" alt="새 챌린지 출제 (F-201, 모집 기간 7~90일)"><br><sub>새 챌린지 출제 (F-201, 모집 기간 7~90일)</sub></td>
<td align="center" valign="top"><img src="docs/mockups/web-b2b-applicants-ja.png" width="460" alt="응모자 · 심사 · 수상 · 채용 (F-303)"><br><sub>응모자 · 심사 · 수상 · 채용 (F-303)</sub></td>
</tr>
<tr>
<td align="center" valign="top"><img src="docs/mockups/web-b2b-talent-ja.png" width="460" alt="인재 검색 · 스카우트 (F-601 · F-602, 하루 3건)"><br><sub>인재 검색 · 스카우트 (F-601 · F-602, 하루 3건)</sub></td>
<td align="center" valign="top"><img src="docs/mockups/web-b2b-esg-ja.png" width="460" alt="ESG 입력 · 리포트 · 실천 마크 (F-403)"><br><sub>ESG 입력 · 리포트 · 실천 마크 (F-403)</sub></td>
</tr>
<tr>
<td align="center" valign="top"><img src="docs/mockups/web-b2b-feed-ja.png" width="460" alt="SNS 피드 · 기업 (F-504) — PC 2열, PR 표시, 공식 SNS 게시 예정(채널 이름 포함), 왼쪽 메뉴 フィード"><br><sub>SNS 피드 · 기업 (F-504) — PC 2열, PR 표시, 공식 SNS 게시 예정(채널 이름 포함), 왼쪽 메뉴 <code>フィード</code></sub></td>
<td align="center" valign="top"><img src="docs/mockups/web-b2b-post-new-ja.png" width="460" alt="홍보 글 쓰기 (F-504) — 공식 SNS 게시 신청을 켜고 채널(X·Instagram·Facebook)을 고르는 상태: 채널마다 올라가는 모양과 게시 예정일, 미리보기"><br><sub>홍보 글 쓰기 (F-504) — 공식 SNS 게시 신청을 켜고 채널(X·Instagram·Facebook)을 고르는 상태: 채널마다 올라가는 모양과 게시 예정일, 미리보기</sub></td>
</tr>
<tr>
<td align="center" valign="top"><img src="docs/mockups/web-b2b-post-new-ko.png" width="460" alt="홍보 글 쓰기 (F-504) — 같은 화면의 한국어(채널 선택: X 포스트 · 인스타그램 스토리 · 페이스북 페이지 게시)"><br><sub>홍보 글 쓰기 (F-504) — 같은 화면의 한국어(채널 선택: X 포스트 · 인스타그램 스토리 · 페이스북 페이지 게시)</sub></td>
<td></td>
</tr>
</table>
### 4. 운영자 (웹 전용 · 데모)

운영자 화면은 웹에만 있어요(PC 폭 1280, 값은 모두 가상의 샘플). 역할 선택 화면 아래의 `運営者画面（デモ）` 링크로 들어가요 → [docs/admin.md](docs/admin.md).

<table>
<tr>
<td align="center" valign="top"><img src="docs/mockups/web-admin-usage-ja.png" width="460" alt="운영자 · 이용 현황 (#16) — 지금의 숫자 12개와 한 줄 읽기, 응모자가 많은 SDGs"><br><sub>운영자 · 이용 현황 (#16) — 지금의 숫자 12개와 한 줄 읽기, 응모자가 많은 SDGs</sub></td>
<td align="center" valign="top"><img src="docs/mockups/web-admin-sns-ja.png" width="460" alt="운영자 · SNS 지표 (#16) — 샘플을 불러온 상태: 4개 SNS 의 주별 추이(팔로워·리치·참여율·링크 클릭)"><br><sub>운영자 · SNS 지표 (#16) — 샘플을 불러온 상태: 4개 SNS 의 주별 추이(팔로워·리치·참여율·링크 클릭)</sub></td>
</tr>
<tr>
<td align="center" valign="top"><img src="docs/mockups/web-admin-finance-ja.png" width="460" alt="운영자 · 수지·자금 (#17) — 결과 요약 6개와 문장 5줄, 월별 누적 손익·자금 잔액, 월별 경상이익(흑자 전환 표시선)"><br><sub>운영자 · 수지·자금 (#17) — 결과 요약 6개와 문장 5줄, 월별 누적 손익·자금 잔액, 월별 경상이익(흑자 전환 표시선)</sub></td>
<td align="center" valign="top"><img src="docs/mockups/web-admin-finance-compare-ja.png" width="460" alt="운영자 · 수지·자금 (#17) — 저장한 두 시나리오를 한 그래프에 겹쳐 비교(실선 = 표시 중, 점선 = 비교할 시나리오)"><br><sub>운영자 · 수지·자금 (#17) — 저장한 두 시나리오를 한 그래프에 겹쳐 비교(실선 = 표시 중, 점선 = 비교할 시나리오)</sub></td>
</tr>
<tr>
<td align="center" valign="top"><img src="docs/mockups/web-admin-finance-ko.png" width="460" alt="운영자 · 수지·자금 (#17) — 같은 화면의 한국어"><br><sub>운영자 · 수지·자금 (#17) — 같은 화면의 한국어</sub></td>
<td></td>
</tr>
</table>
<!-- mockups:end -->

### 5. 화면 ↔ 주소 ↔ 코드

웹과 앱은 같은 화면 구성을 가져요. 규칙·문구·계산은 `packages/core`(화면용 값은 `selectors.ts`)에 있고, 아래 화면 파일은 그것을 그리기만 해요.
화면 파일은 웹이 `apps/web/src/screens/`, 앱이 `apps/mobile/src/screens/` 에 같은 이름으로 있어요.

| 화면 | 웹 주소 | 앱 경로(expo-router) | 화면 파일 |
| --- | --- | --- | --- |
| 언어 선택 | (게이트) | `language` | 웹 `components/Gate.tsx`(LanguageGate) · 앱 `LanguageScreen.tsx` |
| 역할 선택 | (게이트) | `role` | 웹 `components/Gate.tsx`(RoleGate) · 앱 `RoleScreen.tsx` |
| 홈 · SCR-01 | `/home/` | `(tabs)/index` | `HomeScreen.tsx` |
| SNS 피드 · 학생 (F-503) | `/feed/` | `(tabs)/feed` | `FeedScreen.tsx` (카드는 `components/PostCard.tsx`) |
| 자랑 글 쓰기 (F-503) | `/feed/new/?activity=…` | `feed/new` | `PostComposerScreen.tsx` |
| 챌린지 찾기 | `/search/` | `(tabs)/search` | `SearchScreen.tsx` |
| 챌린지 상세 · SCR-02 | `/challenge/?id=…` | `challenge/[id]` | `ChallengeScreen.tsx` |
| 기획서 제출 · SCR-03 · 수령증 | `/challenge/submit/?id=…` | `challenge/submit/[id]` | `SubmitScreen.tsx` |
| 마이 Impact · SCR-04 | `/impact/` | `(tabs)/impact` | `ImpactScreen.tsx` |
| 디지털 증명서 | `/certificate/?id=…` | `certificate/[id]` | `CertificateScreen.tsx` |
| 신청용 요약 (#22) | `/impact/summary/` (`?period=year` · `?period=half`) | `impact-summary` | `ApplicationSummaryScreen.tsx` (인쇄 스타일 `app/(student)/impact/summary/summary.css`) |
| リワード残高 (#25, 데모) | `/wallet/` | `wallet` | `WalletScreen.tsx` (화면 모델 `packages/core/src/walletView.ts`, 규칙 `wallet.ts`) |
| SNS 카드뉴스 · SCR-05 | `/share/` | `share` | `ShareScreen.tsx` |
| 메시지(스카우트 수신함) | `/messages/` | `(tabs)/messages` | `MessagesScreen.tsx` |
| 설정 · 데모 초기화 (학생) | `/settings/` | `(tabs)/settings` | `SettingsScreen.tsx` |
| 대시보드 · SCR-06 | `/b2b/` | `b2b/(tabs)/index` | `DashboardScreen.tsx` |
| SNS 피드 · 기업 (F-504) | `/b2b/feed/` | `b2b/(tabs)/feed` | `FeedScreen.tsx` |
| 홍보 글 쓰기 (F-504) | `/b2b/feed/new/?challenge=…` | `b2b/feed/new` | `PostComposerScreen.tsx` |
| 새 챌린지 출제 | `/b2b/new/` | `b2b/new` | `NewChallengeScreen.tsx` |
| 응모자 · 심사 · 수상 · 채용 | `/b2b/applicants/` | `b2b/(tabs)/applicants` | `ApplicantsScreen.tsx` |
| 인재 검색 · 스카우트 | `/b2b/talent/` | `b2b/(tabs)/talent` | `TalentScreen.tsx` |
| ESG · 실천 마크 · 리포트 | `/b2b/esg/` | `b2b/(tabs)/esg` | `EsgScreen.tsx` |
| 설정 (기업) | `/b2b/settings/` | `b2b/(tabs)/settings` | `SettingsScreen.tsx` |
| 운영자 · 이용 현황 (#16) | `/admin/` | (없음 — 웹 전용) | `AdminUsageScreen.tsx` (틀 `AdminShell.tsx`) |
| 운영자 · SNS 지표 (#16) | `/admin/sns/` | (없음 — 웹 전용) | `AdminSnsScreen.tsx` |
| 운영자 · 수지·자금 (#17) | `/admin/finance/` | (없음 — 웹 전용) | `AdminFinanceScreen.tsx` (입력 `AdminFinanceEditor.tsx` · 결과 `AdminFinanceResults.tsx` · 민감도 `AdminFinanceSensitivity.tsx` · 비교 `AdminFinanceCompare.tsx`) |

- GitHub Pages 에서는 저장소 이름이 앞에 붙어요(예: `https://atome9797.github.io/sdgs-compass/home/`). 상세 화면은 정적 내보내기를 위해 `[id]` 대신 쿼리(`?id=`)로 구분해요. 글쓰기 화면이 미리 채우는 값(`?activity=` 실적, `?challenge=` 챌린지)도 쿼리예요.
- 하단 탭(웹은 PC 폭에서 왼쪽 메뉴)은 학생·기업 모두 **6개**이고 `피드`는 홈(대시보드) 바로 다음이에요. 글쓰기 화면이 미리 채우는 값은 쿼리가 없으면 학생은 첫 실적, 기업은 "연결 안 함"이에요. 웹은 글을 올리면 `/feed/?posted=<글 id>` 로 돌아와서 안내 문구와 새 글 강조를 보여 줘요.
- 앱은 `Stack.Protected`(언어 → 역할 → B2C 또는 B2B 순서)가 게이트를 맡고, 다른 역할의 화면으로 들어가면 `RoleGuard` 가 그 역할의 홈으로 돌려보내요.
- 운영자 화면(`/admin/*`)은 웹 전용이고, 입구는 역할 선택 화면 아래의 링크 한 곳뿐이에요(학생·기업 화면의 탭·메뉴에는 없어요). 위쪽 탭 3개(이용 현황 · SNS 지표 · 수지·자금)로 오가고, 역할 선택은 건너뛰어요. 계산·문구는 `packages/core/src/admin*.ts`·`messages/admin*.ts` 에 있어요.

## ERD (DB 설계)

`db/schema.sql` 은 PostgreSQL 16 용 스키마예요. 기능명세(SPEC-2026-SDGS-01)의 기능 ID(F-101 ~ F-703)와 1:1 로 대응하도록 설계했어요.
앱 데모는 이 DB 에 직접 연결하지 않지만(샘플 데이터 + 기기 저장), **앱의 도메인 타입(`packages/core/src/domain.ts`)과 같은 모양**이라 실서비스에서는 같은 규칙을 서버가 돌려줘요.

설계 원칙:

- **규칙은 DB 도 한 번 더 지켜요**: 앱이 막아도 서버·관리자 도구·직접 SQL 로 우회되지 않게 `CHECK`·복합 외래 키·트리거로 같은 규칙을 넣었어요 (아래 [표](#db-가-지키는-규칙)).
- **앱 ↔ DB 대조 시험**: 수수료·레벨·인증 점수·증명서 해시 같은 계산과 SNS 글의 글자 수·연락처 검출·공식 게시 날짜·입력 검사는 `packages/core` 의 값이 기준이고, `scripts/gen-db-reference.ts` 가 만든 정답표(`db/tests/golden.sql`)로 DB 계산이 같은지 CI 가 확인해요.
- **한 번 기록하면 못 고치는 것**: 제출 버전, 활동 기록, 디지털 증명서, 감사 로그는 `UPDATE`/`DELETE` 를 트리거로 막아요(증명서의 폐기 표시만 예외).
- **일본어/한국어**: 이름·문구 열은 `name_ja`/`name_ko` 로 두고, 사용자가 쓴 글의 번역은 `content_translations` 에 캐시해요.
- **날짜는 일본 시간(JST) 기준**: 수령증 번호·스카우트 하루 한도는 `jst_date()` 로 계산해요.
- 아래 그림과 표 설명은 **실제 DB 에서 읽어 자동으로 만든 것**이에요(`npm run erd`). 스키마를 바꾸고 README 를 안 고치면 CI 가 실패해요.

<!-- erd:begin — 자동 생성: node scripts/erd.mjs --write (db/schema.sql 에서 읽어요. 직접 고치지 마세요) -->
표 68개 · 뷰 8개 · 외래 키 124개. 아래 그림과 표 설명은 `db/schema.sql` 을 실제 PostgreSQL 에 올려서 읽어 만든 거라, 스키마가 바뀌면 CI 가 README 를 다시 만들라고 알려 줘요.

#### 한눈에 보기 (핵심 표만, 열 생략)

```mermaid
erDiagram
  users ||--o| student_profiles : "user"
  users ||..o{ companies : "owner"
  companies ||--o{ company_members : "company"
  users ||--o{ company_members : "user"
  companies ||..o{ challenges : "company"
  challenges ||..o{ challenge_judges : "challenge"
  company_members ||..o{ challenge_judges : "company"
  challenges ||..o{ teams : "challenge"
  student_profiles ||..o{ teams : "leader"
  teams ||..o{ team_members : "team"
  student_profiles ||--o{ team_members : "user"
  challenges ||..o{ proposals : "challenge"
  student_profiles ||..o{ proposals : "submitter"
  teams |o..o{ proposals : "team"
  proposals ||--o{ proposal_versions : "proposal"
  challenge_judges ||..o{ reviews : "challenge"
  proposals ||..o{ reviews : "proposal"
  proposals ||..o{ awards : "proposal"
  challenges ||..o{ matches : "challenge"
  proposals ||..o{ matches : "proposal"
  matches ||..o{ donations : "match"
  awards |o..o{ activities : "award"
  challenges |o..o{ activities : "challenge"
  proposals |o..o{ activities : "proposal"
  student_profiles ||..o{ activities : "user"
  sdgs ||--o{ impact_scores : "sdg"
  student_profiles ||--o{ impact_scores : "user"
  activities |o..o| certificates : "activity"
  student_profiles ||..o{ certificates : "user"
  companies ||..o{ scouts : "company"
  proposals |o..o{ scouts : "proposal"
  student_profiles ||..o{ scouts : "student"
  companies ||..o{ conversations : "company"
  scouts |o..o| conversations : "scout"
  student_profiles ||..o{ conversations : "student"
  conversations ||..o{ messages : "conversation"
  companies ||..o{ cert_applications : "company"
  companies ||..o{ esg_reports : "company"
  activities |o..o{ social_posts : "activity"
  users ||..o{ social_posts : "author"
  challenges |o..o{ social_posts : "challenge"
  companies |o..o{ social_posts : "company"
```

> 범례: `||` 정확히 하나 · `o|` 없거나 하나 · `o{` 없거나 여러 개 · 실선(`--`)은 부모 없이 존재할 수 없는 종속 관계(기본 키에 포함된 FK), 점선(`..`)은 일반 참조예요.

#### ① 계정 · 프로필 · 기업 — F-101 ~ F-104, F-701

소셜/이메일 로그인, B2C 프로필(관심 SDGs 최대 5개·스킬), 기업 ESG 프로필(관리자 승인·사업자 서류)이에요.

```mermaid
erDiagram
  sdgs {
    smallint id PK
    char color
    text name_ja
    text name_ko
    text short_ja
    text short_ko
  }
  skills {
    text code PK
    text name_ja
    text name_ko
  }
  users {
    uuid id PK
    text email
    text password_hash
    user_role role
    account_status status
    locale_code locale
    timestamptz email_verified_at
    timestamptz last_login_at
    timestamptz created_at
    timestamptz updated_at
    timestamptz deleted_at
  }
  oauth_accounts {
    uuid id PK
    uuid user_id FK
    oauth_provider provider
    text provider_user_id
    timestamptz created_at
  }
  student_profiles {
    uuid user_id PK, FK
    text nickname
    text university_name
    text faculty
    smallint grad_year
    text desired_job
    text bio
    text avatar_key
    text identity_method
    timestamptz identity_verified_at
    boolean scoutable
    visibility portfolio_visibility
    timestamptz created_at
    timestamptz updated_at
  }
  profile_sdg_interests {
    uuid user_id PK, FK
    smallint sdg_id PK, FK
    smallint priority
  }
  profile_skills {
    uuid user_id PK, FK
    text skill_code PK, FK
  }
  companies {
    uuid id PK
    uuid owner_id FK
    text name
    text business_number
    company_status status
    timestamptz approved_at
    uuid approved_by FK
    text industry
    text region
    text logo_key
    text homepage_url
    text about
    locale_code source_lang
    text esg_goal
    text desired_talent
    text hiring_perks
    text contact_name
    text contact_email
    timestamptz created_at
    timestamptz updated_at
  }
  company_sdgs {
    uuid company_id PK, FK
    smallint sdg_id PK, FK
  }
  company_members {
    uuid company_id PK, FK
    uuid user_id PK, FK
    member_role member_role
    timestamptz created_at
  }
  company_documents {
    uuid id PK
    uuid company_id FK
    text doc_type
    text file_key
    review_status review_status
    uuid reviewed_by FK
    timestamptz reviewed_at
    text review_note
    timestamptz uploaded_at
  }
  users ||..o{ oauth_accounts : "user_id"
  users ||--o| student_profiles : "user_id"
  sdgs ||--o{ profile_sdg_interests : "sdg_id"
  student_profiles ||--o{ profile_sdg_interests : "user_id"
  skills ||--o{ profile_skills : "skill_code"
  student_profiles ||--o{ profile_skills : "user_id"
  users |o..o{ companies : "approved_by"
  users ||..o{ companies : "owner_id"
  companies ||--o{ company_sdgs : "company_id"
  sdgs ||--o{ company_sdgs : "sdg_id"
  companies ||--o{ company_members : "company_id"
  users ||--o{ company_members : "user_id"
  companies ||..o{ company_documents : "company_id"
  users |o..o{ company_documents : "reviewed_by"
```

| 표 | 설명 | 기능 |
| --- | --- | --- |
| `sdgs` | UN SDGs 17개 목표 (번호·색·일본어/한국어 이름) | 참조 데이터 |
| `skills` | 스킬 태그 (디자인·마케팅 등) | F-102 |
| `users` | 계정 (이메일·역할 B2C/B2B/Admin·앱 언어) | F-101 |
| `oauth_accounts` | 소셜 로그인 연결 (Google·Kakao·Apple) | F-101 |
| `student_profiles` | B2C 프로필 (학교·희망 직무·공개 범위) | F-102 |
| `profile_sdg_interests` | 관심 SDGs 최대 5개와 우선순위 | F-102 |
| `profile_skills` | 보유 스킬 태그 | F-102 |
| `companies` | 기업·기관 ESG 프로필과 브랜드관 (관리자 승인 필요) | F-103, F-701 |
| `company_sdgs` | 기업이 힘쓰는 SDGs | F-103 |
| `company_members` | 기업 소속 담당자·심사위원 | F-103, F-303 |
| `company_documents` | 기업 인증 서류 (사업자 검증) | F-101, F-701 |

#### ② 챌린지 · 팀 빌딩 — F-201 ~ F-204

기업이 출제하는 챌린지(마감 7~90일·관리자 승인 후 공개), 목표 SDGs 최대 3개, 심사위원, Q&A, 팀 모집·팀 구성, 북마크예요.

```mermaid
erDiagram
  challenges {
    uuid id PK
    uuid company_id FK
    uuid created_by FK
    text title
    text summary
    text background
    text mission
    locale_code source_lang
    challenge_status status
    participation_kind participation
    smallint max_team_size
    smallint impact_points
    smallint cover_hue
    timestamptz opens_at
    timestamptz closes_at
    uuid approved_by FK
    timestamptz approved_at
    timestamptz created_at
    timestamptz updated_at
  }
  challenge_sdgs {
    uuid challenge_id PK, FK
    smallint position PK
    smallint sdg_id FK
  }
  challenge_skills {
    uuid challenge_id PK, FK
    text skill_code PK, FK
  }
  challenge_deliverables {
    uuid challenge_id PK, FK
    smallint position PK
    text body
  }
  challenge_rewards {
    uuid challenge_id PK, FK
    reward_kind kind PK
    int amount_yen
    text note
  }
  challenge_attachments {
    uuid id PK
    uuid challenge_id FK
    text file_key
    text file_name
    bigint size_bytes
    timestamptz created_at
  }
  challenge_judges {
    uuid challenge_id PK, FK
    uuid company_id FK
    uuid user_id PK, FK
    timestamptz assigned_at
  }
  challenge_comments {
    uuid id PK
    uuid challenge_id FK
    uuid parent_id FK
    uuid author_id FK
    comment_kind kind
    text body
    locale_code source_lang
    timestamptz blinded_at
    timestamptz created_at
  }
  team_posts {
    uuid id PK
    uuid challenge_id FK
    uuid author_id FK
    text title
    text body
    locale_code source_lang
    timestamptz closed_at
    timestamptz blinded_at
    timestamptz created_at
  }
  team_post_roles {
    uuid post_id PK, FK
    text skill_code PK, FK
  }
  team_requests {
    uuid id PK
    uuid post_id FK
    uuid requester_id FK
    text message
    request_status status
    timestamptz created_at
    timestamptz decided_at
  }
  teams {
    uuid id PK
    uuid challenge_id FK
    text name
    uuid leader_id FK
    uuid source_post_id FK
    timestamptz created_at
  }
  team_members {
    uuid team_id PK, FK
    uuid challenge_id FK
    uuid user_id PK, FK
    timestamptz joined_at
  }
  bookmarks {
    uuid user_id PK, FK
    uuid challenge_id PK, FK
    timestamptz created_at
  }
  companies {
    uuid id PK
  }
  company_members {
    uuid company_id PK, FK
    uuid user_id PK, FK
  }
  sdgs {
    smallint id PK
  }
  skills {
    text code PK
  }
  student_profiles {
    uuid user_id PK, FK
  }
  users {
    uuid id PK
  }
  users |o..o{ challenges : "approved_by"
  companies ||..o{ challenges : "company_id"
  users ||..o{ challenges : "created_by"
  challenges ||--o{ challenge_sdgs : "challenge_id"
  sdgs ||..o{ challenge_sdgs : "sdg_id"
  challenges ||--o{ challenge_skills : "challenge_id"
  skills ||--o{ challenge_skills : "skill_code"
  challenges ||--o{ challenge_deliverables : "challenge_id"
  challenges ||--o{ challenge_rewards : "challenge_id"
  challenges ||..o{ challenge_attachments : "challenge_id"
  challenges ||..o{ challenge_judges : "challenge_id, company_id"
  company_members ||..o{ challenge_judges : "company_id, user_id"
  users ||..o{ challenge_comments : "author_id"
  challenges ||..o{ challenge_comments : "challenge_id"
  challenge_comments |o..o{ challenge_comments : "parent_id, challenge_id"
  student_profiles ||..o{ team_posts : "author_id"
  challenges ||..o{ team_posts : "challenge_id"
  team_posts ||--o{ team_post_roles : "post_id"
  skills ||--o{ team_post_roles : "skill_code"
  team_posts ||..o{ team_requests : "post_id"
  student_profiles ||..o{ team_requests : "requester_id"
  challenges ||..o{ teams : "challenge_id"
  student_profiles ||..o{ teams : "leader_id"
  team_posts |o..o{ teams : "source_post_id"
  teams ||..o{ team_members : "team_id, challenge_id"
  student_profiles ||--o{ team_members : "user_id"
  challenges ||--o{ bookmarks : "challenge_id"
  users ||--o{ bookmarks : "user_id"
```

| 표 | 설명 | 기능 |
| --- | --- | --- |
| `challenges` | SDGs 챌린지 (기업이 출제, 마감 7~90일, 관리자 승인 후 공개) | F-201 |
| `challenge_sdgs` | 챌린지의 목표 SDGs (최대 3개) | F-202 |
| `challenge_skills` | 챌린지가 구하는 스킬 (추천 피드용) | F-202 |
| `challenge_deliverables` | 챌린지의 제출물 안내 | F-201 |
| `challenge_rewards` | 보상 (상금·인턴십·채용 제안) | F-201 |
| `challenge_attachments` | 챌린지 첨부 자료 (브리핑 PDF 등) | F-201 |
| `challenge_judges` | 챌린지별 심사위원 (그 기업 구성원만) | F-303 |
| `challenge_comments` | 챌린지 Q&A (질문·답변·댓글) | F-203 |
| `team_posts` | 팀 빌딩 게시판 글 ("이런 팀원을 찾아요") | F-203 |
| `team_post_roles` | 팀 빌딩 글이 찾는 역할(스킬) | F-203 |
| `team_requests` | 팀 참여 요청 (대기·수락·거절) | F-203 |
| `teams` | 확정된 팀 (한 챌린지에 한 팀) | F-203 |
| `team_members` | 팀 구성원 (최대 인원 제한) | F-203 |
| `bookmarks` | 관심 챌린지(북마크) | F-204 |

#### ③ 제출 · 심사 · 수상 · 매칭 — F-301 ~ F-303, 수익 모델

기획서 제출(수령증 번호)과 버전, 심사 점수, 수상, 기업의 채용(매칭) → 중개 수수료 ¥30,000 중 50% 기부예요.

```mermaid
erDiagram
  receipt_counters {
    date day PK
    int last_no
  }
  proposals {
    uuid id PK
    uuid challenge_id FK
    uuid submitter_id FK
    uuid team_id FK
    text team_name
    text title
    text summary
    text video_url
    text receipt_no UK
    proposal_status status
    timestamptz submitted_at
    timestamptz updated_at
  }
  proposal_versions {
    uuid proposal_id PK, FK
    smallint version_no PK
    text file_key
    text file_name
    text mime_type
    bigint size_bytes
    char sha256
    text change_reason
    timestamptz submitted_at
  }
  reviews {
    uuid proposal_id PK, FK
    uuid challenge_id FK
    uuid judge_id PK, FK
    smallint creativity
    smallint feasibility
    smallint sdg_contribution
    numeric average "자동 계산"
    text comment
    timestamptz reviewed_at
  }
  awards {
    uuid id PK
    uuid proposal_id FK, UK
    uuid challenge_id FK
    award_kind kind
    smallint points "자동 계산"
    uuid awarded_by FK
    timestamptz awarded_at
  }
  matches {
    uuid id PK
    uuid challenge_id FK
    uuid company_id FK
    uuid proposal_id FK, UK
    uuid adopted_by FK
    int fee_yen
    int donation_yen "자동 계산"
    int revenue_yen "자동 계산"
    timestamptz matched_at
  }
  donation_recipients {
    uuid id PK
    text name_ja
    text name_ko
    smallint sdg_id FK
    text url
    boolean active
  }
  donations {
    uuid id PK
    uuid match_id FK, UK
    int amount_yen FK
    uuid recipient_id FK
    text receipt_key
    timestamptz donated_at
  }
  challenge_judges {
    uuid challenge_id PK, FK
    uuid user_id PK, FK
  }
  challenges {
    uuid id PK
  }
  sdgs {
    smallint id PK
  }
  student_profiles {
    uuid user_id PK, FK
  }
  teams {
    uuid id PK
  }
  users {
    uuid id PK
  }
  challenges ||..o{ proposals : "challenge_id"
  student_profiles ||..o{ proposals : "submitter_id"
  teams |o..o{ proposals : "team_id, challenge_id"
  proposals ||--o{ proposal_versions : "proposal_id"
  challenge_judges ||..o{ reviews : "challenge_id, judge_id"
  proposals ||..o{ reviews : "proposal_id, challenge_id"
  users ||..o{ awards : "awarded_by"
  proposals ||..o{ awards : "proposal_id, challenge_id"
  users ||..o{ matches : "adopted_by"
  challenges ||..o{ matches : "challenge_id, company_id"
  proposals ||..o{ matches : "proposal_id, challenge_id"
  sdgs |o..o{ donation_recipients : "sdg_id"
  matches ||..o{ donations : "match_id, amount_yen"
  donation_recipients ||..o{ donations : "recipient_id"
```

| 표 | 설명 | 기능 |
| --- | --- | --- |
| `receipt_counters` | 제출 수령증 번호의 날짜별 일련번호 | F-301 |
| `proposals` | 기획서 제출 (한 사람/팀 한 건, 수령증 번호) | F-301 |
| `proposal_versions` | 제출 버전 (마감 전 재제출, 파일 SHA-256, 수정 불가) | F-302 |
| `reviews` | 심사 점수 (창의성·실현가능성·SDGs 기여도, 1~5점) | F-303 |
| `awards` | 수상 (대상 400·우수상 300·특별상 200 pt, 심사위원 전원 완료 후 확정) | F-303 |
| `matches` | 채용·사업화 매칭 (중개 수수료 ¥30,000, 기부 50%) | 수익 모델 |
| `donation_recipients` | 기부처 (일본어/한국어 이름) | 수익 모델 |
| `donations` | 기업 이름으로 한 SDGs 기부 (금액은 매칭의 기부액과 같아야 함) | 수익 모델 |

#### ④ Impact Index · 증명서 · SNS — F-104, F-401, F-402, F-501, F-502

활동 기록 → SDG별 점수(레이더 차트)·레벨·배지, 카드뉴스, SHA-256 해시·QR 디지털 증명서와 진위 확인 기록이에요.

```mermaid
erDiagram
  badges {
    text code PK
    text emoji
    text name_ja
    text name_ko
    text desc_ja
    text desc_ko
  }
  share_cards {
    uuid id PK
    uuid user_id FK
    uuid challenge_id FK
    uuid award_id FK
    share_template template
    text headline
    text image_key
    timestamptz created_at
    timestamptz shared_at
  }
  activities {
    uuid id PK
    uuid user_id FK
    activity_kind kind
    uuid challenge_id FK
    uuid proposal_id FK
    uuid award_id FK
    uuid share_card_id FK
    text title
    text company_name
    int points FK
    date occurred_on
    timestamptz created_at
  }
  activity_sdgs {
    uuid activity_id PK, FK
    smallint sdg_id PK, FK
  }
  impact_scores {
    uuid user_id PK, FK
    smallint sdg_id PK, FK
    int raw_points
    smallint score "자동 계산"
    timestamptz updated_at
  }
  user_badges {
    uuid user_id PK, FK
    text badge_code PK, FK
    timestamptz earned_at
  }
  portfolio_files {
    uuid id PK
    uuid user_id FK
    text kind
    text title
    text file_key
    text url
    timestamptz created_at
  }
  certificates {
    uuid id PK
    text serial_no UK
    uuid user_id FK
    uuid activity_id FK, UK
    cert_kind kind
    text holder_name
    text challenge_title
    text company_name
    award_kind award_kind
    smallint_array sdg_ids
    int points
    date issued_on
    char content_hash
    text verify_code "자동 계산"
    text qr_payload "자동 계산"
    text chain_tx
    timestamptz revoked_at
    text revoked_reason
    timestamptz created_at
  }
  certificate_verifications {
    bigint id PK
    text serial_no
    uuid certificate_id FK
    verify_result result
    uuid verifier_company_id FK
    timestamptz verified_at
  }
  awards {
    uuid id PK
  }
  challenges {
    uuid id PK
  }
  companies {
    uuid id PK
  }
  proposals {
    uuid id PK
  }
  sdgs {
    smallint id PK
  }
  student_profiles {
    uuid user_id PK, FK
  }
  awards |o..o{ share_cards : "award_id"
  challenges |o..o{ share_cards : "challenge_id"
  student_profiles ||..o{ share_cards : "user_id"
  awards |o..o{ activities : "award_id, points"
  challenges |o..o{ activities : "challenge_id"
  proposals |o..o{ activities : "proposal_id"
  share_cards |o..o{ activities : "share_card_id"
  student_profiles ||..o{ activities : "user_id"
  activities ||--o{ activity_sdgs : "activity_id"
  sdgs ||--o{ activity_sdgs : "sdg_id"
  sdgs ||--o{ impact_scores : "sdg_id"
  student_profiles ||--o{ impact_scores : "user_id"
  badges ||--o{ user_badges : "badge_code"
  student_profiles ||--o{ user_badges : "user_id"
  student_profiles ||..o{ portfolio_files : "user_id"
  activities |o..o| certificates : "activity_id"
  student_profiles ||..o{ certificates : "user_id"
  certificates |o..o{ certificate_verifications : "certificate_id"
  companies |o..o{ certificate_verifications : "verifier_company_id"
```

| 표 | 설명 | 기능 |
| --- | --- | --- |
| `badges` | 배지 정의 (첫걸음·챌린지 킹 등) | F-402 |
| `share_cards` | SNS 카드뉴스 (Instagram 1:1·LinkedIn 1.91:1) | F-501 |
| `activities` | 활동 기록 (참가·제출·수상·공유, 수정 불가) | F-401 |
| `activity_sdgs` | 활동이 닿은 SDGs | F-401 |
| `impact_scores` | SDG 별 누적 포인트와 점수 (레이더 차트) | F-401 |
| `user_badges` | 획득한 배지 | F-402 |
| `portfolio_files` | 직접 올린 포트폴리오 (PDF·URL) | F-104 |
| `certificates` | 디지털 증명서 (SHA-256 해시·QR, 발급 후 수정 불가) | F-502 |
| `certificate_verifications` | 증명서 진위 확인 기록 | F-502 |

#### ⑤ 인재 검색 · 스카우트 · 메시지 — F-601 ~ F-603

기업 → 학생 스카우트(하루 3건), 1:1 대화방(연락처 마스킹), 겹치지 않는 면접 일정이에요.

```mermaid
erDiagram
  scouts {
    uuid id PK
    uuid company_id FK
    uuid sender_id FK
    uuid student_id FK
    uuid proposal_id FK
    scout_kind kind
    text message
    locale_code source_lang
    scout_status status
    timestamptz sent_at
    date sent_on "자동 계산"
    timestamptz read_at
    timestamptz responded_at
  }
  conversations {
    uuid id PK
    uuid company_id FK
    uuid student_id FK
    uuid scout_id FK, UK
    timestamptz contact_released_at
    timestamptz created_at
  }
  messages {
    uuid id PK
    uuid conversation_id FK
    uuid sender_id FK
    text body
    text body_masked "자동 계산"
    locale_code source_lang
    timestamptz sent_at
    timestamptz read_at
    timestamptz blinded_at
  }
  interview_slots {
    uuid id PK
    uuid conversation_id FK
    uuid proposed_by FK
    timestamptz starts_at
    timestamptz ends_at
    slot_status status
    text meeting_url
    timestamptz created_at
  }
  companies {
    uuid id PK
  }
  company_members {
    uuid company_id PK, FK
    uuid user_id PK, FK
  }
  proposals {
    uuid id PK
  }
  student_profiles {
    uuid user_id PK, FK
  }
  users {
    uuid id PK
  }
  companies ||..o{ scouts : "company_id"
  company_members ||..o{ scouts : "company_id, sender_id"
  proposals |o..o{ scouts : "proposal_id"
  student_profiles ||..o{ scouts : "student_id"
  companies ||..o{ conversations : "company_id"
  scouts |o..o| conversations : "scout_id"
  student_profiles ||..o{ conversations : "student_id"
  conversations ||..o{ messages : "conversation_id"
  users ||..o{ messages : "sender_id"
  conversations ||..o{ interview_slots : "conversation_id"
  users ||..o{ interview_slots : "proposed_by"
```

| 표 | 설명 | 기능 |
| --- | --- | --- |
| `scouts` | 스카우트 제안 (하루 3건, 같은 학생에게 한 번) | F-602 |
| `conversations` | 기업 ↔ 학생 1:1 대화방 | F-603 |
| `messages` | 메시지 (연락처 마스킹) | F-603 |
| `interview_slots` | 면접 일정 (확정 일정은 겹칠 수 없음) | F-603 |

#### ⑥ ESG 리포트 · 인증마크 — F-403, 인증마크

ESG 성과 리포트(PDF/Excel)와 SDGs 인증마크(입력 → 증빙 → 기준 충족 시 ★1~3 부여)예요.

```mermaid
erDiagram
  esg_reports {
    uuid id PK
    uuid company_id FK
    date period_start
    date period_end
    text file_format
    text file_key
    jsonb snapshot
    uuid generated_by FK
    timestamptz generated_at
  }
  cert_criteria {
    text code PK
    esg_category category
    cert_unit unit
    numeric target
    smallint weight
    numeric max_value
  }
  cert_applications {
    uuid id PK
    uuid company_id FK
    cert_status status
    smallint score
    smallint level "자동 계산"
    timestamptz submitted_at
    timestamptz decided_at
    uuid decided_by FK
    date valid_until
    timestamptz created_at
  }
  cert_answers {
    uuid application_id PK, FK
    text criterion_code PK, FK
    bigint value
    text evidence_key
    numeric points
  }
  companies {
    uuid id PK
  }
  users {
    uuid id PK
  }
  companies ||..o{ esg_reports : "company_id"
  users ||..o{ esg_reports : "generated_by"
  companies ||..o{ cert_applications : "company_id"
  users |o..o{ cert_applications : "decided_by"
  cert_applications ||--o{ cert_answers : "application_id"
  cert_criteria ||--o{ cert_answers : "criterion_code"
```

| 표 | 설명 | 기능 |
| --- | --- | --- |
| `esg_reports` | ESG 성과 리포트 (PDF/Excel) | F-403 |
| `cert_criteria` | SDGs 인증마크 심사 기준표 (항목·배점·목표값) | 인증마크 |
| `cert_applications` | SDGs 인증마크 신청 (점수·★1~3) | 인증마크 |
| `cert_answers` | 인증마크 항목별 답변과 증빙 | 인증마크 |

#### ⑦ 알림 · 운영 · 통계 · 번역 — F-204, F-701 ~ F-703

마감 알림(D-7/D-3/D-1), 신고·블랙리스트, 변경 불가 감사 로그, 일별 통계, 일본어↔한국어 번역 캐시예요.

```mermaid
erDiagram
  notification_prefs {
    uuid user_id PK, FK
    notif_kind kind PK
    notif_channel channel PK
    boolean enabled
  }
  device_tokens {
    uuid id PK
    uuid user_id FK
    text platform
    text token UK
    timestamptz created_at
    timestamptz last_seen_at
  }
  notifications {
    uuid id PK
    uuid user_id FK
    notif_kind kind
    notif_channel channel
    uuid challenge_id FK
    text title
    text body
    text link
    timestamptz scheduled_at
    timestamptz sent_at
    timestamptz read_at
    timestamptz created_at
  }
  reports {
    uuid id PK
    uuid reporter_id FK
    report_target target_type
    uuid target_id
    report_reason reason
    text detail
    report_status status
    uuid handled_by FK
    timestamptz handled_at
    timestamptz created_at
  }
  blacklist_entries {
    uuid id PK
    uuid user_id FK
    uuid company_id FK
    text reason
    uuid created_by FK
    timestamptz created_at
    timestamptz released_at
  }
  admin_actions {
    bigint id PK
    uuid admin_id FK
    text action
    text target_type
    uuid target_id
    jsonb detail
    timestamptz created_at
  }
  analytics_daily {
    bigint id PK
    date day
    text metric
    smallint sdg_id FK
    numeric value
  }
  content_translations {
    text entity PK
    uuid entity_id PK
    text field PK
    locale_code locale PK
    text body
    boolean machine_translated
    timestamptz created_at
  }
  challenges {
    uuid id PK
  }
  companies {
    uuid id PK
  }
  sdgs {
    smallint id PK
  }
  users {
    uuid id PK
  }
  users ||--o{ notification_prefs : "user_id"
  users ||..o{ device_tokens : "user_id"
  challenges |o..o{ notifications : "challenge_id"
  users ||..o{ notifications : "user_id"
  users |o..o{ reports : "handled_by"
  users ||..o{ reports : "reporter_id"
  companies |o..o{ blacklist_entries : "company_id"
  users ||..o{ blacklist_entries : "created_by"
  users |o..o{ blacklist_entries : "user_id"
  users ||..o{ admin_actions : "admin_id"
  sdgs |o..o{ analytics_daily : "sdg_id"
```

| 표 | 설명 | 기능 |
| --- | --- | --- |
| `notification_prefs` | 알림 설정 (종류 × 채널) | F-204 |
| `device_tokens` | 푸시 알림을 받을 기기 | F-204 |
| `notifications` | 알림 (마감 D-7/D-3/D-1 등) | F-204 |
| `reports` | 신고 (저작권·표절·부적절) | F-702 |
| `blacklist_entries` | 블랙리스트 (사용자 또는 기업) | F-701 |
| `admin_actions` | 관리자 작업 기록 (수정·삭제 불가) | 감사 로그 |
| `analytics_daily` | 일별 통계 (SDG 별 트렌드 포함) | F-703 |
| `content_translations` | 일본어↔한국어 번역 캐시 | 다국어 |

#### ⑧ SNS 피드 · 공식 SNS 게시 — F-503, F-504

학생의 실적 자랑 글(200자)과 기업의 홍보 글(제목 40자·본문 400자)을 한 피드에 모아요. 글마다 SDGs 태그 1~3개, 좋아요(사람마다 한 번·내 글 제외), 공식 SNS(X·Instagram·Facebook) 게시 신청(채널마다 하루에 한 회사)이 붙어요.

```mermaid
erDiagram
  social_posts {
    uuid id PK
    post_kind kind
    uuid author_id FK
    uuid activity_id FK
    uuid company_id FK
    uuid challenge_id FK
    text title
    text body
    locale_code source_lang
    timestamptz blinded_at
    timestamptz created_at
  }
  social_post_sdgs {
    uuid post_id PK, FK
    smallint position PK
    smallint sdg_id FK
  }
  social_post_likes {
    uuid post_id PK, FK
    uuid user_id PK, FK
    timestamptz created_at
  }
  official_share_slots {
    uuid post_id PK, FK
    official_channel channel
    date scheduled_on
    int fee_yen
    official_status status
    timestamptz requested_at
    timestamptz posted_at
  }
  activities {
    uuid id PK
  }
  challenges {
    uuid id PK
  }
  companies {
    uuid id PK
  }
  sdgs {
    smallint id PK
  }
  users {
    uuid id PK
  }
  activities |o..o{ social_posts : "activity_id, author_id"
  users ||..o{ social_posts : "author_id"
  challenges |o..o{ social_posts : "challenge_id, company_id"
  companies |o..o{ social_posts : "company_id"
  social_posts ||--o{ social_post_sdgs : "post_id"
  sdgs ||..o{ social_post_sdgs : "sdg_id"
  social_posts ||--o{ social_post_likes : "post_id"
  users ||--o{ social_post_likes : "user_id"
  social_posts ||--o| official_share_slots : "post_id"
```

| 표 | 설명 | 기능 |
| --- | --- | --- |
| `social_posts` | SNS 피드 글 (학생 자랑 200자·기업 홍보 400자, 연락처 금지) | F-503, F-504 |
| `social_post_sdgs` | 피드 글의 SDGs 태그 (글당 1~3개) | F-503, F-504 |
| `social_post_likes` | 피드 글 좋아요 (사람마다 한 번, 내 글 제외) | F-503, F-504 |
| `official_share_slots` | 공식 SNS(X·Instagram·Facebook) 게시 신청 (채널마다 하루 한 회사, 게시료 ¥3,000 샘플) | F-504 |

#### ⑨ リワード残高 · 상금 예치 · 운영 환원 — #25 (第二種資金移動業 등록 후)

기업이 과제를 낼 때 맡긴 상금(과제당 1건)을 최우수상 팀에 송금하고, 각 기 말에 운전자금 3개월분을 남긴 이익을 미리 공개한 기준으로 학생에게 환원해요. 원장은 입금(상금·환원)과 출금만 기록하고(고칠 수 없음), 출금은 본인 확인 뒤 1회 100만 엔·잔액 이하예요. 설계는 docs/rewards.md.

```mermaid
erDiagram
  wallet_accounts {
    uuid user_id PK, FK
    wallet_kyc_status kyc_status
    timestamptz kyc_verified_at
    timestamptz created_at
    timestamptz updated_at
  }
  prize_deposits {
    uuid id PK
    uuid challenge_id FK, UK
    uuid company_id FK
    reward_kind reward_kind FK "자동 계산"
    int amount_yen FK
    prize_deposit_status status
    timestamptz deposited_at
    uuid award_id FK
    award_kind award_kind FK "자동 계산"
    timestamptz settled_at
  }
  withdrawal_requests {
    uuid id PK
    uuid user_id FK
    int amount_yen
    withdrawal_status status
    timestamptz requested_at
    timestamptz completed_at
  }
  reward_return_rounds {
    uuid id PK
    text period_label UK
    date period_start
    date period_end
    bigint ordinary_profit_yen
    bigint period_costs_yen
    smallint reserve_months
    bigint period_end_cash_yen
    bigint reserve_yen "자동 계산"
    bigint total_yen "자동 계산"
    text criteria
    date criteria_published_on
    date decided_on
    uuid decided_by FK
    timestamptz created_at
  }
  reward_return_allocations {
    uuid round_id PK, FK
    uuid user_id PK, FK
    int amount_yen
    text basis
  }
  wallet_entries {
    uuid id PK
    uuid user_id FK
    wallet_entry_kind kind
    int amount_yen FK
    uuid prize_deposit_id FK, UK
    uuid return_round_id FK
    uuid withdrawal_id FK, UK
    timestamptz created_at
  }
  awards {
    uuid id PK
  }
  challenge_rewards {
    uuid challenge_id PK, FK
    reward_kind kind PK
  }
  challenges {
    uuid id PK
  }
  student_profiles {
    uuid user_id PK, FK
  }
  users {
    uuid id PK
  }
  student_profiles ||--o| wallet_accounts : "user_id"
  awards |o..o{ prize_deposits : "award_id, challenge_id, award_kind"
  challenges ||..o{ prize_deposits : "challenge_id, company_id"
  challenge_rewards |o..o{ prize_deposits : "challenge_id, reward_kind, amount_yen"
  wallet_accounts ||..o{ withdrawal_requests : "user_id"
  users ||..o{ reward_return_rounds : "decided_by"
  reward_return_rounds ||--o{ reward_return_allocations : "round_id"
  wallet_accounts ||--o{ reward_return_allocations : "user_id"
  prize_deposits |o..o{ wallet_entries : "prize_deposit_id, amount_yen"
  reward_return_allocations |o..o{ wallet_entries : "return_round_id, user_id, amount_yen"
  wallet_accounts ||..o{ wallet_entries : "user_id"
  withdrawal_requests |o..o{ wallet_entries : "withdrawal_id, user_id, amount_yen"
```

| 표 | 설명 | 기능 |
| --- | --- | --- |
| `wallet_accounts` | リワード残高 지갑 계정 (학생 1명에 1개, 본인 확인 상태) | #25 리워드 |
| `prize_deposits` | 기업이 과제에 맡긴 상금 (과제당 1건, 최우수상에 송금·마감 후 반환) | #25 리워드 |
| `withdrawal_requests` | 출금 신청 (1회 1~1,000,000엔, 본인 확인·잔액 이하) | #25 리워드 |
| `reward_return_rounds` | 운영 환원 회차 (운전자금 3개월분을 남긴 이익 전부, 기준은 미리 공개) | #25 리워드 |
| `reward_return_allocations` | 운영 환원 배분 (합계 = 회차 환원 총액) | #25 리워드 |
| `wallet_entries` | リワード残高 원장 (상금·환원 입금, 출금 — 수정·삭제 불가) | #25 리워드 |

#### 뷰 (집계·화면용)

| 뷰 | 설명 | 기능 |
| --- | --- | --- |
| `challenge_stats` | 챌린지별 응모자 수·관심 수·평균 점수·남은 일수 | F-402 |
| `company_fee_summary` | 기업별 수수료·기부·운영 수익 요약 | 수익 모델 |
| `company_prize_summary` | 기업별 상금 예치·송금·반환 합계 | #25 리워드 |
| `feed_posts` | 피드에 보이는 글 (닉네임·레벨 또는 기업 정보만, 블라인드 제외) | F-503, F-504 |
| `impact_totals` | 학생별 누적 포인트와 레벨 | F-401 |
| `proposal_current` | 제출 건 + 가장 최신 버전 (심사 화면용) | F-302 |
| `talent_directory` | 인재 검색에 보이는 학생 (비공개·정지 계정 제외) | F-601 |
| `wallet_balances` | 학생별 リワード残高 (잔액 = 입금 − 출금) | #25 리워드 |
<!-- erd:end -->

### DB 가 지키는 규칙

| 규칙 (앱: `packages/core`) | DB 에서 지키는 방법 |
| --- | --- |
| 관심 SDGs 최대 5개(우선순위), 챌린지 SDGs 최대 3개 | `position` 을 기본 키에 넣고 `CHECK (position BETWEEN 1 AND 5 / 3)` |
| 챌린지 마감은 만든 날부터 7~90일 | `challenges_deadline_window` `CHECK` |
| 승인된 기업만 출제, 심사위원이 있어야 심사 시작 | `challenges_guard` 트리거, 상태 전이표(`challenge_status_can_change`) |
| 심사위원은 챌린지를 낸 기업의 구성원 | 복합 외래 키 `(company_id, user_id)` 두 개 |
| 응모작은 반드시 버전 1 을 가짐 | 지연 제약 트리거 `proposals_has_version` |
| 제출 파일: PDF/PPTX, 50MB 이하, 마감 전에만 새 버전 | `CHECK` + `proposal_versions_guard` 트리거, 수정 불가(`forbid_mutation`) |
| 제출 수령증 번호 `SC-YYYYMMDD-NNNN` | `receipt_counters` 로 날짜별 순번(동시 제출에도 겹치지 않음) |
| 수상은 심사위원 전원이 점수를 낸 뒤에만 | `awards_guard_ins` 트리거 |
| 수상 포인트 400/300/200, 심사 평균 | 생성 열 `awards.points`, `reviews.average` |
| 수수료 ¥30,000 → 기부 50%(내림) · 나머지 수익 | 생성 열 `matches.donation_yen` · `matches.revenue_yen` |
| 한 응모작은 한 번만 채용 | `matches` 유니크 + `matches_guard` |
| SDG별 점수 = 100 × (1 − e^(−포인트/300)) | `impact_sdg_score()` → 생성 열 `impact_scores.score`, 활동이 들어올 때마다 트리거로 누적 |
| 공유 포인트는 최대 5회 | `activities_guard_ins` |
| 증명서: SHA-256 재계산, 인증 코드·QR 값, 발급 후 수정 불가 | `certificates_guard_*` 트리거 + 생성 열 `verify_code`·`qr_payload` |
| 스카우트 하루 3건(JST), 같은 학생에게 한 번 | `scouts_guard_ins` + 생성 열 `sent_on` + 유니크 |
| 수락 전에는 연락처(메일·전화) 마스킹 | 생성 열 `messages.body_masked` (`mask_contacts()`), 수락하면 `contact_released_at` |
| 면접 일정이 겹치지 않음 | `EXCLUDE USING gist` (`btree_gist`) |
| 인증 점수·레벨(★1~3: 40/60/80점) | 트리거 `cert_answers_compute` + 생성 열 `cert_applications.level` |
| 블랙리스트 적용, 감사 로그 변경 불가 | `blacklist_apply_*` 트리거, `admin_actions_immutable` |
| SNS 자랑 글: 내 수상·제출·참가 실적 1건 필수(카드뉴스 공유 기록 제외), 본문 1~200자 | 복합 외래 키 `(activity_id, author_id)` + `social_posts_guard` + `social_posts_body_len` |
| SNS 홍보 글: 승인된 기업의 담당자만, 제목 1~40자·본문 1~400자, 연결 챌린지는 우리 기업 것 | `social_posts_guard` + 복합 외래 키 `(challenge_id, company_id)` + `social_posts_title_len`·`_body_len` |
| 글자 수 = 앞뒤 공백을 자른 코드포인트 수(이모지·한자도 1글자, 전각 공백·NBSP 포함) | `post_char_count()` (JS `trim()` 과 BMP 6만여 글자를 하나씩 대조) |
| 글에 이메일·전화번호처럼 보이는 글자 금지 | `social_posts_no_contact` (`mask_contacts()`) |
| SDGs 태그 1~3개 (자랑 글은 실적의 SDGs 중에서) | `position 1..3` 기본 키 + 지연 제약 트리거 `social_posts_has_sdg`·`social_post_sdgs_keep_one` + `social_post_sdgs_guard` |
| 좋아요는 사람마다 한 번, 내 글(기업 글은 우리 기업 담당자 전원)에는 불가 | 기본 키 `(post_id, user_id)` + `social_post_likes_guard` |
| 공식 SNS 게시: 홍보 글만, 내일 이후, 채널(X·Instagram·Facebook)마다 하루에 한 회사, 게시료 ¥3,000 | `official_share_slots`(`channel` = enum `official_channel`, 기본 `instagram`) + 부분 유일 인덱스 `official_share_slots_one_per_channel_day`(채널 + 날짜) + `official_share_slots_guard` |
| リワード残高: 상금은 출제할 때 과제당 1건 예치, 금액 = 그 과제의 상금 | `prize_deposits` 복합 외래 키 `(challenge_id, reward_kind, amount_yen)` → `challenge_rewards` + `prize_deposits_guard` |
| 최우수상이 정해지면 상금을 수상 팀 제출자에게 송금(한 번 보낸 돈은 되돌리지 않음), 최우수상 없이 마감되면 기업에 반환 | `awards_pay_prize` → `prize_deposits_credit` 트리거, 복합 외래 키 `(award_id, challenge_id, award_kind='grand')`, 상태 전이 가드 |
| 출금: 본인 확인 완료 · 1회 1~1,000,000엔 · 잔액 이하 (동시 신청도 차례로) | `withdrawal_requests_amount_range` `CHECK` + `withdrawal_requests_guard`(계정 행 `FOR UPDATE`) |
| 운영 환원 = max(0, min(경상이익, 기말 자금 − 운전자금 3개월분)), 배분 합계 = 환원 총액, 기준은 기 시작 전에 공개 | 생성 열 `reward_return_rounds.reserve_yen`·`total_yen` + 지연 제약 트리거 2개 + `CHECK (criteria_published_on <= period_start)` |
| 원장은 입금(상금·환원)·출금만, 출처 하나에만, 고칠 수 없음 | `wallet_entries`(복합 외래 키로 금액·학생까지 출처와 같게, `forbid_mutation`), 잔액 뷰 `wallet_balances` |

시험은 `db/tests/` 의 SQL 7개 파일이에요: 01 구조(표·열·인덱스·주석) · 02 계정·챌린지 · 03 제출부터 매칭까지 흐름 · 04 앱↔DB 대조 · 05 스카우트·인증·운영 · 06 SNS 피드(글자 수·연락처·공식 게시 날짜) · 07 リワード残高(상금 예치·송금·반환 · 본인 확인·출금 · 운영 환원).
모두 트랜잭션 안에서 실행하고 `ROLLBACK` 해서 데이터가 남지 않아요. (`npm run db:test`)

## 기능 구현 현황

✅ 앱 데모로 동작 · 🟡 일부만 · 📐 DB 설계만(데모 화면 없음)

| ID | 기능 | 데모 | 앱에서 | DB (주요 표) |
| --- | --- | :-: | --- | --- |
| F-101 | 회원가입·로그인(소셜/이메일), 본인 확인 | 📐 | 로그인 없이 역할 선택으로 시작 | `users`, `oauth_accounts` |
| F-102 | B2C 프로필, 관심 SDGs(최대 5)·스킬 | ✅ | 샘플 프로필이 추천에 쓰여요 | `student_profiles`, `profile_sdg_interests`, `profile_skills` |
| F-103 | 기업 ESG 프로필·브랜드관(관리자 승인) | 🟡 | 기업 소개·SDGs(샘플) | `companies`, `company_sdgs`, `company_documents` |
| F-104 | 포트폴리오(활동 이력, PDF/URL) | 🟡 | Impact 화면의 활동 이력 | `activities`, `portfolio_files` |
| F-201 | 챌린지 출제(마감 7~90일) | ✅ | B2B 새 챌린지 | `challenges`, `challenge_sdgs`, `challenge_rewards` |
| F-202 | 검색·SDGs 필터·추천(기능명세의 "AI 추천") | ✅ | 홈·검색(규칙 기반 추천 — 화면에는 「AI」라고 쓰지 않아요) | `challenge_sdgs`, `challenge_skills` |
| F-203 | 팀 빌딩, Q&A | 🟡 | 팀 모집 글·"함께하고 싶어요" (Q&A 는 DB) | `team_posts`, `team_requests`, `challenge_comments` |
| F-204 | 북마크·마감 알림 | 🟡 | 북마크·마감 임박 목록 (알림 발송은 DB) | `bookmarks`, `notifications` |
| F-301 | 기획서 제출·수령증 | ✅ | 제출 4단계 + 수령증 | `proposals`, `receipt_counters` |
| F-302 | 제출 버전 관리 | ✅ | 마감 전 재제출 = 새 버전 | `proposal_versions` |
| F-303 | 심사·수상 | ✅ | B2B 응모자: 점수·수상·채용 | `reviews`, `awards`, `matches` |
| F-401 | Impact Index(SDG별 점수·레벨) | ✅ | Impact: 레이더·레벨 | `activities`, `impact_scores` |
| F-402 | 배지 | ✅ | Impact: 배지 6종 | `badges`, `user_badges` |
| F-403 | ESG 성과 리포트 | ✅ | ESG: 리포트 생성·요약 | `esg_reports` |
| F-501 | SNS 카드뉴스(Instagram 1:1·LinkedIn 1.91:1) | ✅ | 카드 미리보기·공유 | `share_cards` |
| F-502 | 디지털 증명서(해시·QR·진위 확인) | ✅ | 증명서: 검증 ✓ / 변조 ✗ | `certificates`, `certificate_verifications` |
| F-503 | 학생 자랑 글(SNS 피드) | ✅ | 피드: 내 실적 1건을 골라 글 올리기 · 좋아요 · 삭제 (이메일/전화번호 글은 차단) | `social_posts`(`kind='brag'`), `social_post_sdgs`, `social_post_likes` |
| F-504 | 기업 홍보 글 · 공식 SNS 게시 신청 | 🟡 | 피드: `PR` 표시 홍보 글, 공식 SNS 채널(X·Instagram·Facebook) 선택과 채널별 게시 날짜 배정(채널마다 하루 한 회사). 실제 SNS 게시·정산은 없음 | `social_posts`(`kind='pr'`), `official_share_slots` |
| F-601 | 인재 검색 | ✅ | B2B 인재 · 학생 설정의 「스카우트 받기」 켜기/끄기(Impact 에도 상태 표시) | `student_profiles` (`scoutable`) |
| F-602 | 스카우트(하루 3건) | ✅ | 보내기·수신함·수락/거절 | `scouts` |
| F-603 | 1:1 메시지·면접 일정 | 📐 | 수신함까지(대화·면접은 DB) | `conversations`, `messages`, `interview_slots` |
| F-701 | 관리자 승인 | 📐 | — | `companies.status`, `company_documents` |
| F-702 | 신고·블라인드·블랙리스트 | 📐 | — | `reports`, `blacklist_entries` |
| F-703 | 통계 | 🟡 | B2B 대시보드 KPI · 운영자 화면 이용 현황(웹 데모) | `analytics_daily` |
| — | SDGs 실천 마크(독자 기준, 일본어 「取組みマーク」) | ✅ | ESG: 6기준 입력 → ★ 단계 | `cert_criteria`, `cert_applications`, `cert_answers` |
| — | 중개 수수료·기부 | ✅ | B2B 대시보드·채용 시 반영 | `matches`, `donations`, `donation_recipients` |
| — | 운영자 화면: 이용 현황 · SNS 지표 · 수지·자금 시뮬레이션 | ✅ | 웹 전용(앱에는 없어요) — 로그인·관리자 권한 없는 데모 | (DB 없음 — 데모 데이터와 이 브라우저 저장) |
| — | リワード残高(기업 상금 · 운영 환원 · 출금, #25) | 🟡 | 학생 `/wallet/`: 잔액·내역·본인 확인(데모 버튼)·출금 신청(검사만) · 기업: 출제 안내·최우수상이면 송금·대시보드 예치 현황. 第二種資金移動業 등록 후 제공 예정 — 실제 송금·은행 연동·eKYC 없음 | `wallet_accounts`, `prize_deposits`, `withdrawal_requests`, `reward_return_rounds`, `reward_return_allocations`, `wallet_entries` |
| — | 학생용 신청 요약(활동 기록 한 장 · 인쇄·PDF) | ✅ | Impact → 「申請用のまとめを作る」: 기간 선택, 웹은 인쇄·PDF(A4 1쪽), 앱은 글로 공유. 대학 양식 맞춤·제출 대행은 없음 | (DB 없음 — 활동 기록·증명서를 읽어 만들어요) |

## 저장소 구조

```text
sdgs-compass/
├─ apps/
│  ├─ web/               Next.js 16 (App Router, 클라이언트 렌더링) — 정적 내보내기로 GitHub Pages 배포
│  └─ mobile/            Expo SDK 58 · React Native 0.88 · expo-router — 모바일 앱(Android APK 를 빌드해요)
├─ packages/
│  ├─ core/              순수 TypeScript (UI 없음): 도메인 타입 · reducer · 화면 모델(selectors) ·
│  │                     Impact/수수료/인증 점수/증명서 해시/QR/게시글/リワード残高 규칙 · 문구(ja·ko) · 디자인 토큰
│  └─ data/              샘플 데이터(seed) · 저장소 어댑터(AsyncStorage/localStorage) · 앱 상태(언어·역할·데모)
├─ db/
│  ├─ schema.sql         PostgreSQL 16 스키마 (표 68 · 뷰 8)
│  ├─ seed.sql           참조 데이터 (자동 생성: packages/core 값에서)
│  ├─ run-tests.sh       새 DB 에 올려서 tests/ 를 돌려요
│  └─ tests/             구조 · 규칙 · 흐름 · 앱↔DB 대조 · 운영 · SNS 피드 · リワード残高 시험 (golden.sql 은 자동 생성)
├─ docs/
│  ├─ admin.md           운영자 화면(이용·SNS 지표 · 수지·자금 시뮬레이션) 설계: 입력 · 계산식 · JSON 스키마 · 가정과 한계
│  ├─ rewards.md         リワード残高(기업 상금 · 운영 환원 · 출금) 설계: 구조 · 규칙 · 법적 근거와 출처 · 하지 않는 것 · 전문가 질문
│  ├─ sns-feed.md        SNS 피드(F-503·F-504) 설계: 규칙 · 화면 · 데이터 대응
│  ├─ student-merit.md   학생(개인회원)의 메리트: 활동 증명서 · 장학금·활동 장려 제도 조사 · 신청 과정
│  ├─ mockups/           화면 목업 이미지
│  ├─ qr/                웹 데모 주소 QR 이미지 (npm run qr)
│  ├─ releases/          버전별 릴리스 노트 (v0.2.0.md …) — 마일스톤을 닫으면 Release 본문으로 써요
│  └─ erd/               ERD 그림 파일 (npm run erd:render)
├─ scripts/
│  ├─ erd.mjs            README 의 ERD·표 목록을 DB 에서 읽어 만들거나 확인
│  ├─ gen-db-reference.ts  db/seed.sql · db/tests/golden.sql 생성·확인
│  ├─ gen-qr.ts          웹 데모 주소의 QR 이미지(SVG·PNG) 생성·확인
│  └─ check-single-react.mjs  모노레포에 React 가 한 벌인지 확인
└─ .github/
   ├─ workflows/         ci.yml · pages.yml · android-apk.yml · release.yml
   └─ scripts/           run-step.sh (실패 원인을 GitHub 주석으로 남기는 도우미) · release-from-milestone.sh (마일스톤 → 태그·Release)
```

**한 방향으로만 의존해요**: `apps/*` → `packages/data` → `packages/core`. 화면은 얇게 두고(`selectXxx(상태, 언어)` → 그리기, `dispatch(액션)`), 규칙·문구·계산은 모두 `packages/core` 에만 있어요.
그래서 웹과 앱이 같은 결과를 내고, 규칙 시험(`*.test.ts`)은 화면 없이 돌아요.

## 실행하기

### 필요한 것

- Node.js **22.13 이상** (CI 는 `.nvmrc` 의 24), npm 10.9 이상
- 앱을 폰에서 직접 열려면 Releases 의 APK(Android) 또는 Expo SDK 58 을 지원하는 Expo Go
- DB 시험을 돌릴 때만: PostgreSQL 16 (`psql`, `createdb`, `dropdb`)

### 웹

```bash
npm install
npm run dev          # http://localhost:3000
```

GitHub Pages 용 정적 내보내기(저장소 하위 주소) — 결과는 `apps/web/out`:

```bash
NEXT_PUBLIC_BASE_PATH=/sdgs-compass npm run build:export -w @sdgs-compass/web
# Windows PowerShell:  $env:NEXT_PUBLIC_BASE_PATH="/sdgs-compass"; npm run build:export -w @sdgs-compass/web
```

### 모바일

```bash
npm install
npm run mobile       # Expo 개발 서버 → QR 을 Expo Go 로 스캔
```

이 앱은 Expo 기본 모듈만 쓰고 직접 만든 네이티브 코드가 없어요(레이더·QR 도 기본 컴포넌트로 그려요). 그래서 **Expo SDK 58 을 지원하는 Expo Go** 에서는 열릴 거예요 — 다만 실제 기기의 Expo Go 로는 확인하지 못했어요(CI 에서는 타입 검사·Jest·번들 내보내기·`expo-doctor` 까지 확인해요). Expo Go 가 아직 SDK 58 을 지원하지 않으면 `npm run android -w @sdgs-compass/mobile`(Android Studio 필요) 또는 APK 를 쓰세요. 발표용으로는 개발 서버가 필요 없는 APK(아래)를 권해요.

### DB

```bash
createdb sdgs_compass
psql -d sdgs_compass -v ON_ERROR_STOP=1 -f db/schema.sql -f db/seed.sql
PGHOST=127.0.0.1 PGUSER=postgres npm run db:test      # 시험 7개 파일
npm run db:generate                                    # 앱 규칙을 바꿨다면 seed.sql / golden.sql 다시 만들기
PGDATABASE=sdgs_compass npm run erd                    # 스키마를 바꿨다면 README 의 ERD 다시 만들기
```

### 스크립트

| 명령 | 하는 일 |
| --- | --- |
| `npm run dev` · `npm run build` | 웹 개발 서버 · 빌드 |
| `npm run mobile` | Expo 개발 서버 |
| `npm run check` | react 한 벌 · lint · 테스트 · 빌드 · 타입 검사 (웹 + 공용 패키지) |
| `npm run lint` · `npm test` · `npm run typecheck` | 전체 워크스페이스 |
| `npm run db:test` | DB 시험 7개 파일 (`PG*` 환경 변수 필요) |
| `npm run db:generate` · `db:check` | `db/seed.sql` · `db/tests/golden.sql` 생성 · 최신 여부 확인 |
| `npm run qr` · `qr:check` | 웹 데모 주소의 QR 이미지(`docs/qr/`) 만들기 · 주소와 맞는지 확인 (`npm run qr -- <주소> <파일 이름>` 으로 다른 주소도 만들 수 있어요) |
| `npm run erd` · `erd:check` · `erd:render` | README 의 ERD 생성 · 확인 · `docs/erd/*.png` 그림 파일 만들기 (mermaid-cli 필요) |

## CI / 배포 (GitHub Actions)

이 저장소는 **공개(public)** 라서 GitHub 서버의 실행 시간이 무료예요. SchedulAI 의 `ci.yml` 구조(단계마다 `run-step.sh` 로 실패 원인을 주석으로 남기기)를 따르되 self-hosted 실행기는 쓰지 않아요.

| 워크플로 | 언제 | 하는 일 |
| --- | --- | --- |
| `ci.yml` | main·`feat/**` 푸시, PR, 수동 | **db**: PostgreSQL 16 에 스키마·시드를 올려 시험 7개 파일 → 생성 파일(`seed.sql`·`golden.sql`)·README ERD 최신 여부<br>**web**: react 한 벌 · lint(web, core·data) · 테스트(core·data·web) · 타입 검사 · 빌드 · Pages 용 정적 내보내기<br>**mobile**: 타입 검사 · lint · Jest · `expo install --check` · `expo-doctor` · `expo prebuild` · `expo export`(iOS+Android 번들)<br>**lockfile**: `package-lock.json` 이 없으면 한 번 만들어 main 에 커밋 |
| `pages.yml` | main 푸시(웹·공용 패키지 변경), 수동 | 웹 정적 내보내기(`NEXT_PUBLIC_BASE_PATH=/<저장소 이름>`) → GitHub Pages 배포 |
| `android-apk.yml` | main 푸시(앱·공용 패키지 변경), 수동 | `expo prebuild` → `./gradlew :app:assembleRelease`(기본 arm64) → 서명 확인 → Artifacts 와 **Releases `demo-latest`** 에 `sdgs-compass-demo.apk` 업로드 |
| `release.yml` | **마일스톤을 닫을 때**, 수동 | 마일스톤 이름이 `v0.3 …` 처럼 버전으로 시작하면 태그 `v0.3.0` 과 GitHub Release 를 만들어요. 노트는 `docs/releases/v0.3.0.md` 가 있으면 그 파일, 없으면 마일스톤의 목표와 닫힌 이슈 목록이에요 ([자세히](#릴리스-마일스톤을-닫으면)) |

### 릴리스 (마일스톤을 닫으면)

마일스톤 이름이 `v0.3 …` 처럼 버전으로 시작하면, 그 마일스톤을 **닫을 때** `release.yml` 이 닫은 순간의 main 커밋에 태그 `v0.3.0` 을 붙이고 GitHub Release 를 만들어요(누가 닫든 같아요). 규칙은 [SchedulAI](https://github.com/atome9797/SchedulAI) 의 `release.yml` 과 같아요.

1. 릴리스 노트를 `docs/releases/v0.3.0.md` 로 먼저 main 에 올려요(닫은 이슈 목록을 넣어요). 파일이 없으면 마일스톤의 "목표" 줄과 닫힌 이슈 목록으로 채워요.
2. 마일스톤을 닫아요 (Issues › Milestones › Close milestone).
3. Actions › **Release (마일스톤을 닫으면)** 실행이 성공했는지, Releases 에 새 항목이 생겼는지 확인해요.

- 이미 닫은 마일스톤은 Actions › **Release (마일스톤을 닫으면)** › Run workflow 에 마일스톤 번호(마일스톤 주소 끝의 숫자)를 넣어서 만들어요. 태그는 그 마일스톤을 닫을 때까지의 main 커밋에 붙어요.
- 같은 태그가 이미 있으면 건너뛰어요(다시 열었다 닫아도 두 번 만들지 않아요). "Latest" 표시는 가장 높은 버전에 있고, APK 를 올리는 `demo-latest` 는 계속 사전 릴리스(Pre-release)예요.

### GitHub Pages 웹 데모 켜기

처음 한 번만 저장소 설정이 필요해요:

1. 저장소 **Settings › Pages** 를 열어요.
2. **Build and deployment › Source** 를 **GitHub Actions** 로 바꿔요.
3. **Actions › Deploy web demo (GitHub Pages) › Run workflow** 를 눌러요(또는 main 에 푸시).

배포가 끝나면 https://atome9797.github.io/sdgs-compass/ 에서 열려요. 설정 전에는 이 워크플로의 deploy 작업만 실패하고(요약에 안내가 나와요) CI 에는 영향이 없어요.

### Android 데모 APK 받기

1. 저장소의 **Releases › demo-latest** 에서 `sdgs-compass-demo.apk` 를 내려받아요(항상 최신 main 빌드예요).
   직접 주소: `https://github.com/atome9797/sdgs-compass/releases/download/demo-latest/sdgs-compass-demo.apk`
2. 휴대폰에서 파일을 열고 **출처를 알 수 없는 앱 설치**를 허용해요.
3. 서버 없이 혼자 실행돼요. 첫 화면에서 언어와 역할을 골라요.

- 기본 빌드는 `arm64-v8a`(대부분의 실제 폰)예요. 안드로이드 에뮬레이터(x86_64)용은 Actions 에서 수동 실행할 때 `abis` 에 `arm64-v8a,x86_64` 처럼 적어요.
- Expo 템플릿의 공개 `debug.keystore` 로 서명한 **데모용**이라 스토어 배포용이 아니에요.
- 요청하는 권한은 **인터넷(React Native 기본) 하나**예요. 저장소 읽기·쓰기, 진동, 다른 앱 위에 표시 권한은 `apps/mobile/app.config.ts` 의 `blockedPermissions` 로 막아 두었고, 빌드할 때마다 CI 가 `aapt2` 로 확인해요(남아 있으면 빌드 실패). 앱 코드는 서버와 통신하지 않아요.
- Actions › Android APK (demo) 실행의 Artifacts(`sdgs-compass-demo-apk`)에도 14일간 같은 파일이 있어요.

### package-lock.json 에 대해

이 저장소를 처음 만든 환경에서는 npm 레지스트리에 접속할 수 없어서 `package-lock.json` 을 미리 만들 수 없었어요.
그래서 처음 main 에 푸시됐을 때 CI 의 `lockfile` 작업이 한 번 만들어서 `chore: package-lock.json 생성 (CI)` 커밋으로 올렸고, 지금은 모든 워크플로가 `npm ci` 로 같은 버전을 설치해요.
로컬에서 이어서 작업한다면 먼저 `git pull` 해서 이 커밋을 받으세요. 잠금 파일이 이미 있으면 `lockfile` 작업은 아무것도 하지 않아요.

## 설계 결정 — SchedulAI 와 다른 점

모노레포 구성, 버전, 스크립트, 설정 파일, CI 단계는 [SchedulAI](https://github.com/atome9797/SchedulAI) 를 그대로 따랐어요. 다른 점은 이래요.

| | SchedulAI | SDGsコンパス | 이유 |
| --- | --- | --- | --- |
| 데이터 | Firebase(Firestore) + 로그인 | **서버 없음** — 샘플 데이터 + 기기 저장 | 공모전 시연용이라 어디서든(오프라인 포함) 바로 열려야 해요 |
| DB 설계 | Firestore 컬렉션 | **PostgreSQL ERD**(68표) + 시험 | 기업·학생·심사·매칭처럼 관계가 많고, 수수료·인증처럼 일관성이 중요해요 |
| 언어 | 한국어 | **일본어/한국어**, 첫 화면에서 선택 | 발표는 일본어, 개발은 한국어 |
| 화면 모델 | 화면에서 계산 | **`packages/core/selectors.ts`** 가 화면 모델을 만들고 화면은 그리기만 | 웹·앱이 같은 결과를 내고 화면 없이 시험할 수 있어요 |
| 모바일 | 개발 빌드(dev client)·Firebase·푸시 | **독립 실행 release APK**, 네이티브 모듈 추가 없음 | 개발 서버 없이 발표 때 휴대폰에서 바로 열기 |
| CI 실행기 | self-hosted(내 컴퓨터) | **GitHub 서버**(공개 저장소라 무료) | 컴퓨터가 꺼져 있어도 돌아요 |
| 배포 | Vercel | **GitHub Pages 정적 내보내기** + Releases APK | 서버가 필요 없어서 |
| 차트·QR | — | 레이더 차트·QR 을 **라이브러리 없이** 직접 그림(웹: SVG, 앱: 기본 `View`) | 앱에 새 네이티브 의존성을 넣지 않으려고 |

## 데모의 한계와 알려진 점

- **서버·DB 연결 없음**: 화면의 데이터는 샘플(가상)이고 웹은 `localStorage`, 앱은 `AsyncStorage` 에 저장돼요. DB 스키마는 설계·검증용이에요.
- **없는 것**: 소셜/이메일 로그인과 본인 확인, 결제·실제 송금(リワード残高 화면은 데모), 푸시/카카오/SMS 알림, 관리자(승인·신고) 화면, 1:1 대화·면접 일정 화면, Q&A 게시판.
- **운영자 화면은 로그인 없는 웹 데모예요.** 이용 현황은 앱의 데모 데이터를 세고, SNS 지표는 사람이 옮겨 적은 숫자(외부 SNS 의 API 연동 없음)이며, 수지·자금은 입력한 가정을 계산하는 시산이에요(세금·감가상각·운전자금·이자·계절성 제외, 예측·투자 판단이 아님). 입력은 이 브라우저(`localStorage`)에만 저장되고, 실서비스의 로그인·관리자 권한·DB 집계는 아직 없어요 → [docs/admin.md](docs/admin.md).
- **SNS 피드는 앱 안의 게시판이에요.** 실제 X·Instagram·Facebook 계정으로 올리는 기능, 이미지·영상 업로드, 댓글·팔로우·알림, 관리자 검수·신고 화면은 없어요. 공식 SNS 게시 신청은 X·Instagram·Facebook 중 하나이고(YouTube 는 영상 채널이라 신청 대상이 아니에요) '예정'(날짜 배정)까지만 하고 실제 게시와 게시료 정산은 하지 않아요. 글은 쓴 언어 그대로 보여요(자동 번역 없음).
- **파일 첨부는 업로드가 아니에요.** 웹은 진짜 파일 선택기(`<input type="file">`)로 고르거나 "샘플 기획서" 단추를 쓰는데, 파일의 **이름과 크기만** 읽고 내용은 읽지도 보내지도 않아요. 모바일 앱은 파일 선택기 없이 견본 파일 3개(마지막 하나는 일부러 형식이 틀린 파일) 중에서 골라요. 두 곳 모두 제출 수령증의 지문(SHA-256)은 파일 이름·크기·제목·요약·버전으로 만들어요.
- **디지털 증명서**의 해시 검증은 앱 안에서만 해요(블록체인 기록·외부 검증 서버 없음). 변조 시연은 "복사본을 고쳐서 검증 실패 확인"으로 보여 줘요.
- **リワード残高는 데모예요.** 운영사가 第二種資金移動業 등록을 받은 뒤에 제공할 기능이라, 데모는 잔액·내역·본인 확인 버튼·출금 검사만 보여 주고 **실제 송금·은행 연동·eKYC 는 하지 않아요.** 상금은 최우수상 1팀(데모에서는 제출자)에게만 보내고, 팀 안의 나눔·상별 상금·원천징수·출금 반려는 아직 없어요. 샘플 내역 「運営からの還元（サンプル）」은 화면 예시예요(환원은 기 말에 이익과 자금이 남을 때만 생겨요) → [docs/rewards.md](docs/rewards.md).
- **학생 메리트의 신청용 요약은 시제품**(기간을 골라 A4 한 장으로 인쇄·PDF, 앱은 글로 공유)이고 **제도 일람·결과 자기 신고는 구상**이에요. 앱의 증명서·요약을 대학 제도에서 증빙으로 인정하는지는 확인 전이에요. 앱은 장학금을 지급하지 않고(상금·환원은 リワード残高 — 데모) 대학·재단과 제휴한 것도 아니에요 → [docs/student-merit.md](docs/student-merit.md).
- **추천**은 규칙 기반 점수(관심 SDGs 우선순위 · 스킬 · 마감 임박도 · 상금)예요. 그래서 화면에는 「AI」라고 쓰지 않아요(「おすすめの課題」 / 「추천 챌린지」). 실서비스에서는 같은 입출력의 추천 모델로 바꿀 수 있어요.
- **번역**은 화면 문구(일본어/한국어 사전)만 해요. 사용자가 쓴 글의 자동 번역은 DB 의 `content_translations` 에 자리만 있어요.
- **실천 마크**(取組みマーク)는 독자 기준이에요. 국가·자치체·국제연합의 인증이 아니고, 마크 화면에 그 안내가, 첫 화면·설정·(PC) 사이드바에 "유엔 승인 아님" 고지가 항상 보여요. DB 표 이름(`cert_*`)과 ERD 의 표 설명은 예전 이름 '인증마크'를 그대로 써요.
- **일본어 화면의 용어**: 기업이 내는 과제는 「課題」라고 써요(한국어 화면은 「챌린지」). 레벨 이름 「チャレンジャー」와 배지 이름 「チャレンジキング」은 고유한 이름이라 그대로예요.
- **날짜**는 앱을 여는 날을 "오늘"로 삼고 샘플 날짜를 그만큼 옮겨서, 언제 열어도 D-day 가 자연스러워요(`rebase`).
- iOS 설치 파일(IPA)은 만들지 않았어요. iPhone 은 웹 데모(홈 화면에 추가)를 쓰세요. Expo Go 로 여는 방법은 "실행하기 › 모바일"을 보세요.
- **실제 폰에서의 실행**은 자동 검사로 확인할 수 없어요. 앱은 CI(타입 검사·Jest·번들 내보내기·APK 빌드)와 같은 코드를 쓰는 웹 데모의 화면 점검까지만 확인했어요. 발표 전에 [발표 전 점검표](#발표-전-점검표-5분)대로 한 번 설치해서 눌러 보세요.

## 공개 저장소 안내

- 이 저장소는 **공개**예요. 공모전의 비공개 자료(기능명세서 원문, UI 가이드 이미지, 심사 관련 문서)는 넣지 않았고, 이름·기업·점수는 모두 가상의 샘플이에요.
- **UN SDGs 공식 로고·아이콘 이미지는 쓰지 않았어요.** 17개 목표는 공개된 색상값과 번호만으로 그린 타일이에요.
- 비밀 값(API 키·서명 키)은 필요 없고 저장소에도 없어요. `.gitignore` 가 `*.keystore`·`.env*` 를 막아요.

---

## 日本語の概要

**SDGsコンパス**は、企業が出すSDGs課題に学生が企画書で応募し、審査・受賞の実績が
**SDG別のImpact Index（レーダーチャート）** と **改ざんを検証できるデジタル証明書** として残る、企業と学生をつなぐマッチングプラットフォームです。
実績を見た企業が人材をスカウト・採用すると、**仲介手数料3万円のうち50%を企業名義でSDGs活動に寄付**します。

- **日本語／韓国語の両対応**：初回起動時に言語を選び（端末の言語を事前に強調表示）、ヘッダーの「日本語 | 한국어」でいつでも切り替えられます。
- **2つの立場**：学生・個人（B2C）と企業・団体（B2B）を選択、ヘッダーのチップで切り替えて、1つのアプリで両方の流れをデモできます。
- **発表当日はQRコードを公開**：スマホでQRコードを読み取ると、インストール不要でWebデモが開きます（言語選択から開始。入力内容は各自の端末にだけ保存されます）。
- **サーバー不要のデモ**：サンプルデータ（すべて架空）で、課題出題 → 応募 → 審査 → 受賞 → Impact → 証明書 → スカウト → 採用 → 手数料・寄付まで一巡できます。
- **SNSフィード**：学生は受賞・提出・参加の実績を「実績投稿」として、企業はSDGs活動を「PR投稿」（必ず「PR」表示）として投稿できます。メールアドレスや電話番号は書けません。公式SNS（X・Instagram・Facebookから1つ選択）への掲載申込みは、SNSごとに1日1社までです。
- **学生のメリット**：学生・個人は無料で利用でき、活動の記録とQRコード付きのデジタル証明書（アプリ内で真偽を確認）が残ります。大学の活動奨励制度（例：専修大学の自己啓発奨学生）に申請するときの資料として、期間を選んで活動の記録と証明書をA4・1枚にまとめる「申請用のまとめ」（Webは印刷・PDF保存）を試作しました。大学側の取り扱いは未確認です。アプリが奨学金を出すことはありません（韓国語の詳細は [docs/student-merit.md](docs/student-merit.md)）。
- **リワード残高（デモ）**：企業が課題にかけた賞金（出題時に当社へ預け入れ、最優秀賞のチームへ送金）と、運営からの還元（各期末に運転資金3か月分を残し、その期の経常利益の残りを事前に公開した基準＝受賞・提出などの実績で配分）を、学生が円建ての残高で受け取り、本人確認のうえ銀行口座への出金を申請できます（1回100万円まで）。当社が第二種資金移動業の登録を受けた後に提供する予定の機能で、デモでは実際の送金は行いません。実績はインパクトレベル（換金できません）で表示します（韓国語の詳細は [docs/rewards.md](docs/rewards.md)）。
- **運営者画面（ウェブのみ・デモ）**：利用状況・SNS指標・収支／資金シミュレーションを1か所で確認できます（入力はこのブラウザ内だけに保存され、ログインはありません）。
- **Web（Next.js）＋ モバイル（Expo / React Native）** を1つのリポジトリで管理し、ロジック・文言は共通パッケージを共有。DB設計（PostgreSQL、68テーブル）とER図も含みます。
- Android用デモAPKは[Releases](https://github.com/atome9797/sdgs-compass/releases/tag/demo-latest)、Web版は https://atome9797.github.io/sdgs-compass/ （初回のみ Settings › Pages › Source を「GitHub Actions」に設定）。
- 当サービスの取組みマークは独自の目安であり、国・自治体・国連の認証ではありません。本アプリは国連の承認を受けたものではありません。

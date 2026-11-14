// 게임 제목 「勇者さま、助けてください！」 / 「용사님 구해주세요!」(#37).
// 좁은 화면에서는 「、」 뒤나 띄어쓰기에서만 줄이 바뀌게, 조각마다 한 덩어리(inline-block, 줄바꿈 없음)로 그려요.
import { Fragment } from "react";

/** 「勇者さま、」「助けてください！」 · 「용사님」「구해주세요!」 */
export function titleParts(text: string): string[] {
  return text.split(/(?<=、)|\s+/).filter((part) => part !== "");
}

export function GameTitle({ text }: { text: string }) {
  const parts = titleParts(text);
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 && !parts[index - 1].endsWith("、") ? " " : null}
          <span className="title-part">{part}</span>
        </Fragment>
      ))}
    </>
  );
}

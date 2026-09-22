import { Soup } from "lucide-react";

export default function Loading() {
  return (
    <main className="initial-loading" aria-busy="true" aria-label="메뉴 불러오는 중">
      <span className="brand-symbol"><Soup size={28} aria-hidden="true" /></span>
      <h1>맛있는 점심을 찾고 있어요</h1>
      <p role="status">2판교의 메뉴판을 가져오는 중이에요…</p>
    </main>
  );
}

import "./globals.css";
export const metadata = {
  title: "지아디자인폼 — 나만의 디자인 스튜디오",
  description: "독립 레이어로 만드는 나만의 콘텐츠 디자인",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from 'next';
export const metadata: Metadata = {title:'도형탐구실 · 다면체',description:'다면체 관찰과 정다면체 발견, 학생 탐구 노트 제출'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="ko"><body>{children}</body></html>}

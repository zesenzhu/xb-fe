import { redirect } from 'next/navigation';
import FooterICP from '@/components/layout/FooterICP';

export default function Home() {
  redirect('/admin/dashboard');
  // 如果未来去掉重定向，保留了兜底的结构
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1" />
      <FooterICP />
    </div>
  );
}



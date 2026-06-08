'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function DashboardRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/inventory');
  }, [router]);

  return (
    <div className="db-loading">
      <div className="spin"></div>
    </div>
  );
}

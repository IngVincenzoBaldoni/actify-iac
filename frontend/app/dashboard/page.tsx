'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function DashboardRootPage() {
  const router = useRouter();

  useEffect(() => {
    api.company.get()
      .then((company) => {
        const c = company as { setup_completed?: boolean };
        if (!c.setup_completed) {
          router.replace('/dashboard/settings');
        } else {
          router.replace('/dashboard/inventory');
        }
      })
      .catch(() => router.replace('/dashboard/inventory'));
  }, [router]);

  return (
    <div className="db-loading">
      <div className="spin"></div>
    </div>
  );
}

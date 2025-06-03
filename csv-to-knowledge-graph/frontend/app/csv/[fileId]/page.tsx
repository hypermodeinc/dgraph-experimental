'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CSVPage() {
  const { fileId } = useParams<{ fileId: string }>();
  const router = useRouter();

  useEffect(() => {
    // Redirect to spreadsheet view by default
    router.push(`/csv/${fileId}/spreadsheet`);
  }, [fileId, router]);

  return <div>Redirecting...</div>;
}

import { ReactNode, use } from 'react';
import ClassAdminLayout from '@/components/ClassAdminLayout';

export default function ClassLayout({ 
  children,
  params 
}: { 
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  
  return (
    <ClassAdminLayout classId={id}>
      {children}
    </ClassAdminLayout>
  );
}

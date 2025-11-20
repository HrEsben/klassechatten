import AuthLayout from '@/components/AuthLayout';
import { ReactNode } from 'react';

export default function AuthGroupLayout({ children }: { children: ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}

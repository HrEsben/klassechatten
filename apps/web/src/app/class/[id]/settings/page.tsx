import { ClassSettingsClient } from './ClassSettingsClient';

// Server component - properly awaits params to get full UUID
export default async function ClassSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  console.log('[Settings Server] Full UUID from params:', id);
  
  // Pass the full UUID to the client component
  return <ClassSettingsClient classId={id} />;
}

'use client';

import { useRouter } from 'next/navigation';
import { Users, BookOpen, TriangleAlert, Settings } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();

  const adminSections = [
    {
      id: 'users',
      title: 'Brugere',
      description: 'Administrer brugere',
      icon: <Users className="w-8 h-8 stroke-current text-primary" strokeWidth={2} />,
     
      color: 'primary',
      path: '/admin/users',
    },
    {
      id: 'classes',
      title: 'Klasser',
      description: 'Administrer klasser',
      icon: <BookOpen className="w-8 h-8 stroke-current text-secondary" strokeWidth={2} />,
     
      color: 'secondary',
      path: '/admin/classes',
    },
    {
      id: 'moderation',
      title: 'Moderation',
      description: 'Rapporter & flagging',
      icon: <TriangleAlert className="w-8 h-8 stroke-current text-warning" strokeWidth={2} />,
     
      color: 'warning',
      path: '/admin/flagged-messages',
    },
    {
      id: 'settings',
      title: 'Indstillinger',
      description: 'System konfiguration',
      icon: <Settings className="w-8 h-8 stroke-current text-accent" strokeWidth={2} />,
     
      color: 'accent',
      path: '/admin/settings',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-base-content">
          Admin Dashboard
        </h1>
        <div className="h-1 w-24 bg-primary mt-2"></div>
      </div>

      {/* Navigation Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {adminSections.map((section) => (
          <button
            key={section.id}
            onClick={() => router.push(section.path)}
            className="relative group text-left bg-base-100 border-2 border-base-content/10 hover:border-primary/50 transition-all duration-200 overflow-hidden"
          >
            {/* Accent bar */}
            <div className="absolute left-0 top-0 w-1 h-full bg-primary/30 group-hover:bg-primary group-hover:w-2 transition-all duration-200"></div>
            
            <div className="px-8 py-6 pl-10">
              <div className="flex items-start justify-between mb-3">
                {section.icon}
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-1">
                {section.title}
              </h3>
              <p className="text-xs font-mono uppercase tracking-wider text-base-content/50">
                {section.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

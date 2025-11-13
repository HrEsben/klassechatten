'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  classData?: {
    name: string;
    school_name?: string;
  };
}

export default function Breadcrumbs({ items, classData }: BreadcrumbsProps) {
  const pathname = usePathname();

  // Auto-generate breadcrumbs from pathname if items not provided
  const breadcrumbItems = items || generateBreadcrumbs(pathname, classData);

  return (
    <div className="breadcrumbs text-sm mb-4">
      <ul>
        {breadcrumbItems.map((item, index) => (
          <li key={index}>
            {item.href ? (
              <Link href={item.href} className="text-base-content/60 hover:text-primary">
                {item.label}
              </Link>
            ) : (
              <span className="font-bold text-base-content">{item.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function generateBreadcrumbs(pathname: string, classData?: { name: string; school_name?: string }): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  
  // Start with Forside linking to homepage
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Forside', href: '/' }
  ];

  // Build breadcrumb trail, skipping 'admin' segment
  let currentPath = '';
  segments.forEach((segment, index) => {
    // Skip 'admin' since we already have Forside at the root
    if (segment === 'admin') {
      currentPath += `/${segment}`;
      return;
    }
    
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;
    
    // Map segment names to Danish labels
    let label = getLabelForSegment(segment);
    
    // If this is a UUID and we have class data, use the class name
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(segment) && classData) {
      label = classData.school_name 
        ? `${classData.name} (${classData.school_name})`
        : classData.name;
    }
    
    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath
    });
  });

  return breadcrumbs;
}

function getLabelForSegment(segment: string): string {
  // Map common segments to Danish labels
  const labelMap: Record<string, string> = {
    'admin': 'Administration',
    'users': 'Brugere',
    'classes': 'Klasser',
    'moderation': 'Moderation',
    'settings': 'Indstillinger',
  };

  // If it's a UUID (class ID), return generic label
  if (segment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return 'Detaljer';
  }

  return labelMap[segment] || segment;
}

import { getUserClasses } from '@/lib/cached-queries';
import { getUserProfile } from '@/lib/cached-queries';

interface CachedClassRoomBrowserProps {
  userId: string;
  children?: React.ReactNode;
}

/**
 * Server component that pre-renders the class list
 * Uses cached functions to provide fast initial load
 */
export default async function CachedClassRoomBrowser({ userId, children }: CachedClassRoomBrowserProps) {
  try {
    // These are cached server-side function calls
    const [classes, profile] = await Promise.all([
      getUserClasses(userId),
      getUserProfile(userId),
    ]);

    if (classes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-base-100/80 text-center px-6">
          <div className="mb-6">
            <div className="w-16 h-0.5 bg-primary/40 mx-auto mb-4"></div>
            <h2 className="text-2xl font-light tracking-wide text-base-content mb-4">No classes found</h2>
            <p className="text-base-content/60 font-light max-w-md">
              You&apos;re not a member of any classes yet. Ask your teacher for an invitation code.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-light tracking-wide text-base-content mb-2">
            Welcome back{profile?.display_name ? `, ${profile.display_name}` : ''}
          </h1>
          <p className="text-base-content/60 font-light">Choose a class to continue your conversation</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((classData) => (
            <div key={classData.id} className="card bg-base-100 shadow-lg border border-base-300">
              <div className="card-body p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="card-title text-lg font-semibold text-primary">
                      {classData.label}
                    </h3>
                    <p className="text-sm text-base-content/60 mt-1">
                      {classData.grade_level}. klasse
                      {classData.school_name && ` • ${classData.school_name}`}
                    </p>
                  </div>
                  <div className="badge badge-primary badge-outline">
                    {classData.rooms.length} {classData.rooms.length === 1 ? 'room' : 'rooms'}
                  </div>
                </div>

                <div className="space-y-2">
                  {classData.rooms.map((room) => (
                    <div
                      key={room.id}
                      className="flex items-center justify-between p-3 bg-base-200/50 hover:bg-base-200 transition-colors border-2 border-transparent hover:border-primary/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-success"></div>
                        <span className="font-medium text-base-content">{room.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {room.is_locked && (
                          <div className="w-4 h-4 text-warning" title="Locked room">
                            🔒
                          </div>
                        )}
                        <div className="text-sm text-base-content/60">
                          {room.type === 'general' ? 'General' : 'Topic'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic content can be rendered here */}
        {children}
      </div>
    );
  } catch (error) {
    console.error('Error in CachedClassRoomBrowser:', error);
    return (
      <div className="flex justify-center items-center min-h-screen bg-base-100/80">
        <div className="bg-error/10 border border-error/20 px-6 py-4 font-mono text-error text-sm">
          Error: {error instanceof Error ? error.message : 'Failed to load classes'}
        </div>
      </div>
    );
  }
}
import { getRoomMessages, getRoomInfo } from '@/lib/cached-queries';

interface CachedChatRoomProps {
  roomId: string;
  userId: string;
  children?: React.ReactNode;
}

/**
 * Server component that pre-renders initial chat messages
 * Uses cached functions for fast initial load, then client components take over for real-time updates
 */
export default async function CachedChatRoom({ roomId, userId: _userId, children }: CachedChatRoomProps) {
  try {
    // These are cached server-side function calls
    const [messages, roomInfo] = await Promise.all([
      getRoomMessages(roomId, 50),
      getRoomInfo(roomId),
    ]);

    return (
      <div className="flex flex-col h-full bg-base-100">
        {/* Room header */}
        <div className="bg-base-200 border-b border-base-300 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">{roomInfo.name}</h2>
            <p className="text-sm text-base-content/60">
              {roomInfo.classes?.label} • {roomInfo.classes?.grade_level}. klasse
              {roomInfo.classes?.schools?.name && ` • ${roomInfo.classes.schools.name}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {roomInfo.is_locked && (
              <div className="badge badge-warning">Locked</div>
            )}
            <div className="badge badge-outline">{roomInfo.type}</div>
          </div>
        </div>

        {/* Messages container - initial server-rendered content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-base-content/60 py-8">
                <p className="text-lg mb-2">No messages yet</p>
                <p className="text-sm">Be the first to start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="chat chat-start">
                  <div className="chat-image avatar">
                    <div className="w-10 rounded-full">
                      {message.profiles?.avatar_url ? (
                        <img
                          alt={message.profiles.display_name || 'User'}
                          src={message.profiles.avatar_url}
                        />
                      ) : (
                        <div 
                          className="w-full h-full rounded-full flex items-center justify-center text-white font-semibold"
                          style={{ 
                            backgroundColor: message.profiles?.avatar_color || '#6366f1' 
                          }}
                        >
                          {(message.profiles?.display_name || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="chat-header">
                    {message.profiles?.display_name || 'Unknown User'}
                    <time className="text-xs opacity-50 ml-2">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </time>
                  </div>
                  <div className="chat-bubble">
                    {message.body && <p>{message.body}</p>}
                    {message.image_url && (
                      <img 
                        src={message.image_url} 
                        alt="Message attachment"
                        className="max-w-xs mt-2"
                      />
                    )}
                    {message.edited_at && (
                      <p className="text-xs opacity-70 mt-1 italic">Edited</p>
                    )}
                  </div>
                  {message.read_receipts && message.read_receipts.length > 0 && (
                    <div className="chat-footer opacity-50">
                      Read by {message.read_receipts.length} user(s)
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Dynamic content placeholder - client components will mount here */}
          <div id="dynamic-chat-content">
            {children}
          </div>
        </div>

        {/* Message input area - will be replaced by client component */}
        <div className="border-t border-base-300 p-4 bg-base-200">
          <div className="text-sm text-base-content/60 text-center">
            Loading real-time chat interface...
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error in CachedChatRoom:', error);
    return (
      <div className="flex justify-center items-center h-full">
        <div className="bg-error/10 border border-error/20 px-6 py-4 font-mono text-error text-sm">
          Error: {error instanceof Error ? error.message : 'Failed to load chat room'}
        </div>
      </div>
    );
  }
}
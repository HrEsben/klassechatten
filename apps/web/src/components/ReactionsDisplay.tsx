'use client';

interface ReactionGroup {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

interface ReactionsDisplayProps {
  reactions: ReactionGroup[];
  onToggle: (emoji: string) => void;
  onAddClick?: (event: React.MouseEvent) => void;
}

export default function ReactionsDisplay({ 
  reactions, 
  onToggle, 
  onAddClick 
}: ReactionsDisplayProps) {
  if (reactions.length === 0 && !onAddClick) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 items-center bg-base-100/95 backdrop-blur-sm border-2 border-base-content/10 shadow-lg px-2 py-1">
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => onToggle(reaction.emoji)}
          className={`
            btn btn-xs gap-1 px-2 h-6 min-h-6
            transition-all duration-200
            ${
              reaction.hasReacted
                ? 'bg-primary/30 border-primary hover:bg-primary/40 text-base-content'
                : 'btn-ghost hover:bg-base-200 text-base-content/80'
            }
          `}
          title={`${reaction.count} reaktion${reaction.count > 1 ? 'er' : ''}`}
        >
          <span className="text-sm leading-none">{reaction.emoji}</span>
          <span className="text-xs font-bold leading-none">{reaction.count}</span>
        </button>
      ))}
      
      {onAddClick && (
        <button
          onClick={onAddClick}
          className="btn btn-ghost btn-xs btn-square h-6 w-6 min-h-6 hover:bg-base-200"
          title="Tilføj reaktion"
        >
          <svg
            className="w-4 h-4 stroke-current text-base-content/60"
            strokeWidth={2}
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" strokeLinecap="square" strokeLinejoin="miter" />
            <path strokeLinecap="square" strokeLinejoin="miter" d="M12 8v8m-4-4h8" />
          </svg>
        </button>
      )}
    </div>
  );
}

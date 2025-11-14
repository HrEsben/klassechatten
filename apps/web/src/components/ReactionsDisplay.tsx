'use client';

import { useState } from 'react';
import NotoEmoji from './NotoEmoji';
import type { ReactionGroup } from '../hooks/useReactions';

interface ReactionsDisplayProps {
  reactions: ReactionGroup[];
  onToggle: (emoji: string) => void;
}

export default function ReactionsDisplay({ 
  reactions, 
  onToggle
}: ReactionsDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (reactions.length === 0) {
    return null;
  }

  const MAX_VISIBLE = 3;
  const visibleReactions = isExpanded ? reactions : reactions.slice(0, MAX_VISIBLE);
  const hiddenCount = reactions.length - MAX_VISIBLE;

  return (
    <div className="flex flex-wrap gap-0.5 items-center">
      {visibleReactions.map((reaction) => {
        return (
          <div key={reaction.emoji} className="relative inline-block">
            <button
              onClick={() => onToggle(reaction.emoji)}
              className={`
                peer relative
                flex items-center gap-1 px-1.5 h-5
                border transition-all duration-150
                animate-in fade-in zoom-in-95
                ${
                  reaction.hasReacted
                    ? 'bg-primary/5 border-primary/20 text-base-content hover:bg-primary/10 hover:scale-105'
                    : 'bg-transparent border-base-content/5 text-base-content/60 hover:border-base-content/10 hover:bg-base-200/20 hover:scale-105'
                }
              `}
            >
              <NotoEmoji emoji={reaction.emoji} size={14} />
              <span className="text-[10px] font-bold leading-none text-base-content/40">{reaction.count}</span>
            </button>
            
            {/* Custom Berlin Edgy Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 invisible peer-hover:opacity-100 peer-hover:visible transition-all duration-200 z-50 pointer-events-none">
              <div className="bg-base-content text-base-100 px-3 py-2 border-2 border-base-content shadow-lg whitespace-nowrap">
                <div className="flex items-center gap-2 mb-1">
                  <NotoEmoji emoji={reaction.emoji} size={18} />
                  <span className="text-xs font-black uppercase tracking-wider">
                    × {reaction.count}
                  </span>
                </div>
                <div className="text-xs font-medium opacity-90">
                  {reaction.userNames.join(', ')}
                </div>
              </div>
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-base-content"></div>
            </div>
          </div>
        );
      })}
      
      {hiddenCount > 0 && !isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="text-xs text-base-content/50 hover:text-base-content/70 font-medium px-1 transition-colors cursor-pointer"
        >
          +{hiddenCount}
        </button>
      )}
      
      {isExpanded && reactions.length > MAX_VISIBLE && (
        <button
          onClick={() => setIsExpanded(false)}
          className="text-xs text-base-content/50 hover:text-base-content/70 font-medium px-1 transition-colors cursor-pointer"
        >
          vis mindre
        </button>
      )}
    </div>
  );
}

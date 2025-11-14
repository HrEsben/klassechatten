import React from 'react';
import { useReactions } from '../hooks/useReactions';
import ReactionPicker from './ReactionPicker';

interface ReactionPickerWithHookProps {
  visible: boolean;
  messageId: number;
  currentUserId?: string;
  onClose: () => void;
}

export default function ReactionPickerWithHook({
  visible,
  messageId,
  currentUserId,
  onClose,
}: ReactionPickerWithHookProps) {
  const { toggleReaction } = useReactions({
    messageId,
    currentUserId,
    enabled: visible,
  });

  const handleSelect = (emoji: string) => {
    toggleReaction(emoji);
    onClose();
  };

  return (
    <ReactionPicker
      visible={visible}
      onSelect={handleSelect}
      onClose={onClose}
    />
  );
}

import React from 'react';
import ReactionPicker from './ReactionPicker';

interface ReactionPickerWithHookProps {
  visible: boolean;
  messageId: number;
  currentUserId?: string;
  onReaction: (emoji: string) => void | Promise<void>;
  onClose: () => void;
}

export default function ReactionPickerWithHook({
  visible,
  messageId,
  currentUserId,
  onReaction,
  onClose,
}: ReactionPickerWithHookProps) {
  const handleSelect = (emoji: string) => {
    onReaction(emoji);
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

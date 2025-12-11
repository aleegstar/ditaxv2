
import { useAutoOpenChat } from '@/hooks/useAutoOpenChat';

export const AutoChatHandler: React.FC = () => {
  useAutoOpenChat();
  return null; // This component just handles the logic, no UI
};

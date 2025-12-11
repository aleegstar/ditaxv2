
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { Send } from 'lucide-react';

interface ChatInputProps {
  selectedUserId: string;
  isAdmin: boolean;
  onMessageSent?: () => void;
}

const ChatInput = ({ selectedUserId, isAdmin, onMessageSent }: ChatInputProps) => {
  const { userId, isValid } = useAuthValidation();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const sendMessage = async () => {
    if (!message.trim() || !isValid || !userId || sending) return;

    setSending(true);
    try {
      console.log('Sending message:', { 
        from: userId, 
        to: selectedUserId, 
        isAdmin, 
        message: message.trim() 
      });

      let messageData;
      
      if (isAdmin) {
        // Admin sending message
        if (selectedUserId === 'admin-chat') {
          // Admin broadcasting to all users
          messageData = {
            content: message.trim(),
            sender_id: userId,
            recipient_id: null, // Broadcast to all
            chat_type: 'direct'
          };
        } else {
          // Admin sending to specific user
          messageData = {
            content: message.trim(),
            sender_id: userId,
            recipient_id: selectedUserId,
            chat_type: 'direct'
          };
        }
      } else {
        // Regular user sending message to admin - find admin first
        const { data: adminData } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin')
          .limit(1)
          .single();

        const adminId = adminData?.user_id;
        
        messageData = {
          content: message.trim(),
          sender_id: userId,
          recipient_id: adminId || null, // Send to admin if found
          chat_type: 'direct'
        };
      }

      console.log('Message data being sent:', messageData);

      const { error } = await supabase
        .from('chat_messages')
        .insert([messageData]);

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }

      setMessage('');
      onMessageSent?.();
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Fehler",
        description: "Nachricht konnte nicht gesendet werden",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isValid) return null;

  return (
    <div className="p-4">
      <div className="flex items-center space-x-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Nachricht eingeben..."
          disabled={sending}
          className="flex-1"
        />
        <Button
          onClick={sendMessage}
          disabled={!message.trim() || sending}
          size="sm"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;


import React from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Download, FileText, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ChatBubbleProps {
  message: {
    id: string;
    content: string | null;
    sender_id: string;
    created_at: string;
    attachment_id?: string | null;
  };
  attachment?: {
    id: string;
    file_name: string;
    file_type: string;
    file_path: string;
  } | null;
  senderName: string;
  senderAvatarUrl?: string;
  isOwnMessage: boolean;
}

const ChatBubble = ({ message, attachment, senderName, senderAvatarUrl, isOwnMessage }: ChatBubbleProps) => {
  const handleDownloadAttachment = async () => {
    if (!attachment) return;
    
    try {
      const { data, error } = await supabase.storage
        .from('chat_attachments')
        .download(attachment.file_path);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const isImage = attachment?.file_type.startsWith('image/');
  const isPdf = attachment?.file_type === 'application/pdf';
  
  const hasContent = message.content && message.content.trim();
  const hasAttachment = attachment;

  const getSenderInitials = () => {
    return senderName.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className={`flex gap-3 mb-4 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage 
          src={senderAvatarUrl} 
          alt={senderName}
          className="object-cover"
        />
        <AvatarFallback className="bg-muted text-muted-foreground text-sm">
          {getSenderInitials()}
        </AvatarFallback>
      </Avatar>
      
      <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {/* Text Bubble */}
        {hasContent && (
          <div 
            className={`rounded-2xl px-4 py-3 ${
              isOwnMessage 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-foreground'
            } shadow-sm`}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
        )}
        
        {/* Attachment Bubble */}
        {hasAttachment && (
          <div 
            className={`rounded-2xl ${
              isImage ? 'p-1' : 'px-3 py-2'
            } ${
              isOwnMessage 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-foreground'
            } shadow-sm`}
          >
            {isImage ? (
              <div className="relative">
                <img 
                  src={`${supabase.storage.from('chat_attachments').getPublicUrl(attachment.file_path).data.publicUrl}`}
                  alt={attachment.file_name}
                  className="max-w-full h-auto rounded-xl cursor-pointer max-h-80 object-cover"
                  onClick={handleDownloadAttachment}
                />
                <Button
                  onClick={handleDownloadAttachment}
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-2 right-2 opacity-75 hover:opacity-100"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ) : isPdf ? (
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm flex-1 truncate">{attachment.file_name}</span>
                <Button
                  onClick={handleDownloadAttachment}
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm flex-1 truncate">{attachment.file_name}</span>
                <Button
                  onClick={handleDownloadAttachment}
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
        
        {/* Sender info - only show after the last bubble */}
        <div className={`text-xs text-muted-foreground mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
          <span className="font-medium">{senderName}</span>
          <span className="ml-2">
            {format(new Date(message.created_at), 'HH:mm', { locale: de })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;

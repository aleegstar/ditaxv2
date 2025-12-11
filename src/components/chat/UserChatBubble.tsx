
import React from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Download, FileText, Image, Check, CheckCheck } from 'lucide-react';
import { ChatMessage } from '@/components/ui/chat-card';

interface UserChatBubbleProps {
  message: ChatMessage;
  senderAvatarUrl?: string;
  onDownloadFile?: (filePath: string, fileName: string, attachmentId?: string) => void;
}

const UserChatBubble: React.FC<UserChatBubbleProps> = ({
  message,
  senderAvatarUrl,
  onDownloadFile
}) => {
  const isCurrentUser = message.isCurrentUser;
  const attachment = message.attachment;

  const handleDownloadAttachment = () => {
    if (!attachment || !onDownloadFile) return;
    onDownloadFile(attachment.file_path, attachment.file_name, attachment.id);
  };

  const isImage = attachment?.file_type.startsWith('image/');
  const isPdf = attachment?.file_type === 'application/pdf';
  
  const hasContent = message.content && message.content.trim();
  const hasAttachment = attachment;

  const getSenderInitials = () => {
    return (message.senderName || 'U').split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const getMessageStatus = () => {
    if (!isCurrentUser) return null;
    
    if (message.read) {
      return <CheckCheck className="w-4 h-4 text-blue-500" />;
    }
    return <Check className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className={`flex gap-3 mb-4 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar className="h-8 w-8 flex-shrink-0 border border-gray-300">
        <AvatarImage 
          src={senderAvatarUrl} 
          alt={message.senderName || 'User'}
          className="object-cover"
        />
        <AvatarFallback className="bg-gray-200 text-gray-700 text-sm">
          {getSenderInitials()}
        </AvatarFallback>
      </Avatar>
      
      <div className={`max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {/* Text Bubble */}
        {hasContent && (
          <div 
            className={`rounded-3xl px-4 py-3 break-words ${
              isCurrentUser 
                ? 'text-black'
                : 'bg-gray-200 text-gray-800'
            }`}
            style={{
              backgroundColor: isCurrentUser ? '#CEDAFF' : undefined
            }}
          >
            <p className={`text-sm whitespace-pre-wrap ${isCurrentUser ? 'text-black' : 'text-gray-700'}`}>{message.content}</p>
          </div>
        )}
        
        {/* Attachment Bubble */}
        {hasAttachment && (
          <div 
            className={`rounded-3xl ${
              isImage ? 'p-1' : 'px-3 py-2'
            } ${
              isCurrentUser 
                ? 'text-black'
                : 'bg-gray-200 text-gray-800'
            }`}
            style={{
              backgroundColor: isCurrentUser ? '#CEDAFF' : undefined
            }}
          >
            {isImage ? (
              <div className="relative">
                <div className="rounded-xl p-2">
                  <div className="flex items-center gap-2">
                    <Image className={`h-5 w-5 flex-shrink-0 ${isCurrentUser ? 'text-black' : 'text-gray-700'}`} />
                    <span className={`text-sm flex-1 truncate ${isCurrentUser ? 'text-black' : 'text-gray-700'}`}>{attachment.file_name}</span>
                  </div>
                </div>
                <Button
                  onClick={handleDownloadAttachment}
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ) : isPdf ? (
              <div className="flex items-center gap-2">
                <FileText className={`h-5 w-5 flex-shrink-0 ${isCurrentUser ? 'text-black' : 'text-gray-700'}`} />
                <span className={`text-sm flex-1 truncate ${isCurrentUser ? 'text-black' : 'text-gray-700'}`}>{attachment.file_name}</span>
                <Button
                  onClick={handleDownloadAttachment}
                  variant="ghost"
                  size="sm"
                  className={`flex-shrink-0 ${isCurrentUser ? 'text-black hover:bg-black/10' : 'text-gray-700 hover:bg-gray-300/30'}`}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <FileText className={`h-5 w-5 flex-shrink-0 ${isCurrentUser ? 'text-black' : 'text-gray-700'}`} />
                <span className={`text-sm flex-1 truncate ${isCurrentUser ? 'text-black' : 'text-gray-700'}`}>{attachment.file_name}</span>
                <Button
                  onClick={handleDownloadAttachment}
                  variant="ghost"
                  size="sm"
                  className={`flex-shrink-0 ${isCurrentUser ? 'text-black hover:bg-black/10' : 'text-gray-700 hover:bg-gray-300/30'}`}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
        
        {/* Message info */}
        <div className={`flex items-center gap-2 mt-1 text-xs ${isCurrentUser ? 'justify-end text-gray-600' : 'justify-start text-gray-600'}`}>
          <span className="font-medium text-gray-800">{message.senderName}</span>
          <span className="text-gray-500">{format(message.created_at, 'HH:mm', { locale: de })}</span>
          {getMessageStatus()}
        </div>
      </div>
    </div>
  );
};

export default UserChatBubble;

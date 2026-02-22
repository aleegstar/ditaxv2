import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, File, Check, CheckCheck } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChatAttachment from '@/components/chat/ChatAttachment';
export interface ChatMessage {
  id: string;
  content?: string;
  sender_id: string;
  recipient_id?: string;
  created_at: Date;
  read?: boolean;
  attachment?: {
    id: string;
    file_name: string;
    file_type: string;
    file_path: string;
    original_size: number;
    encrypted?: boolean;
  };
  senderName?: string;
  isCurrentUser?: boolean;
}
interface ChatCardProps {
  messages: ChatMessage[];
  currentUserId: string;
  recipientName?: string;
  onSendMessage: (content: string, file?: File) => void;
  onDownloadFile?: (filePath: string, fileName: string, attachmentId?: string) => void;
  loading?: boolean;
  className?: string;
}
export function ChatCard({
  messages,
  currentUserId,
  recipientName = "Chat",
  onSendMessage,
  onDownloadFile,
  loading = false,
  className
}: ChatCardProps) {
  const [inputValue, setInputValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages]);
  const handleSendMessage = async () => {
    if (!inputValue.trim() && !selectedFile || uploading) return;
    setUploading(true);
    try {
      await onSendMessage(inputValue.trim(), selectedFile || undefined);
      setInputValue('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setUploading(false);
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type - only images and PDFs
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];
    if (!allowedTypes.includes(file.type) && !(ext && allowedExtensions.includes(ext))) {
      alert('Nur Bilder (JPEG, PNG, GIF, WebP) und PDFs sind erlaubt.');
      return;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Die Datei darf maximal 10MB groß sein.');
      return;
    }
    setSelectedFile(file);
  };
  const handleFileClick = () => {
    fileInputRef.current?.click();
  };
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false
    });
  };
  const getMessageStatus = (message: ChatMessage) => {
    if (message.sender_id !== currentUserId) return null;
    if (message.read) {
      return <CheckCheck className="w-4 h-4 text-blue-500" />;
    }
    return <Check className="w-4 h-4 text-gray-400" />;
  };
  return <div className={cn("flex flex-col h-full", className)}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-[180px] md:pb-4">
        {loading ? <div className="flex justify-center items-center h-64 text-white/70">
            Nachrichten werden geladen...
          </div> : messages.length === 0 ? <div className="flex justify-center items-center h-64 text-white/70 text-center">
            <div>
              <p className="text-lg font-medium mb-2">Keine Nachrichten vorhanden</p>
              <p className="text-sm">Starte die Unterhaltung!</p>
            </div>
          </div> : messages.map(message => {
        const isCurrentUser = message.sender_id === currentUserId;
        return <div key={message.id} className={cn("flex items-start gap-3", isCurrentUser ? "justify-end" : "justify-start")}>
                {!isCurrentUser && <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-medium text-white">
                    {message.senderName?.charAt(0)?.toUpperCase() || 'U'}
                  </div>}
                
                <div className={cn("max-w-[70%] min-w-0", isCurrentUser ? "order-first" : "")}>
                  <div className={cn("rounded-2xl px-4 py-3 break-words", isCurrentUser ? "text-white rounded-br-md" : "text-white rounded-bl-md backdrop-blur-sm")} style={{
              backgroundColor: isCurrentUser ? '#1d64ff57' : 'rgba(232, 229, 229, 0.68)'
            }}>
                    {message.content && <p className="whitespace-pre-wrap text-white">{message.content}</p>}
                    
                    {message.attachment && <div className="mt-2">
                        <ChatAttachment attachmentId={message.attachment.id} fileName={message.attachment.file_name} fileType={message.attachment.file_type} originalSize={message.attachment.original_size} userId={currentUserId} isCurrentUser={isCurrentUser} />
                      </div>}
                  </div>
                  
                  <div className={cn("flex items-center gap-2 mt-1 text-xs text-white/60", isCurrentUser ? "justify-end" : "justify-start")}>
                    <span className="text-zinc-500">{formatTimestamp(message.created_at)}</span>
                    {getMessageStatus(message)}
                  </div>
                </div>

                {isCurrentUser && <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium" style={{
            backgroundColor: '#1d64ff57'
          }}>
                    {message.senderName?.charAt(0)?.toUpperCase() || 'S'}
                  </div>}
              </div>;
      })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Fixed at bottom on mobile */}
      <div className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto bg-white/95 backdrop-blur-md border-t border-gray-200 md:border-white/20 md:bg-transparent md:backdrop-blur-none z-50">
        {/* File Preview */}
        {selectedFile && <div className="p-3 bg-gray-50 md:bg-white/5 md:backdrop-blur-sm border-b border-gray-200 md:border-white/10">
            <div className="flex items-center gap-3 bg-gray-100 md:bg-white/10 rounded-lg p-2">
              <File className="h-4 w-4 text-gray-600 md:text-white" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 md:text-white truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 md:text-white/60">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button onClick={() => setSelectedFile(null)} className="text-gray-500 hover:text-gray-700 md:text-white/60 md:hover:text-white text-sm" type="button">
                ✕
              </button>
            </div>
          </div>}

        <div className="p-4 pb-6 md:pb-4">
          <div className="flex gap-2 items-end p-3 transition-all duration-200 backdrop-blur-[25px] border border-gray-200 md:border-white shadow-lg shadow-black/5 md:shadow-black/10" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px'
        }}>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,.pdf" className="hidden" />
            
            <Button type="button" variant="ghost" size="icon" onClick={handleFileClick} disabled={uploading} className="hover:bg-gray-100 md:hover:bg-white/10 shrink-0 text-gray-600 md:text-[#333333]">
              <Paperclip className="h-5 w-5" />
            </Button>

            <Input value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Schreibe eine Nachricht..." disabled={uploading} className="flex-1 bg-transparent border-none text-gray-900 md:text-white placeholder:text-gray-500 md:placeholder:text-white/50 focus-visible:ring-0 focus-visible:ring-offset-0 text-base py-2" onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }} />
            
            <Button onClick={handleSendMessage} size="icon" disabled={!inputValue.trim() && !selectedFile || uploading} className="shrink-0 bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white">
              <Send className="h-5 w-5" />
            </Button>
          </div>
          
          <p className="text-center mt-2 text-xs text-gray-400">
            Ditax AI kann Fehler machen. Überprüfe wichtige Infos.
          </p>
        </div>
      </div>
    </div>;
}
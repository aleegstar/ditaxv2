import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, File } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSearchParams } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import { toast } from "@/components/ui/use-toast";
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface Message {
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
  };
}

interface ChatMessageRecord {
  id: string;
  content: string | null;
  sender_id: string;
  recipient_id: string | null;
  created_at: string;
  read: boolean | null;
  attachment_id: string | null;
  [key: string]: any;
}

type RealtimePayload = RealtimePostgresChangesPayload<ChatMessageRecord>;

interface ChatWindowProps {
  selectedUserId?: string;
  isAdmin?: boolean;
  fullWidth?: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  selectedUserId: propUserId, 
  isAdmin = false, 
  fullWidth = false 
}) => {
  const [searchParams] = useSearchParams();
  const urlUserId = searchParams.get('userId');
  
  const selectedUserId = urlUserId || propUserId;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<{ id: string; isAdmin: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [recipientName, setRecipientName] = useState<string>('');

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('ChatWindow: Getting user session:', session.user.id);

          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .single();

          if (roleError && roleError.code !== 'PGRST116') {
            console.error('ChatWindow: Error fetching user role:', roleError);
          }

          const isAdmin = roleData?.role === 'admin';
          console.log('ChatWindow: User role check:', { roleData, isAdmin });

          setCurrentUser({ id: session.user.id, isAdmin });
        }
      } catch (error) {
        console.error('ChatWindow: Error fetching current user:', error);
        toast({
          title: "Fehler",
          description: "Benutzerinformationen konnten nicht geladen werden",
          variant: "destructive",
        });
      }
    };

    getCurrentUser();
  }, []);

  // Fetch recipient name
  useEffect(() => {
    const fetchRecipientName = async () => {
      if (selectedUserId) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', selectedUserId)
            .single();

          if (error) {
            console.error('Error fetching recipient name:', error);
            return;
          }

          setRecipientName(data.first_name && data.last_name 
            ? `${data.first_name} ${data.last_name}` 
            : 'User');
        } catch (error) {
          console.error('Error fetching recipient name:', error);
        }
      }
    };

    fetchRecipientName();
  }, [selectedUserId]);

  // Fetch messages with simplified logic
  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentUser) return;

      setLoading(true);
      try {
        console.log('ChatWindow: Fetching messages for user:', currentUser.id, 'selectedUserId:', selectedUserId);

        let query = supabase.from('chat_messages')
          .select(`
            id, 
            content, 
            sender_id, 
            recipient_id, 
            created_at, 
            read,
            chat_attachments(id, file_name, file_type, file_path)
          `)
          .order('created_at', { ascending: true });

        if (selectedUserId) {
          // Direct messages between current user and selected user
          query = query.or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},recipient_id.eq.${currentUser.id})`);
        } else {
          // General chat messages (recipient_id is null)
          query = query.is('recipient_id', null);
        }

        const { data, error } = await query;

        if (error) {
          console.error('ChatWindow: Error fetching messages:', error);
          throw error;
        }

        console.log('ChatWindow: Fetched messages:', data);

        const formattedMessages = data.map(msg => ({
          id: msg.id,
          content: msg.content,
          sender_id: msg.sender_id,
          recipient_id: msg.recipient_id,
          created_at: new Date(msg.created_at),
          read: msg.read,
          attachment: msg.chat_attachments && msg.chat_attachments.length > 0 ? {
            id: msg.chat_attachments[0].id,
            file_name: msg.chat_attachments[0].file_name,
            file_type: msg.chat_attachments[0].file_type,
            file_path: msg.chat_attachments[0].file_path,
          } : undefined
        }));

        setMessages(formattedMessages);

        // Mark received messages as read
        const unreadMsgIds = data
          .filter(msg => msg.recipient_id === currentUser.id && !msg.read)
          .map(msg => msg.id);

        if (unreadMsgIds.length > 0) {
          console.log('ChatWindow: Marking messages as read:', unreadMsgIds);
          await supabase
            .from('chat_messages')
            .update({ read: true })
            .in('id', unreadMsgIds);
        }
      } catch (error) {
        console.error('ChatWindow: Error fetching messages:', error);
        toast({
          title: "Fehler",
          description: "Konnte Nachrichten nicht abrufen",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Set up realtime subscription
    if (currentUser) {
      console.log('ChatWindow: Setting up realtime subscription');
      
      const channel = supabase
        .channel('chat_messages_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_messages'
          },
          async (payload: RealtimePayload) => {
            console.log('ChatWindow: Realtime message received:', payload);
            
            if (!payload.new || typeof payload.new !== 'object') {
              return;
            }
            
            const newMsg = payload.new as ChatMessageRecord;
            
            // Check if this message belongs to the current chat
            const belongsToChat = selectedUserId 
              ? (newMsg.sender_id === currentUser.id && newMsg.recipient_id === selectedUserId) || 
                (newMsg.sender_id === selectedUserId && newMsg.recipient_id === currentUser.id)
              : newMsg.recipient_id === null;

            if (belongsToChat) {
              // Get attachment info if present
              let attachment;
              if (newMsg.attachment_id) {
                const { data } = await supabase
                  .from('chat_attachments')
                  .select('id, file_name, file_type, file_path')
                  .eq('id', newMsg.attachment_id)
                  .single();
                
                if (data) {
                  attachment = {
                    id: data.id,
                    file_name: data.file_name,
                    file_type: data.file_type,
                    file_path: data.file_path,
                  };
                }
              }

              // Mark as read if current user is recipient
              if (newMsg.recipient_id === currentUser.id) {
                await supabase
                  .from('chat_messages')
                  .update({ read: true })
                  .eq('id', newMsg.id);
              }

              setMessages(prev => {
                if (prev.some(msg => msg.id === newMsg.id)) {
                  return prev.map(msg => 
                    msg.id === newMsg.id 
                      ? { 
                          ...msg, 
                          read: newMsg.recipient_id === currentUser.id ? true : msg.read,
                          attachment
                        } 
                      : msg
                  );
                }
                return [...prev, {
                  id: newMsg.id,
                  content: newMsg.content || undefined,
                  sender_id: newMsg.sender_id,
                  recipient_id: newMsg.recipient_id || undefined,
                  created_at: new Date(newMsg.created_at),
                  read: newMsg.recipient_id === currentUser.id ? true : newMsg.read || false,
                  attachment
                }];
              });
            }
          }
        )
        .subscribe();
      
      return () => {
        console.log('ChatWindow: Cleaning up realtime subscription');
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser, selectedUserId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !currentUser) return;

    try {
      setUploading(true);
      let attachmentId = null;

      console.log('ChatWindow: Sending message:', { content: newMessage, hasFile: !!selectedFile });

      // Upload file if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${currentUser.id}/${fileName}`;

        console.log('ChatWindow: Uploading file:', filePath);

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('chat_attachments')
          .upload(filePath, selectedFile);

        if (uploadError) {
          console.error('ChatWindow: File upload error:', uploadError);
          throw uploadError;
        }

        // Create attachment record
        const { data: attachmentData, error: attachmentError } = await supabase
          .from('chat_attachments')
          .insert({
            file_name: selectedFile.name,
            file_path: filePath,
            file_type: selectedFile.type,
            file_size: selectedFile.size,
            uploaded_by: currentUser.id
          })
          .select()
          .single();

        if (attachmentError) {
          console.error('ChatWindow: Attachment record error:', attachmentError);
          throw attachmentError;
        }
        
        attachmentId = attachmentData.id;
        console.log('ChatWindow: Attachment created:', attachmentId);
      }

      // Create message
      const messageData = {
        content: newMessage.trim() || null,
        sender_id: currentUser.id,
        recipient_id: selectedUserId || null,
        attachment_id: attachmentId
      };

      console.log('ChatWindow: Creating message:', messageData);

      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert(messageData);

      if (messageError) {
        console.error('ChatWindow: Message creation error:', messageError);
        throw messageError;
      }

      console.log('ChatWindow: Message sent successfully');

      // Reset form
      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('ChatWindow: Error sending message:', error);
      toast({
        title: "Fehler",
        description: "Nachricht konnte nicht gesendet werden",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('chat_attachments')
        .download(filePath);
      
      if (error) throw error;
      
      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Fehler",
        description: "Datei konnte nicht heruntergeladen werden",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gray-50 p-4 border-b">
        <h3 className="font-medium">
          {selectedUserId ? `Chat mit ${recipientName}` : 'Allgemeiner Chat'}
        </h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center items-center h-64 text-gray-400">
              Nachrichten werden geladen...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex justify-center items-center h-64 text-gray-400">
              Keine Nachrichten vorhanden. Starten Sie die Unterhaltung!
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender_id === currentUser?.id ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${
                    message.sender_id === currentUser?.id
                      ? "bg-tax-blue text-white"
                      : "bg-gray-100"
                  }`}
                >
                  {message.content && <p className="mb-1">{message.content}</p>}
                  
                  {message.attachment && (
                    <div 
                      className="flex items-center gap-2 p-2 bg-gray-200 rounded cursor-pointer mt-2"
                      onClick={() => downloadFile(message.attachment!.file_path, message.attachment!.file_name)}
                    >
                      <File className="h-4 w-4" />
                      <span className="text-sm text-blue-700 truncate max-w-[160px]">
                        {message.attachment.file_name}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs opacity-70">
                      {message.created_at.toLocaleTimeString()}
                    </span>
                    {message.sender_id === currentUser?.id && (
                      <span className="text-xs opacity-70 ml-2">
                        {message.read ? "Gelesen" : "Zugestellt"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {selectedFile && (
        <div className="px-4 py-2 border-t flex items-center gap-2 bg-gray-50">
          <File className="h-4 w-4" />
          <span className="text-sm truncate">{selectedFile.name}</span>
          <button 
            onClick={() => setSelectedFile(null)}
            className="ml-auto text-red-500 text-xs"
          >
            Entfernen
          </button>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2 items-center">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <Button 
          type="button" 
          variant="outline" 
          size="icon"
          onClick={handleFileClick}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Schreiben Sie eine Nachricht..."
          className="flex-1"
          disabled={uploading}
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={(!newMessage.trim() && !selectedFile) || uploading}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default ChatWindow;

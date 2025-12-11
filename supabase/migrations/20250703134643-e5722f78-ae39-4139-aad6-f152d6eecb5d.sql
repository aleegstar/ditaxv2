
-- Add encryption columns to chat_attachments table
ALTER TABLE public.chat_attachments 
ADD COLUMN encrypted BOOLEAN DEFAULT false,
ADD COLUMN encryption_version INTEGER DEFAULT 1,
ADD COLUMN iv TEXT,
ADD COLUMN metadata_iv TEXT,
ADD COLUMN encrypted_metadata TEXT,
ADD COLUMN integrity_hash TEXT,
ADD COLUMN original_size BIGINT;

-- Update the existing chat_attachments to support encrypted file storage
COMMENT ON COLUMN public.chat_attachments.encrypted IS 'Whether the file is encrypted';
COMMENT ON COLUMN public.chat_attachments.encryption_version IS 'Version of encryption used';
COMMENT ON COLUMN public.chat_attachments.iv IS 'Initialization vector for file encryption';
COMMENT ON COLUMN public.chat_attachments.metadata_iv IS 'Initialization vector for metadata encryption';
COMMENT ON COLUMN public.chat_attachments.encrypted_metadata IS 'Encrypted original filename and metadata';
COMMENT ON COLUMN public.chat_attachments.integrity_hash IS 'Hash for file integrity verification';
COMMENT ON COLUMN public.chat_attachments.original_size IS 'Original file size before encryption';

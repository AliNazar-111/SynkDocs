-- Enable Supabase Realtime for documents table to update Sidebar and Title
alter publication supabase_realtime add table documents;

-- Enable Supabase Realtime for document_versions table to update History Sidebar
alter publication supabase_realtime add table document_versions;

-- Enable Supabase Realtime for comments table (optional but good for future)
alter publication supabase_realtime add table comments;

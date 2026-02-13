export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            documents: {
                Row: {
                    id: string
                    owner_id: string
                    title: string
                    content: Json
                    created_at: string
                    updated_at: string
                    deleted_at: string | null
                }
                Insert: {
                    id?: string
                    owner_id: string
                    title: string
                    content?: Json
                    created_at?: string
                    updated_at?: string
                    deleted_at?: string | null
                }
                Update: {
                    id?: string
                    owner_id?: string
                    title?: string
                    content?: Json
                    created_at?: string
                    updated_at?: string
                    deleted_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "documents_owner_id_fkey"
                        columns: ["owner_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            document_collaborators: {
                Row: {
                    id: string
                    document_id: string
                    user_id: string
                    role: 'owner' | 'editor' | 'viewer'
                    created_at: string
                }
                Insert: {
                    id?: string
                    document_id: string
                    user_id: string
                    role?: 'owner' | 'editor' | 'viewer'
                    created_at?: string
                }
                Update: {
                    id?: string
                    document_id?: string
                    user_id?: string
                    role?: 'owner' | 'editor' | 'viewer'
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "document_collaborators_document_id_fkey"
                        columns: ["document_id"]
                        isOneToOne: false
                        referencedRelation: "documents"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "document_collaborators_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            comments: {
                Row: {
                    id: string
                    document_id: string
                    user_id: string
                    parent_id: string | null
                    thread_id: string
                    content: string
                    position_data: Json | null
                    resolved_at: string | null
                    resolved_by: string | null
                    created_at: string
                    updated_at: string
                    deleted_at: string | null
                }
                Insert: {
                    id?: string
                    document_id: string
                    user_id: string
                    parent_id?: string | null
                    thread_id?: string
                    content: string
                    position_data?: Json | null
                    resolved_at?: string | null
                    resolved_by?: string | null
                    created_at?: string
                    updated_at?: string
                    deleted_at?: string | null
                }
                Update: {
                    id?: string
                    document_id?: string
                    user_id?: string
                    parent_id?: string | null
                    thread_id?: string
                    content?: string
                    position_data?: Json | null
                    resolved_at?: string | null
                    resolved_by?: string | null
                    created_at?: string
                    updated_at?: string
                    deleted_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "comments_document_id_fkey"
                        columns: ["document_id"]
                        isOneToOne: false
                        referencedRelation: "documents"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "comments_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            document_versions: {
                Row: {
                    id: string
                    document_id: string
                    version_number: number
                    title: string
                    content: Json
                    created_by: string
                    created_at: string
                    change_summary: string | null
                    content_size_bytes: number
                }
                Insert: {
                    id?: string
                    document_id: string
                    version_number?: number
                    title: string
                    content: Json
                    created_by: string
                    created_at?: string
                    change_summary?: string | null
                }
                Update: {
                    id?: string
                    document_id?: string
                    version_number?: number
                    title?: string
                    content?: Json
                    created_by?: string
                    created_at?: string
                    change_summary?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "document_versions_document_id_fkey"
                        columns: ["document_id"]
                        isOneToOne: false
                        referencedRelation: "documents"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "document_versions_created_by_fkey"
                        columns: ["created_by"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            profiles: {
                Row: {
                    id: string
                    email: string
                    full_name: string | null
                    avatar_url: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email: string
                    full_name?: string | null
                    avatar_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    full_name?: string | null
                    avatar_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "profiles_id_fkey"
                        columns: ["id"]
                        isOneToOne: true
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            user_has_document_access: {
                Args: {
                    doc_id: string
                    user_id?: string
                }
                Returns: boolean
            }
            user_has_role: {
                Args: {
                    doc_id: string
                    required_role: 'owner' | 'editor' | 'viewer'
                    user_id?: string
                }
                Returns: boolean
            }
            create_version_snapshot: {
                Args: {
                    p_document_id: string
                    p_title: string
                    p_content: Json
                    p_change_summary?: string
                }
                Returns: string
            }
            restore_version: {
                Args: {
                    p_version_id: string
                }
                Returns: string
            }
            get_unresolved_threads: {
                Args: {
                    doc_id: string
                }
                Returns: {
                    thread_id: string
                    root_content: string
                    reply_count: number
                    latest_reply_at: string | null
                    position_data: Json | null
                }[]
            }
            get_document_storage_usage: {
                Args: {
                    p_document_id: string
                }
                Returns: {
                    total_versions: number
                    total_size_bytes: number
                    avg_version_size_bytes: number
                    oldest_version_date: string
                    newest_version_date: string
                }
            }
        }
        Enums: {
            document_role: "owner" | "editor" | "viewer"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

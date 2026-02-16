export interface Comment {
    id: string;
    userId: string;
    authorName: string;
    authorEmail?: string;
    content: string;
    createdAt: string;
}

export interface CommentThread {
    id: string;
    comments: Comment[];
    isResolved: boolean;
    resolvedAt?: string | null;
    rootAuthorId: string; // The user ID of the person who started the thread
    anchorId: string; // Used to link with TipTap marks
    createdAt: string;
    updatedAt: string;
}

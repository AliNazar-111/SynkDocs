export interface Comment {
    id: string;
    authorName: string;
    authorEmail?: string;
    content: string;
    createdAt: string;
}

export interface CommentThread {
    id: string;
    comments: Comment[];
    isResolved: boolean;
    anchorId: string; // Used to link with TipTap marks
    createdAt: string;
    updatedAt: string;
}

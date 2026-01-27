export interface Version {
    id: string;
    timestamp: string;
    authorName: string;
    authorEmail?: string;
    content: string; // HTML content snapshot
    label?: string; // Optional custom name for the version
}

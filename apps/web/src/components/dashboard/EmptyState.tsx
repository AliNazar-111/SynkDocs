import React from 'react';

interface EmptyStateProps {
    onCreate: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onCreate }) => {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed rounded-2xl bg-muted/5">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">No documents yet</h3>
            <p className="text-muted-foreground max-w-sm mb-8">
                Start collaborating in real-time by creating your first document. It's fast and easy.
            </p>
            <button
                onClick={onCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create your first document
            </button>
        </div>
    );
};

export default EmptyState;

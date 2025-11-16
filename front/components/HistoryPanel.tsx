
import React from 'react';
import type { HistoryItem } from '../types';

interface HistoryPanelProps {
    history: HistoryItem[];
    activeHistoryId: string | null;
    onSelectHistory: (id: string) => void;
    onDeleteHistory: (id: string) => void;
    onClearHistory: () => void;
    disabled?: boolean;
}

const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('default', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

const HistoryPanel: React.FC<HistoryPanelProps> = ({
    history,
    activeHistoryId,
    onSelectHistory,
    onDeleteHistory,
    onClearHistory,
    disabled
}) => {
    if (history.length === 0) {
        return null; // Don't render anything if there's no history
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-orange-400">History</h3>
                <button
                    onClick={onClearHistory}
                    disabled={disabled}
                    className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Clear All
                </button>
            </div>
            {history.length > 0 ? (
                <ul className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-2">
                    {history.map((item) => (
                        <li key={item.id}>
                            <button
                                onClick={() => onSelectHistory(item.id)}
                                disabled={disabled}
                                className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors disabled:opacity-50 group ${
                                    activeHistoryId === item.id ? 'bg-neutral-700 ring-2 ring-orange-500' : 'bg-neutral-800 hover:bg-neutral-700'
                                }`}
                            >
                                <img
                                    src={item.originalImage.src}
                                    alt="History thumbnail"
                                    className="w-12 h-12 object-cover rounded-md flex-shrink-0"
                                />
                                <div className="flex-grow overflow-hidden">
                                    <p className="text-xs text-neutral-400 truncate">{formatTimestamp(item.timestamp)}</p>
                                    <p className="text-sm font-medium text-neutral-200 truncate">
                                        {item.generatedImages.length} generated image{item.generatedImages.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteHistory(item.id);
                                    }}
                                    disabled={disabled}
                                    title="Delete item"
                                    className="text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto p-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-neutral-500 text-center py-4">Your editing history will appear here.</p>
            )}
        </div>
    );
};

export default HistoryPanel;
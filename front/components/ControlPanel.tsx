
import React, { useState, useCallback, useEffect } from 'react';
import Spinner from './Spinner';
import type { Angle, AspectRatio, UploadedImage } from '../types';

interface GenerateOptions {
    type: 'scene' | 'edit';
    prompt?: string;
}

interface ControlPanelProps {
    onGenerate: (options: GenerateOptions) => void;
    analysisResult: string;
    onAnalysisUpdate: (newText: string) => void;
    isAnalyzing: boolean;
    disabled?: boolean;
    onGenerateIdeas: () => void;
    sceneIdeas: string[];
    isGeneratingIdeas: boolean;
    selectedAngle: Angle;
    onAngleChange: (angle: Angle) => void;
    selectedAspectRatio: AspectRatio;
    onAspectRatioChange: (ratio: AspectRatio) => void;
    scenePrompt: string;
    onScenePromptChange: (prompt: string) => void;
    onEnhancePrompt: () => void;
    isEnhancingPrompt: boolean;
    sceneReferenceImage: UploadedImage | null;
    onSceneReferenceChange: (image: UploadedImage | null) => void;
    sceneInputType: 'prompt' | 'image';
    onSceneInputTypeChange: (type: 'prompt' | 'image') => void;
    isAnalyzingReference: boolean;
}

// Replaced JSX.Element with React.ReactElement to resolve TypeScript error 'Cannot find namespace JSX'.
const angleOptions: { id: Angle; label: string; icon: React.ReactElement }[] = [
    {
      id: 'eye-level',
      label: 'Eye Level',
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M12 17.5v-11" /></svg>,
    },
    {
      id: 'left-45',
      label: 'Left 45°',
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>,
    },
    {
      id: 'right-45',
      label: 'Right 45°',
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>,
    },
    {
      id: 'high-angle',
      label: 'High Angle',
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>,
    },
    {
      id: 'low-angle',
      label: 'Low Angle',
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>,
    },
    {
      id: 'dutch-angle',
      label: 'Dutch Angle',
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform -rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="5" width="18" height="14" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}></rect></svg>,
    },
    {
      id: 'macro-shot',
      label: 'Macro Shot',
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 10h.01" /></svg>,
    },
    {
      id: 'fish-eye',
      label: 'Fish Eye',
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7c3.333-2 6.667-2 10 0M7 17c3.333 2 6.667 2 10 0M7 7c-2 3.333-2 6.667 0 10M17 7c2 3.333 2 6.667 0 10"/>
            </svg>,
    },
];

const aspectRatioOptions: { id: AspectRatio; label: string }[] = [
    { id: '1:1', label: '1:1' },
    { id: '2:3', label: '2:3' },
    { id: '3:2', label: '3:2' },
    { id: '4:5', label: '4:5' },
    { id: '5:4', label: '5:4' },
    { id: '16:9', label: '16:9' },
    { id: '9:16', label: '9:16' },
];

const SceneReferenceUploader: React.FC<{
    image: UploadedImage | null;
    onUpload: (image: UploadedImage) => void;
    onRemove: () => void;
    disabled?: boolean;
}> = ({ image, onUpload, onRemove, disabled }) => {
    const [dragging, setDragging] = useState(false);

    const handleFileChange = useCallback((file: File | null) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                onUpload({ src: result, mimeType: file.type });
            };
            reader.readAsDataURL(file);
        }
    }, [onUpload]);

    if (image) {
        return (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden group">
                <img src={image.src} alt="Scene reference" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                        type="button" 
                        onClick={onRemove}
                        disabled={disabled}
                        className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full"
                        aria-label="Remove reference image"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <label
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFileChange(e.dataTransfer.files?.[0] ?? null); }}
            className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                dragging ? 'border-orange-500 bg-orange-900/20' : 'border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            <div className="text-center">
                <p className="text-sm text-neutral-400"><span className="font-semibold">Upload an image</span></p>
                <p className="text-xs text-neutral-600">or drag and drop</p>
            </div>
            <input type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} disabled={disabled} />
        </label>
    );
};


const ControlPanel: React.FC<ControlPanelProps> = ({ 
    onGenerate, 
    analysisResult,
    onAnalysisUpdate, 
    isAnalyzing, 
    disabled,
    onGenerateIdeas,
    sceneIdeas,
    isGeneratingIdeas,
    selectedAngle,
    onAngleChange,
    selectedAspectRatio,
    onAspectRatioChange,
    scenePrompt,
    onScenePromptChange,
    onEnhancePrompt,
    isEnhancingPrompt,
    sceneReferenceImage,
    onSceneReferenceChange,
    sceneInputType,
    onSceneInputTypeChange,
    isAnalyzingReference
}) => {
    const [editPrompt, setEditPrompt] = useState<string>('');
    const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(false);
    const [isEditingAnalysis, setIsEditingAnalysis] = useState(false);
    const [editedAnalysis, setEditedAnalysis] = useState(analysisResult);

    useEffect(() => {
        setEditedAnalysis(analysisResult);
        // When analysis changes (e.g., new image), exit editing mode
        setIsEditingAnalysis(false);
    }, [analysisResult]);

    const handleSaveAnalysis = () => {
        onAnalysisUpdate(editedAnalysis);
        setIsEditingAnalysis(false);
    };

    const handleCancelAnalysis = () => {
        setEditedAnalysis(analysisResult); // Revert changes
        setIsEditingAnalysis(false);
    };

    const isAnalysisLong = analysisResult.length > 180;

    const handleSceneSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (scenePrompt.trim()) {
            onGenerate({ type: 'scene', prompt: scenePrompt });
        }
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editPrompt.trim()) {
            onGenerate({ type: 'edit', prompt: editPrompt });
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <div>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-orange-400">Product Analysis</h3>
                    {!isEditingAnalysis && analysisResult && !isAnalyzing && (
                        <button
                            onClick={() => setIsEditingAnalysis(true)}
                            className="text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
                            title="Edit Analysis"
                            disabled={disabled}
                            aria-label="Edit Analysis"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                </div>

                {isEditingAnalysis ? (
                    <div className="flex flex-col gap-3">
                        <textarea
                            value={editedAnalysis}
                            onChange={(e) => setEditedAnalysis(e.target.value)}
                            className="bg-neutral-800 border border-neutral-700 rounded-lg p-3 w-full focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition disabled:opacity-50 text-sm text-neutral-300"
                            rows={6}
                            disabled={disabled}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={handleCancelAnalysis}
                                disabled={disabled}
                                className="bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-1.5 px-4 rounded-lg transition text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveAnalysis}
                                disabled={disabled || editedAnalysis === analysisResult}
                                className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-1.5 px-4 rounded-lg transition text-sm disabled:bg-orange-500/20 disabled:text-orange-500/50 disabled:cursor-not-allowed"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-neutral-900/70 p-4 rounded-lg text-neutral-300 text-sm prose prose-invert prose-p:my-1">
                        {isAnalyzing ? (
                            <div className="flex items-center justify-center min-h-[70px]">
                                <Spinner size="small" />
                                <span className="ml-2">Analyzing...</span>
                            </div>
                        ) : (
                            <div>
                                <div 
                                    className={`transition-all duration-300 ease-in-out ${isAnalysisLong && !isAnalysisExpanded ? 'max-h-[70px] overflow-hidden [mask-image:linear-gradient(to_bottom,black_50%,transparent_100%)]' : 'max-h-none'}`}
                                >
                                    <p>{analysisResult || "Analysis will appear here."}</p>
                                </div>
                                {isAnalysisLong && (
                                    <button 
                                        onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}
                                        className="text-orange-400 text-xs font-semibold flex items-center gap-1 mx-auto mt-2 hover:text-orange-300"
                                    >
                                        <span>{isAnalysisExpanded ? 'Show Less' : 'Show More'}</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-300 ${isAnalysisExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-lg font-semibold mb-3 text-orange-400">Angle</h3>
                <div className="grid grid-cols-4 gap-2">
                    {angleOptions.map((angle) => (
                        <button
                            key={angle.id}
                            type="button"
                            onClick={() => onAngleChange(angle.id)}
                            disabled={disabled}
                            title={angle.label}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg aspect-square transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                selectedAngle === angle.id
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                            }`}
                        >
                            {angle.icon}
                            <span className="text-xs mt-1 text-center leading-tight">{angle.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div>
                 <h3 className="text-lg font-semibold mb-3 text-orange-400">Aspect Ratio</h3>
                 <div className="grid grid-cols-4 gap-2">
                    {aspectRatioOptions.map((ratio) => (
                        <button
                            key={ratio.id}
                            type="button"
                            onClick={() => onAspectRatioChange(ratio.id)}
                            disabled={disabled}
                            title={ratio.label}
                             className={`flex items-center justify-center p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                selectedAspectRatio === ratio.id
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                            }`}
                        >
                            <span className="text-sm font-semibold">{ratio.label}</span>
                        </button>
                    ))}
                     <div className="col-span-1"></div> 
                 </div>
            </div>

            <form onSubmit={handleSceneSubmit} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <label className="text-lg font-semibold text-orange-400">Generate New Scene</label>
                    <button 
                        type="button" 
                        onClick={onGenerateIdeas}
                        disabled={disabled || isGeneratingIdeas || !analysisResult || sceneInputType === 'image'}
                        className="text-sm text-orange-400 hover:text-orange-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        title="Get scene ideas (text prompt only)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M15.5 13a3.5 3.5 0 0 0-3.5 3.5v1a3.5 3.5 0 0 0 7 0v-1.8M8.5 13a3.5 3.5 0 0 1 3.5 3.5v1a3.5 3.5 0 0 1-7 0v-1.8"/><path d="M17.5 16a3.5 3.5 0 0 0 0-7H17"/><path d="M19 9.3V6.5a3.5 3.5 0 0 0-7 0M6.5 16a3.5 3.5 0 0 1 0-7H7"/><path d="M5 9.3V6.5a3.5 3.5 0 0 1 7 0v10"/></g></svg>
                        Get Ideas
                    </button>
                </div>

                <div className="flex bg-neutral-800 rounded-lg p-1 w-full text-sm">
                    <button type="button" onClick={() => onSceneInputTypeChange('prompt')} className={`w-1/2 p-1.5 rounded-md font-semibold transition-colors ${sceneInputType === 'prompt' ? 'bg-orange-600 text-white' : 'text-neutral-300 hover:bg-neutral-700'}`}>Describe</button>
                    <button type="button" onClick={() => onSceneInputTypeChange('image')} className={`w-1/2 p-1.5 rounded-md font-semibold transition-colors ${sceneInputType === 'image' ? 'bg-orange-600 text-white' : 'text-neutral-300 hover:bg-neutral-700'}`}>Use Reference</button>
                </div>

                {sceneInputType === 'prompt' ? (
                    <div className="flex flex-col gap-3">
                        <p className="text-sm text-neutral-400 -mt-2">Describe a new background or setting for your product.</p>
                        <textarea
                            id="scene-prompt"
                            value={scenePrompt}
                            onChange={(e) => onScenePromptChange(e.target.value)}
                            placeholder="e.g., on a marble countertop with morning light"
                            className="bg-neutral-800 border border-neutral-700 rounded-lg p-3 w-full focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition disabled:opacity-50"
                            rows={3}
                            disabled={disabled || isEnhancingPrompt}
                        />
                        <div className="flex justify-end -mt-2">
                            <button
                                type="button"
                                onClick={onEnhancePrompt}
                                disabled={disabled || isEnhancingPrompt || !scenePrompt.trim()}
                                title="Enhance prompt with AI"
                                className="text-sm font-semibold text-orange-400 hover:text-orange-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors py-1 px-2 rounded-md hover:bg-orange-500/10"
                            >
                                {isEnhancingPrompt ? (<><Spinner size="small" /><span>Enhancing...</span></>) : (<><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12h18m-9 9V3M7.5 7.5l9 9m-9 0l9-9"/></svg><span>Enhance</span></>)}
                            </button>
                        </div>
                        {(isGeneratingIdeas || sceneIdeas.length > 0) && (
                            <div className="flex flex-wrap gap-2 mt-1">
                                {isGeneratingIdeas && <div className="text-sm text-neutral-400">Thinking of ideas...</div>}
                                {sceneIdeas.map((idea, index) => (<button key={index} type="button" onClick={() => onScenePromptChange(idea)} className="text-xs bg-neutral-700 hover:bg-neutral-600 text-neutral-200 px-2 py-1 rounded-full transition-colors">{idea}</button>))}
                            </div>
                        )}
                    </div>
                ) : (
                     <div className="flex flex-col gap-2">
                        <p className="text-sm text-neutral-400">Upload an image to generate a scene description.</p>
                        {isAnalyzingReference ? (
                             <div className="flex items-center justify-center h-28 border-2 border-dashed rounded-lg border-neutral-700">
                                <Spinner size="small" />
                                <span className="ml-2 text-sm text-neutral-400">Analyzing Scene...</span>
                            </div>
                        ) : (
                            <SceneReferenceUploader image={sceneReferenceImage} onUpload={(img) => onSceneReferenceChange(img)} onRemove={() => onSceneReferenceChange(null)} disabled={disabled} />
                        )}
                     </div>
                )}
                <button type="submit" disabled={disabled || sceneInputType === 'image' || !scenePrompt.trim()} className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-orange-500/20 disabled:text-orange-500/50 disabled:cursor-not-allowed">
                    Generate Scene
                </button>
            </form>

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-3">
                <label htmlFor="edit-prompt" className="text-lg font-semibold text-orange-400">Edit Selected Image</label>
                <p className="text-sm text-neutral-400 -mt-2">Describe a change to apply to the current image.</p>
                <textarea
                    id="edit-prompt"
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="e.g., add a retro filter, make the background blurry"
                    className="bg-neutral-800 border border-neutral-700 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition disabled:opacity-50"
                    rows={2}
                    disabled={disabled}
                />
                <button type="submit" disabled={disabled || !editPrompt.trim()} className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-orange-500/20 disabled:text-orange-500/50 disabled:cursor-not-allowed">
                    Apply Edit
                </button>
            </form>
        </div>
    );
};

export default ControlPanel;

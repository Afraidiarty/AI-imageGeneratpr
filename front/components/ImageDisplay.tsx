
import React from 'react';
import type { UploadedImage, AspectRatio } from '../types';
import Spinner from './Spinner';

interface ImageDisplayProps {
    selectedImage: string | null;
    originalImage: UploadedImage;
    generatedImages: string[];
    onSelectImage: (src: string) => void;
    isLoading: boolean;
    loadingMessage: string;
    onVariation: () => void;
    onDeleteImage: (src: string) => void;
    onCrop: (src: string) => void;
    aspectRatio: AspectRatio;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({
    selectedImage,
    originalImage,
    generatedImages,
    onSelectImage,
    isLoading,
    loadingMessage,
    onVariation,
    onDeleteImage,
    onCrop,
    aspectRatio,
}) => {

    const aspectRatioClasses: Record<AspectRatio, string> = {
        '1:1': 'aspect-square',
        '2:3': 'aspect-[2/3]',
        '3:2': 'aspect-[3/2]',
        '4:5': 'aspect-[4/5]',
        '5:4': 'aspect-[5/4]',
        '16:9': 'aspect-video',
        '9:16': 'aspect-[9/16]',
    };

    const handleDownload = () => {
        if (!selectedImage) return;
        const link = document.createElement('a');
        link.href = selectedImage;
        const mimeType = selectedImage.substring(5, selectedImage.indexOf(';'));
        const extension = mimeType.split('/')[1] || 'png';
        link.download = `product-scene-${Date.now()}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className={`relative w-full bg-black/50 rounded-xl overflow-hidden flex items-center justify-center group transition-all duration-300 ${aspectRatioClasses[aspectRatio]}`}>
                {selectedImage ? (
                    <img src={selectedImage} alt="Selected product" className="object-contain h-full w-full" />
                ) : (
                    <p className="text-neutral-500">Image will be displayed here</p>
                )}
                {isLoading && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20">
                        <Spinner />
                        <p className="mt-4 text-white">{loadingMessage}</p>
                    </div>
                )}
                {selectedImage && (
                    <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                         <button 
                            onClick={() => onCrop(selectedImage)}
                            disabled={isLoading}
                            title="Crop & Resize"
                            className="bg-black/50 hover:bg-black/80 backdrop-blur-sm text-white p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"></path><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"></path></svg>
                        </button>
                        <button 
                            onClick={onVariation}
                            disabled={isLoading}
                            title="Create Variation"
                            className="bg-black/50 hover:bg-black/80 backdrop-blur-sm text-white p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24">
                                <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                                    <path d="M15 8h.01M12 21H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v6"/>
                                    <path d="m3 16l5-5c.928-.893 2.072-.893 3 0l3.993 3.993"/>
                                    <path d="m14 14l1-1c.47-.452.995-.675 1.52-.67M19 22.5a4.75 4.75 0 0 1 3.5-3.5a4.75 4.75 0 0 1-3.5-3.5a4.75 4.75 0 0 1-3.5 3.5a4.75 4.75 0 0 1 3.5 3.5"/>
                                </g>
                            </svg>
                        </button>
                        <button 
                            onClick={handleDownload}
                            disabled={isLoading}
                            title="Download Image"
                            className="bg-black/50 hover:bg-black/80 backdrop-blur-sm text-white p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-lg font-semibold mb-3 text-orange-400">Image Gallery</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    <button
                        onClick={() => onSelectImage(originalImage.src)}
                        disabled={isLoading}
                        className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all ${
                            selectedImage === originalImage.src ? 'border-orange-500 scale-105' : 'border-neutral-800 hover:border-neutral-700'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        <img src={originalImage.src} alt="Original" className="object-cover w-full h-full" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5">Original</div>
                    </button>
                    {generatedImages.map((imgSrc, index) => (
                        <button
                            key={index}
                            onClick={() => onSelectImage(imgSrc)}
                            disabled={isLoading}
                            className={`relative group aspect-square rounded-md overflow-hidden border-2 transition-all ${
                                selectedImage === imgSrc ? 'border-orange-500 scale-105' : 'border-neutral-800 hover:border-neutral-700'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            <img src={imgSrc} alt={`Generated ${index + 1}`} className="object-cover w-full h-full" />
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteImage(imgSrc);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onDeleteImage(imgSrc);
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                                aria-label="Delete Image"
                                title="Delete Image"
                                className="absolute top-1 right-1 bg-black/50 hover:bg-red-500/80 backdrop-blur-sm text-white p-1.5 rounded-full cursor-pointer transition-all opacity-0 group-hover:opacity-100"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                        </button>
                    ))}
                </div>
                 {generatedImages.length === 0 && <p className="text-sm text-neutral-500 mt-2">Generated images will appear here.</p>}
            </div>
        </div>
    );
};

export default ImageDisplay;

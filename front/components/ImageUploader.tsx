
import React, { useCallback, useState } from 'react';
import type { UploadedImage } from '../types';

interface ImageUploaderProps {
    onImageUpload: (image: UploadedImage) => void;
    disabled?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, disabled }) => {
    const [dragging, setDragging] = useState(false);

    const handleFileChange = useCallback((file: File | null) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                onImageUpload({ src: result, mimeType: file.type });
            };
            reader.readAsDataURL(file);
        }
    }, [onImageUpload]);

    const onDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setDragging(true);
    };

    const onDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setDragging(false);
    };

    const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    return (
        <div>
            <label 
                htmlFor="image-upload" 
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    dragging ? 'border-orange-500 bg-orange-900/20' : 'border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800/50'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                    <svg className="w-8 h-8 mb-3 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-4-4V7a4 4 0 014-4h2a4 4 0 014 4v1m-1 8l-3-3m0 0l-3 3m3-3v7m0-13h2a4 4 0 014 4v2m-6 4h.01"></path></svg>
                    <p className="mb-2 text-sm text-neutral-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-neutral-600">PNG, JPG, or WEBP</p>
                </div>
                <input 
                    id="image-upload" 
                    type="file" 
                    className="hidden" 
                    accept="image/png, image/jpeg, image/webp"
                    onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                    disabled={disabled}
                />
            </label>
        </div>
    );
};

export default ImageUploader;
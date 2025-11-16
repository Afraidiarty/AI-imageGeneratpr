import React, { useState, useEffect, useRef, useCallback } from 'react';

interface CropModalProps {
    imageSrc: string;
    onClose: () => void;
    onSave: (newImageSrc: string) => void;
}

type AspectRatioPreset = 'custom' | '1:1' | '4:3' | '2:3' | '3:2' | '3:4';

const CROP_PRESETS: { id: AspectRatioPreset; label: string }[] = [
    { id: 'custom', label: 'Custom' },
    { id: '1:1', label: 'Square' },
    { id: '4:3', label: '4:3' },
    { id: '2:3', label: '2:3' },
    { id: '3:2', label: '3:2' },
    { id: '3:4', label: '3:4' },
];

const MIN_CROP_SIZE = 20; // Minimum crop size in pixels

const CropModal: React.FC<CropModalProps> = ({ imageSrc, onClose, onSave }) => {
    const [activeTab, setActiveTab] = useState<'crop' | 'flip'>('crop');
    
    // Image and container state
    const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
    const [imageDisplaySize, setImageDisplaySize] = useState({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Crop state
    const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [cropWidthInput, setCropWidthInput] = useState(0);
    const [cropHeightInput, setCropHeightInput] = useState(0);
    const [activePreset, setActivePreset] = useState<AspectRatioPreset>('custom');
    
    // Transform state
    const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
    const [flipH, setFlipH] = useState(false);
    const [flipV, setFlipV] = useState(false);

    // Interaction state (using ref to avoid re-renders during drag)
    const interactionRef = useRef<{
        type: 'move' | 'resize';
        handle: string;
        startX: number;
        startY: number;
        startCrop: typeof crop;
    } | null>(null);

    // 1. Load the original image
    useEffect(() => {
        const img = new Image();
        img.src = imageSrc;
        img.onload = () => setOriginalImage(img);
    }, [imageSrc]);

    // 2. Calculate displayed image size and reset crop box
    const resetCrop = useCallback(() => {
        if (!originalImage || !containerRef.current) return;

        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        const imageAspectRatio = originalImage.width / originalImage.height;
        const containerAspectRatio = containerWidth / containerHeight;

        let dispWidth, dispHeight;
        if (imageAspectRatio > containerAspectRatio) {
            dispWidth = containerWidth;
            dispHeight = dispWidth / imageAspectRatio;
        } else {
            dispHeight = containerHeight;
            dispWidth = dispHeight * imageAspectRatio;
        }

        setImageDisplaySize({ width: dispWidth, height: dispHeight });
        setCrop({ x: 0, y: 0, width: dispWidth, height: dispHeight });
        setCropWidthInput(originalImage.width);
        setCropHeightInput(originalImage.height);
        setActivePreset('custom');
    }, [originalImage]);

    // Add resize listener to reset crop on window resize
    useEffect(() => {
        resetCrop();
        window.addEventListener('resize', resetCrop);
        return () => window.removeEventListener('resize', resetCrop);
    }, [resetCrop]);

    // 3. Handle mouse events for interaction
    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, handle: string) => {
        e.preventDefault();
        e.stopPropagation();

        interactionRef.current = {
            type: handle === 'move' ? 'move' : 'resize',
            handle,
            startX: e.clientX,
            startY: e.clientY,
            startCrop: { ...crop },
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [crop]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!interactionRef.current || !originalImage) return;

        const { type, handle, startX, startY, startCrop } = interactionRef.current;
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        let { x, y, width, height } = startCrop;

        if (type === 'move') {
            x = startCrop.x + deltaX;
            y = startCrop.y + deltaY;
        } else { // Resize
            if (handle.includes('right')) width = startCrop.width + deltaX;
            if (handle.includes('left')) {
                width = startCrop.width - deltaX;
                x = startCrop.x + deltaX;
            }
            if (handle.includes('bottom')) height = startCrop.height + deltaY;
            if (handle.includes('top')) {
                height = startCrop.height - deltaY;
                y = startCrop.y + deltaY;
            }

            // Handle aspect ratio for corner drags
            if (activePreset !== 'custom' && handle.includes('-')) {
                const [ratioW, ratioH] = activePreset.split(':').map(Number);
                const aspectRatio = ratioW / ratioH;
                if (width / height > aspectRatio) {
                    const newHeight = width / aspectRatio;
                    if(handle.includes('top')) y -= newHeight - height;
                    height = newHeight;
                } else {
                    const newWidth = height * aspectRatio;
                    if(handle.includes('left')) x -= newWidth - width;
                    width = newWidth;
                }
            }
        }
        
        // Prevent negative width/height
        if (width < MIN_CROP_SIZE) {
            if(handle.includes('left')) x = startCrop.x + startCrop.width - MIN_CROP_SIZE;
            width = MIN_CROP_SIZE;
        }
        if (height < MIN_CROP_SIZE) {
            if(handle.includes('top')) y = startCrop.y + startCrop.height - MIN_CROP_SIZE;
            height = MIN_CROP_SIZE;
        }

        // Constrain to image bounds
        x = Math.max(0, x);
        y = Math.max(0, y);
        if (x + width > imageDisplaySize.width) width = imageDisplaySize.width - x;
        if (y + height > imageDisplaySize.height) height = imageDisplaySize.height - y;
        
        setCrop({ x, y, width, height });

        const scale = originalImage.width / imageDisplaySize.width;
        setCropWidthInput(Math.round(width * scale));
        setCropHeightInput(Math.round(height * scale));
    }, [imageDisplaySize, activePreset, originalImage]);

    const handleMouseUp = useCallback(() => {
        interactionRef.current = null;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove]);
    
    // 4. Handle preset and input changes
    const handlePresetChange = useCallback((preset: AspectRatioPreset) => {
        setActivePreset(preset);
        if (preset === 'custom' || !imageDisplaySize.width || !originalImage) return;

        const [ratioW, ratioH] = preset.split(':').map(Number);
        const targetRatio = ratioW / ratioH;
        const imageRatio = imageDisplaySize.width / imageDisplaySize.height;

        let newWidth, newHeight;
        if (imageRatio > targetRatio) {
            newHeight = imageDisplaySize.height;
            newWidth = newHeight * targetRatio;
        } else {
            newWidth = imageDisplaySize.width;
            newHeight = newWidth / targetRatio;
        }

        const newX = (imageDisplaySize.width - newWidth) / 2;
        const newY = (imageDisplaySize.height - newHeight) / 2;

        setCrop({ x: newX, y: newY, width: newWidth, height: newHeight });
        
        const scale = originalImage.width / imageDisplaySize.width;
        setCropWidthInput(Math.round(newWidth * scale));
        setCropHeightInput(Math.round(newHeight * scale));
    }, [imageDisplaySize, originalImage]);
    
    const handleDimensionChange = (valueStr: string, dimension: 'w' | 'h') => {
        if (!originalImage || !imageDisplaySize.width) return;
        const value = parseInt(valueStr, 10);
        
        let newOriginalWidth = cropWidthInput;
        let newOriginalHeight = cropHeightInput;

        if (dimension === 'w') {
            if (isNaN(value) || value <= 0) { setCropWidthInput(cropWidthInput); return; }
            newOriginalWidth = Math.min(value, originalImage.width);
            setCropWidthInput(newOriginalWidth);
        } else {
            if (isNaN(value) || value <= 0) { setCropHeightInput(cropHeightInput); return; }
            newOriginalHeight = Math.min(value, originalImage.height);
            setCropHeightInput(newOriginalHeight);
        }
        
        setActivePreset('custom');
        
        const scale = imageDisplaySize.width / originalImage.width;
        const newDispWidth = newOriginalWidth * scale;
        const newDispHeight = newOriginalHeight * scale;

        setCrop(prev => ({
            x: Math.max(0, prev.x + (prev.width - newDispWidth) / 2),
            y: Math.max(0, prev.y + (prev.height - newDispHeight) / 2),
            width: newDispWidth,
            height: newDispHeight,
        }));
    };

    // 5. Apply changes and save
    const handleApplyChanges = () => {
        if (!originalImage) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const scale = originalImage.width / imageDisplaySize.width;
        const sx = crop.x * scale;
        const sy = crop.y * scale;
        const sWidth = crop.width * scale;
        const sHeight = crop.height * scale;

        const rotated = rotation === 90 || rotation === 270;
        canvas.width = rotated ? sHeight : sWidth;
        canvas.height = rotated ? sWidth : sHeight;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        if (rotation) ctx.rotate(rotation * Math.PI / 180);
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        ctx.translate(-sWidth / 2, -sHeight / 2);
        
        ctx.drawImage(originalImage, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
        
        onSave(canvas.toDataURL('image/png', 0.95));
    };
    
    const handles = [
        { name: 'top-left', cursor: 'nwse-resize' }, { name: 'top-center', cursor: 'ns-resize' }, { name: 'top-right', cursor: 'nesw-resize' },
        { name: 'middle-left', cursor: 'ew-resize' }, { name: 'middle-right', cursor: 'ew-resize' },
        { name: 'bottom-left', cursor: 'nesw-resize' }, { name: 'bottom-center', cursor: 'ns-resize' }, { name: 'bottom-right', cursor: 'nwse-resize' },
    ];
    
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-[#1C1C1E] border border-neutral-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex" onClick={e => e.stopPropagation()}>
                {/* Left Panel: Controls */}
                <div className="w-80 flex-shrink-0 p-6 flex flex-col border-r border-neutral-800">
                    <h2 className="text-xl font-bold mb-6 text-white">Transform Image</h2>
                    
                    <div className="flex border-b border-neutral-700 mb-6">
                        <button onClick={() => setActiveTab('crop')} className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'crop' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-neutral-400 hover:text-white'}`}>CROP SIZE</button>
                        <button onClick={() => setActiveTab('flip')} className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'flip' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-neutral-400 hover:text-white'}`}>FLIP & ROTATE</button>
                    </div>

                    {/* Crop Controls */}
                    <div className={activeTab === 'crop' ? 'flex flex-col gap-6' : 'hidden'}>
                        <div className="flex items-center gap-2">
                             <input type="number" value={cropWidthInput} onChange={e => handleDimensionChange(e.target.value, 'w')} className="bg-neutral-800 border border-neutral-700 rounded-lg p-2 w-full text-center" />
                             <span className="text-neutral-500">x</span>
                             <input type="number" value={cropHeightInput} onChange={e => handleDimensionChange(e.target.value, 'h')} className="bg-neutral-800 border border-neutral-700 rounded-lg p-2 w-full text-center" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {CROP_PRESETS.map(p => (
                                <button key={p.id} onClick={() => handlePresetChange(p.id)} className={`p-2 text-sm rounded-lg transition-colors ${activePreset === p.id ? 'bg-orange-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'}`}>
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* Flip & Rotate Controls */}
                     <div className={activeTab === 'flip' ? 'flex flex-col gap-4' : 'hidden'}>
                         <h3 className="text-base font-semibold text-neutral-300">Rotate</h3>
                         <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setRotation(r => (r - 90 + 360) % 360)} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 p-2 rounded-lg flex items-center justify-center gap-2">Rotate Left</button>
                            <button onClick={() => setRotation(r => (r + 90) % 360)} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 p-2 rounded-lg flex items-center justify-center gap-2">Rotate Right</button>
                         </div>
                         <h3 className="text-base font-semibold text-neutral-300">Flip</h3>
                         <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setFlipH(!flipH)} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 p-2 rounded-lg flex items-center justify-center gap-2">Horizontal</button>
                            <button onClick={() => setFlipV(!flipV)} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 p-2 rounded-lg flex items-center justify-center gap-2">Vertical</button>
                         </div>
                    </div>
                    
                    <div className="mt-auto flex flex-col gap-3 pt-6">
                        <button onClick={handleApplyChanges} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition">Apply Changes</button>
                        <button onClick={onClose} className="w-full bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-2 px-4 rounded-lg transition">Cancel</button>
                    </div>
                </div>

                {/* Right Panel: Image Preview */}
                <div ref={containerRef} className="flex-grow p-6 flex items-center justify-center bg-black/50 overflow-hidden select-none">
                    {imageDisplaySize.width > 0 && (
                        <div style={{ position: 'relative', width: imageDisplaySize.width, height: imageDisplaySize.height, transform: `rotate(${rotation}deg) scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})` }}>
                            <img src={imageSrc} alt="Preview" className="block w-full h-full pointer-events-none" />
                            <div
                                className="absolute"
                                style={{
                                    top: crop.y,
                                    left: crop.x,
                                    width: crop.width,
                                    height: crop.height,
                                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
                                    cursor: 'move',
                                }}
                                onMouseDown={(e) => handleMouseDown(e, 'move')}
                            >
                                <div className="absolute inset-0 border border-dashed border-white/80" />
                                {handles.map(({ name, cursor }) => {
                                    const isEdge = name.includes('center');
                                    if (activePreset !== 'custom' && isEdge) return null; // Only corner handles for presets
                                    const top = name.includes('top') ? '-6px' : name.includes('bottom') ? 'calc(100% - 6px)' : 'calc(50% - 6px)';
                                    const left = name.includes('left') ? '-6px' : name.includes('right') ? 'calc(100% - 6px)' : 'calc(50% - 6px)';
                                    return (
                                        <div
                                            key={name}
                                            onMouseDown={(e) => handleMouseDown(e, name)}
                                            className="absolute w-3 h-3 bg-white rounded-full border-2 border-neutral-800"
                                            style={{ top, left, cursor }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CropModal;

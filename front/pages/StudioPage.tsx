// pages/StudioPage.tsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  analyzeImage,
  generateOrEditImage,
  generateSceneIdeas,
  enhancePrompt,
  analyzeSceneReference,
} from '../services/geminiService';
import * as historyService from '../services/historyService';
import { ApiError } from '../services/apiClient';
import type { UploadedImage, Angle, AspectRatio, HistoryItem, CreditAction } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import ImageUploader from '../components/ImageUploader';
import ControlPanel from '../components/ControlPanel';
import ImageDisplay from '../components/ImageDisplay';
import Spinner from '../components/Spinner';
import HistoryPanel from '../components/HistoryPanel';
import CropModal from '../components/CropModal';
import CreditStatus from '../components/CreditStatus';

const ANGLE_DESCRIPTIONS: Record<Angle, string> = {
  'eye-level':
    'The camera should be at eye-level with the product, creating a neutral, direct, and relatable perspective. This is a standard, clear shot, as if the viewer is looking at it on a shelf.',
  'left-45':
    "Position the camera at a 45-degree angle to the left of the product. This three-quarter view adds depth and dimension, showcasing the product's side and front simultaneously for a more dynamic and informative look.",
  'right-45':
    "Position the camera at a 45-degree angle to the right of the product. This three-quarter view adds depth and dimension, showcasing the product's side and front simultaneously for a more dynamic and informative look.",
  'high-angle':
    'Use a high-angle shot, positioning the camera significantly above the product and looking down at a 55-degree angle. This "bird\'s-eye view" offers a unique, clarifying perspective on its top surfaces. Fill out the entire image. No black borders around it.',
  'low-angle':
    'Employ an extreme low-angle shot, as if the camera is placed on the ground looking almost straight up at the product. This "worm\'s-eye view" should make the product look absolutely massive, heroic, and imposing, dominating the frame. The perspective should be powerful and dramatic, emphasizing its scale.',
  'dutch-angle':
    'Apply a Dutch angle by tilting the camera on its roll axis. This creates a sense of dynamism, excitement, or unease. The horizon line should be intentionally skewed to make the composition feel more energetic and less stable. Fill out the entire image. No black or white borders around it.',
  'macro-shot':
    'Execute an extreme close-up or macro shot. The camera should be extremely close to the product, focusing tightly on a specific, important detail like a texture, logo, or unique feature. This highlights craftsmanship and material quality.',
  'fish-eye':
    'Simulate a fish-eye lens effect. The image should have extreme barrel distortion, making straight lines appear curved. This creates a wide, hemispherical, and disorienting perspective. Fill out the entire image. No black borders around it.',
};

const ASPECT_RATIO_DESCRIPTIONS: Record<AspectRatio, string> = {
  '1:1': 'a square (1:1) aspect ratio',
  '2:3': 'a vertical portrait (2:3) aspect ratio',
  '3:2': 'a horizontal landscape (3:2) aspect ratio',
  '4:5': 'a vertical portrait (4:5) aspect ratio',
  '5:4': 'a horizontal landscape (5:4) aspect ratio',
  '16:9': 'a widescreen landscape (16:9) aspect ratio',
  '9:16': 'a tall vertical portrait (9:16) aspect ratio',
};

/**
 * Places the original image onto a white canvas with a given target aspect ratio.
 * This helps the AI outpaint into the white areas to reach the final dimensions.
 */
const resizeImageWithAspectRatio = async (
  imageDataUrl: string,
  mimeType: string,
  aspectRatio: AspectRatio
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Could not get canvas context'));

      const [ratioW, ratioH] = aspectRatio.split(':').map(Number);
      const targetAspectRatio = ratioW / ratioH;

      // keep output reasonable for performance
      const maxDimension = 1024;
      let canvasWidth: number;
      let canvasHeight: number;

      if (targetAspectRatio >= 1) {
        canvasWidth = maxDimension;
        canvasHeight = maxDimension / targetAspectRatio;
      } else {
        canvasHeight = maxDimension;
        canvasWidth = maxDimension * targetAspectRatio;
      }

      canvas.width = Math.round(canvasWidth);
      canvas.height = Math.round(canvasHeight);

      // Fill background white to guide outpainting
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const imageAspectRatio = img.width / img.height;
      let drawWidth: number;
      let drawHeight: number;

      if (imageAspectRatio > targetAspectRatio) {
        drawWidth = canvas.width;
        drawHeight = canvas.width / imageAspectRatio;
      } else {
        drawHeight = canvas.height;
        drawWidth = canvas.height * imageAspectRatio;
      }

      const x = (canvas.width - drawWidth) / 2;
      const y = (canvas.height - drawHeight) / 2;

      ctx.drawImage(img, x, y, drawWidth, drawHeight);
      resolve(canvas.toDataURL(mimeType, 0.95));
    };
    img.onerror = (err) =>
      reject(err instanceof ErrorEvent ? err.error : new Error('Image loading failed'));
    img.src = imageDataUrl;
  });
};

interface GenerateOptions {
  type: 'scene' | 'edit';
  prompt?: string;
}

const StudioPage: React.FC = () => {
  const navigate = useNavigate();

  // берём всё нужное из AuthContext
  const { user, isAuthInitializing, credits, requireCredits } = useAuth();

  // 🔒 корректный редирект по авторизации
  useEffect(() => {
    if (!isAuthInitializing && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, isAuthInitializing, navigate]);

  if (isAuthInitializing) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Spinner />
        <span className="ml-3 text-neutral-400">Loading workspace…</span>
      </div>
    );
  }

  if (!user) return null;

  // история и активный id
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  // UI состояние
  const [creditError, setCreditError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [sceneIdeas, setSceneIdeas] = useState<string[]>([]);
  const [scenePrompt, setScenePrompt] = useState<string>('');
  const [sceneReferenceImage, setSceneReferenceImage] = useState<UploadedImage | null>(null);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState<boolean>(false);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [selectedAngle, setSelectedAngle] = useState<Angle>('eye-level');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('1:1');
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [sceneInputType, setSceneInputType] = useState<'prompt' | 'image'>('prompt');
  const [isAnalyzingReference, setIsAnalyzingReference] = useState(false);

  // загрузка истории
  useEffect(() => {
    (async () => {
      const loadedHistory = await historyService.loadHistory();
      setHistory(loadedHistory);
    })();
  }, []);

  const ensureCredits = useCallback(
    async (action: CreditAction, metadata?: Record<string, unknown>) => {
      try {
        await requireCredits(action, metadata);
        setCreditError(null);
        return true;
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'Not enough credits to complete this action.';
        setCreditError(message);
        return false;
      }
    },
    [requireCredits]
  );

  const activeItem = useMemo(
    () => (activeHistoryId ? history.find((item) => item.id === activeHistoryId) : undefined),
    [history, activeHistoryId]
  );
  const originalImage = activeItem?.originalImage;
  const generatedImages = activeItem?.generatedImages ?? [];
  const analysisResult = activeItem?.analysisResult ?? '';

  const handleReferenceAnalyze = useCallback(async (image: UploadedImage) => {
    setIsAnalyzingReference(true);
    setError(null);
    try {
      const prompt = await analyzeSceneReference(image.src, image.mimeType);
      setScenePrompt(prompt);
      setSceneInputType('prompt');
    } catch (e) {
      console.error(e);
      setError('Failed to analyze the reference image. Please try again.');
    } finally {
      setIsAnalyzingReference(false);
      setSceneReferenceImage(null);
    }
  }, []);

  useEffect(() => {
    if (sceneReferenceImage) handleReferenceAnalyze(sceneReferenceImage);
  }, [sceneReferenceImage, handleReferenceAnalyze]);

  const handleAnalysisUpdate = useCallback(
    async (newAnalysis: string) => {
      if (!activeHistoryId) return;

      let itemToSave: HistoryItem | null = null;
      setHistory((prev) =>
        prev.map((item) => {
          if (item.id === activeHistoryId) {
            const updatedItem = { ...item, analysisResult: newAnalysis };
            itemToSave = updatedItem;
            return updatedItem;
          }
          return item;
        })
      );

      if (itemToSave) await historyService.saveHistoryItem(itemToSave);
    },
    [activeHistoryId]
  );

  const handleImageUpload = useCallback(
    async (uploadedImage: UploadedImage) => {
      setError(null);
      setCreditError(null);

      const hasCredits = await ensureCredits('analyze_image', { mimeType: uploadedImage.mimeType });
      if (!hasCredits) return;

      setIsLoading(true);
      setLoadingMessage('Analyzing your product...');

      const newHistoryItem: HistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        timestamp: Date.now(),
        originalImage: uploadedImage,
        analysisResult: '',
        generatedImages: [],
      };

      setHistory((prev) => [newHistoryItem, ...prev]);
      await historyService.saveHistoryItem(newHistoryItem);

      setActiveHistoryId(newHistoryItem.id);
      setSelectedImage(uploadedImage.src);
      setSceneIdeas([]);
      setScenePrompt('');
      setSceneReferenceImage(null);
      setSelectedAngle('eye-level');
      setSelectedAspectRatio('1:1');

      try {
        const result = await analyzeImage(uploadedImage.src, uploadedImage.mimeType);
        const updatedItem = { ...newHistoryItem, analysisResult: result };
        setHistory((prev) => prev.map((i) => (i.id === newHistoryItem.id ? updatedItem : i)));
        await historyService.saveHistoryItem(updatedItem);
      } catch (e) {
        console.error(e);
        setError('Failed to analyze the image. Please try again.');
      } finally {
        setIsLoading(false);
        setLoadingMessage('');
      }
    },
    [ensureCredits]
  );

  const handleGenerate = useCallback(
    async (options: GenerateOptions) => {
      const { type, prompt } = options;

      if (!selectedImage || !originalImage || !activeHistoryId || !activeItem) {
        setError('Please upload and select an image first.');
        return;
      }

      setError(null);
      setCreditError(null);

      const creditAction: CreditAction = type === 'scene' ? 'generate_scene' : 'edit_image';
      const hasCredits = await ensureCredits(creditAction, {
        type,
        angle: selectedAngle,
        aspectRatio: selectedAspectRatio,
      });
      if (!hasCredits) return;

      setIsLoading(true);
      setLoadingMessage(type === 'scene' ? 'Creating new scene...' : 'Applying edit...');

      try {
        let imageToProcess: string;
        const mimeType = originalImage.mimeType;
        let fullPrompt: string;

        if (type === 'edit') {
          if (!prompt) throw new Error('Edit prompt is missing.');
          imageToProcess = selectedImage;
          fullPrompt = prompt;
        } else {
          imageToProcess = await resizeImageWithAspectRatio(
            originalImage.src,
            mimeType,
            selectedAspectRatio
          );
          const angleDescription = ANGLE_DESCRIPTIONS[selectedAngle];
          const aspectRatioDescription = ASPECT_RATIO_DESCRIPTIONS[selectedAspectRatio];

          if (!prompt) throw new Error('Scene prompt is missing.');
          fullPrompt = `
!IMPERATIVE RULE: FILL THE ENTIRE IMAGE. Do NOT add white borders, black borders, or frames of any kind. The generated scene must extend to every single edge of the canvas. This is a top-priority instruction.

TASK: This is an "out-painting" or "un-crop" operation.
The provided image contains a product centered on a white canvas that has the desired final aspect ratio (${aspectRatioDescription}). You must replace ALL of the white areas with a new, cohesive scene.

INSTRUCTIONS:
1.  **Scene:** Create the following scene: "${prompt}".
2.  **Angle:** Use this camera perspective: ${angleDescription}.
3.  **Blend:** The product must be seamlessly blended into the new background.
4.  **Preserve:** The product itself MUST NOT BE CHANGED. Preserve its size, color, details, and position exactly as it is in the original image.
5.  **VERIFY:** Before finishing, ensure the entire canvas is filled. There should be zero empty space or borders.
`;
        }

        const newImageSrc = await generateOrEditImage(imageToProcess, mimeType, fullPrompt);
        const newImageWithMime = `data:${mimeType};base64,${newImageSrc}`;

        let itemToSave: HistoryItem | null = null;
        setHistory((prev) =>
          prev.map((item) => {
            if (item.id === activeHistoryId) {
              const updatedItem = {
                ...item,
                generatedImages: [...item.generatedImages, newImageWithMime],
              };
              itemToSave = updatedItem;
              return updatedItem;
            }
            return item;
          })
        );

        if (itemToSave) await historyService.saveHistoryItem(itemToSave);
        setSelectedImage(newImageWithMime);
      } catch (e) {
        console.error(e);
        setError(`Failed to generate image: ${e instanceof Error ? e.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
        setLoadingMessage('');
      }
    },
    [
      selectedImage,
      originalImage,
      selectedAngle,
      selectedAspectRatio,
      activeHistoryId,
      activeItem,
      ensureCredits,
    ]
  );

  const handleGenerateIdeas = useCallback(async () => {
    if (!analysisResult) {
      setError('Product analysis must complete before generating ideas.');
      return;
    }
    setError(null);
    setCreditError(null);

    const hasCredits = await ensureCredits('generate_ideas', {
      historyId: activeHistoryId ?? undefined,
    });
    if (!hasCredits) return;

    setIsGeneratingIdeas(true);
    setSceneIdeas([]);
    try {
      const ideas = await generateSceneIdeas(analysisResult);
      setSceneIdeas(ideas);
    } catch (e) {
      console.error(e);
      setError("Sorry, I couldn't come up with ideas right now. Please try again.");
    } finally {
      setIsGeneratingIdeas(false);
    }
  }, [analysisResult, activeHistoryId, ensureCredits]);

  const handleCreateVariation = useCallback(async () => {
    if (!selectedImage || !originalImage || !activeHistoryId || !activeItem) {
      setError('Please select an image to create a variation of.');
      return;
    }

    setError(null);
    setCreditError(null);
    const hasCredits = await ensureCredits('variation', { historyId: activeHistoryId });
    if (!hasCredits) return;

    setIsLoading(true);
    setLoadingMessage('Creating variation...');

    try {
      const mimeType = originalImage.mimeType;
      const variationPrompt =
        "Generate a creative variation of this image. Your task is to alter the background and environment to give the scene a fresh look, while keeping the original theme and context intact. For example, if the product is in a forest, create a different type of forest scene (e.g., different trees, lighting, or time of day). If the product is in a room, change the room's decor, style, or furniture. The goal is to provide a distinct alternative, not a completely different concept. It is absolutely crucial that the main product itself remains identical — do not alter its size, shape, color, details, or position in any way.";

      const newImageSrc = await generateOrEditImage(selectedImage, mimeType, variationPrompt);
      const newImageWithMime = `data:${mimeType};base64,${newImageSrc}`;

      let itemToSave: HistoryItem | null = null;
      setHistory((prev) =>
        prev.map((item) => {
          if (item.id === activeHistoryId) {
            const updatedItem = {
              ...item,
              generatedImages: [...item.generatedImages, newImageWithMime],
            };
            itemToSave = updatedItem;
            return updatedItem;
          }
          return item;
        })
      );

      if (itemToSave) await historyService.saveHistoryItem(itemToSave);
      setSelectedImage(newImageWithMime);
    } catch (e) {
      console.error(e);
      setError('Failed to create variation. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [selectedImage, originalImage, activeHistoryId, activeItem, ensureCredits]);

  const handleEnhancePrompt = useCallback(async () => {
    if (!scenePrompt.trim()) {
      setError('Please enter a prompt to enhance.');
      return;
    }
    setIsEnhancingPrompt(true);
    setError(null);
    try {
      const enhanced = await enhancePrompt(scenePrompt);
      setScenePrompt(enhanced);
    } catch (e) {
      console.error(e);
      setError("Sorry, I couldn't enhance the prompt right now. Please try again.");
    } finally {
      setIsEnhancingPrompt(false);
    }
  }, [scenePrompt]);

  const handleSelectHistory = (id: string) => {
    const item = history.find((i) => i.id === id);
    if (item) {
      setActiveHistoryId(id);
      setSelectedImage(
        item.generatedImages.length > 0
          ? item.generatedImages[item.generatedImages.length - 1]
          : item.originalImage.src
      );
      setScenePrompt('');
      setSceneReferenceImage(null);
      setSceneIdeas([]);
      setError(null);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    await historyService.deleteHistoryItem(id);
    if (activeHistoryId === id) {
      setActiveHistoryId(null);
      setSelectedImage(null);
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear all history? This cannot be undone.')) {
      setHistory([]);
      await historyService.clearHistory();
      setActiveHistoryId(null);
      setSelectedImage(null);
    }
  };

  const handleDeleteGeneratedImage = useCallback(
    async (imageSrcToDelete: string) => {
      if (!activeHistoryId || !activeItem) return;

      let itemToSave: HistoryItem | null = null;
      let wasSelectedImageDeleted = false;

      setHistory((prev) =>
        prev.map((item) => {
          if (item.id === activeHistoryId) {
            const updatedGeneratedImages = item.generatedImages.filter(
              (src) => src !== imageSrcToDelete
            );
            const updatedItem = { ...item, generatedImages: updatedGeneratedImages };
            itemToSave = updatedItem;

            if (selectedImage === imageSrcToDelete) wasSelectedImageDeleted = true;

            return updatedItem;
          }
          return item;
        })
      );

      if (wasSelectedImageDeleted) {
        const remainingImages = itemToSave?.generatedImages ?? [];
        if (remainingImages.length > 0) {
          setSelectedImage(remainingImages[remainingImages.length - 1]);
        } else {
          setSelectedImage(activeItem.originalImage.src);
        }
      }

      if (itemToSave) await historyService.saveHistoryItem(itemToSave);
    },
    [activeHistoryId, activeItem, selectedImage]
  );

  const handleSaveEditedImage = async (newImageSrc: string) => {
    if (!activeHistoryId || !activeItem) {
      setError('Cannot save image without an active session.');
      setEditingImage(null);
      return;
    }

    let itemToSave: HistoryItem | null = null;
    setHistory((prev) =>
      prev.map((item) => {
        if (item.id === activeHistoryId) {
          const updatedItem = {
            ...item,
            generatedImages: [...item.generatedImages, newImageSrc],
          };
          itemToSave = updatedItem;
          return updatedItem;
        }
        return item;
      })
    );

    if (itemToSave) await historyService.saveHistoryItem(itemToSave);
    setSelectedImage(newImageSrc);
    setEditingImage(null);
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col">
      <Header />

      {/* статус кредитов и кнопка пополнения */}
      <div className="container mx-auto px-4 pt-4">
        <CreditStatus credits={credits ?? 0} onAddCredits={() => navigate('/subscriptions')} />
        {creditError && (
          <div className="mt-3 bg-yellow-500/10 border border-yellow-500/40 text-yellow-200 p-3 rounded-md">
            {creditError}
          </div>
        )}
      </div>

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-[#1C1C1E] border border-neutral-800 p-6 rounded-2xl shadow-lg flex flex-col gap-6 h-fit">
            <ImageUploader onImageUpload={handleImageUpload} disabled={isLoading} />
            <HistoryPanel
              history={history}
              activeHistoryId={activeHistoryId}
              onSelectHistory={handleSelectHistory}
              onDeleteHistory={handleDeleteHistory}
              onClearHistory={handleClearHistory}
              disabled={isLoading}
            />
            <ControlPanel
              onGenerate={handleGenerate}
              analysisResult={analysisResult}
              onAnalysisUpdate={handleAnalysisUpdate}
              isAnalyzing={!analysisResult && isLoading && loadingMessage.includes('Analyzing')}
              disabled={isLoading || !activeHistoryId}
              onGenerateIdeas={handleGenerateIdeas}
              sceneIdeas={sceneIdeas}
              isGeneratingIdeas={isGeneratingIdeas}
              selectedAngle={selectedAngle}
              onAngleChange={setSelectedAngle}
              selectedAspectRatio={selectedAspectRatio}
              onAspectRatioChange={setSelectedAspectRatio}
              scenePrompt={scenePrompt}
              onScenePromptChange={setScenePrompt}
              onEnhancePrompt={handleEnhancePrompt}
              isEnhancingPrompt={isEnhancingPrompt}
              sceneReferenceImage={sceneReferenceImage}
              onSceneReferenceChange={setSceneReferenceImage}
              sceneInputType={sceneInputType}
              onSceneInputTypeChange={setSceneInputType}
              isAnalyzingReference={isAnalyzingReference}
            />
          </div>

          <div className="lg:col-span-2 bg-[#1C1C1E] border border-neutral-800 p-6 rounded-2xl shadow-lg">
            {error && (
              <div
                className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-md mb-4"
                onClick={() => setError(null)}
              >
                {error}
              </div>
            )}

            {!activeItem && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center text-neutral-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <h2 className="text-2xl font-bold">Welcome to eRanker Thumbnail Creator</h2>
                <p className="mt-2">Upload a product image to get started.</p>
              </div>
            )}

            {isLoading && !activeItem && (
              <div className="flex items-center justify-center h-full min-h-[60vh]">
                <Spinner />
                <span className="ml-4 text-lg">{loadingMessage}</span>
              </div>
            )}

            {activeItem && originalImage && (
              <ImageDisplay
                selectedImage={selectedImage}
                originalImage={originalImage}
                generatedImages={generatedImages}
                onSelectImage={setSelectedImage}
                isLoading={isLoading}
                loadingMessage={loadingMessage}
                onVariation={handleCreateVariation}
                onDeleteImage={handleDeleteGeneratedImage}
                onCrop={setEditingImage}
                aspectRatio={selectedAspectRatio}
              />
            )}
          </div>
        </div>
      </main>

      {editingImage && (
        <CropModal
          imageSrc={editingImage}
          onClose={() => setEditingImage(null)}
          onSave={handleSaveEditedImage}
        />
      )}
    </div>
  );
};

export default StudioPage;

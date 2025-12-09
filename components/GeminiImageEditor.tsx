import React, { useState } from 'react';
import { editImage } from '../services/geminiService';
import { Wand2, Loader2, Image as ImageIcon, Save, X } from 'lucide-react';

interface GeminiImageEditorProps {
  currentImageUrl?: string;
  onSave: (newImageUrl: string) => void;
  onCancel: () => void;
}

export const GeminiImageEditor: React.FC<GeminiImageEditorProps> = ({ currentImageUrl, onSave, onCancel }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(currentImageUrl || null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage || !prompt) return;

    setIsLoading(true);
    setError(null);

    try {
      // Extract base64 data (remove header)
      const base64Data = selectedImage.split(',')[1];
      const mimeType = selectedImage.split(';')[0].split(':')[1];
      
      const resultImage = await editImage(base64Data, prompt, mimeType);
      setSelectedImage(resultImage);
      setPrompt(''); // Clear prompt after success
    } catch (err: any) {
      setError(err.message || "Failed to process image");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-600" />
            Editor IA de Ambulancias
          </h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* Image Preview Area */}
            <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden border-2 border-dashed border-slate-300 flex items-center justify-center group">
              {selectedImage ? (
                <img 
                  src={selectedImage} 
                  alt="Preview" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-6">
                  <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No hay imagen seleccionada</p>
                </div>
              )}
              
              {/* Overlay for upload */}
              <label className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors cursor-pointer flex items-center justify-center">
                 <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                 <span className="bg-white/90 text-slate-700 px-4 py-2 rounded-full shadow-sm text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                   {selectedImage ? 'Cambiar Imagen' : 'Subir Imagen'}
                 </span>
              </label>
            </div>

            {/* AI Controls */}
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
              <label className="block text-sm font-medium text-purple-900 mb-2">
                Instrucción para Gemini (Ej: "Eliminar el fondo", "Hacer que parezca de noche")
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe cómo editar la imagen..."
                  className="flex-1 rounded-md border-purple-200 focus:border-purple-500 focus:ring-purple-500"
                />
                <button
                  onClick={handleGenerate}
                  disabled={isLoading || !selectedImage || !prompt}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  Generar
                </button>
              </div>
              {error && (
                <p className="mt-2 text-red-600 text-sm">{error}</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end gap-3">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg font-medium"
          >
            Cancelar
          </button>
          <button 
            onClick={() => selectedImage && onSave(selectedImage)}
            disabled={!selectedImage}
            className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};
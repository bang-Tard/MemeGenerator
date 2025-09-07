
import React, { useState, useCallback, useRef } from 'react';
import { generateMeme } from './services/geminiService';
import type { MemeResult } from './types';
import LoadingSpinner from './components/LoadingSpinner';
import LogoIcon from './components/icons/LogoIcon';

type OutputStyle = 'one-image' | 'webtoon' | 'contrast';

const App: React.FC = () => {
  const [character, setCharacter] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [memeResult, setMemeResult] = useState<MemeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<{ file: File | null; dataUrl: string | null }>({ file: null, dataUrl: null });
  const [outputStyle, setOutputStyle] = useState<OutputStyle>('one-image');
  const [useRealtime, setUseRealtime] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Please upload a valid image file (JPEG, PNG, WebP).');
        return;
      }
      setError(null);
      setOutputStyle('one-image');
      setUseRealtime(false); // Disable real-time trends when an image is uploaded
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImage({ file, dataUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearReferenceImage = () => {
    setReferenceImage({ file: null, dataUrl: null });
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleGenerateMeme = useCallback(async () => {
    if (!character.trim()) {
      setError('Please enter a character description.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setMemeResult(null);

    let imageParam: { mimeType: string; data: string } | null = null;
    if (referenceImage.file && referenceImage.dataUrl) {
      const base64String = referenceImage.dataUrl.split(',')[1];
      imageParam = {
        mimeType: referenceImage.file.type,
        data: base64String
      };
    }

    try {
      const result = await generateMeme(character, imageParam, outputStyle, useRealtime);
      setMemeResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [character, referenceImage, outputStyle, useRealtime]);
  
  const handleTextAreaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleGenerateMeme();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <LogoIcon className="w-10 h-10 text-purple-400" />
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
              AI Viral Meme Generator
            </h1>
          </div>
          <p className="text-lg text-gray-400">
            Describe a character, and AI will create a funny meme based on the latest trends!
          </p>
        </header>

        <main className="w-full">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-2xl shadow-purple-500/10 border border-gray-700">
            <div className="flex flex-col gap-6">
              <div>
                <label htmlFor="character-input" className="text-lg font-semibold text-gray-300">
                  Meme Character Description:
                </label>
                <textarea
                  id="character-input"
                  value={character}
                  onChange={(e) => setCharacter(e.target.value)}
                  onKeyDown={handleTextAreaKeyDown}
                  placeholder="e.g., A tired office worker cat wearing glasses"
                  className="mt-2 w-full h-28 p-4 bg-gray-900 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 resize-none text-white placeholder-gray-500"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="text-lg font-semibold text-gray-300">
                  Output Style:
                </label>
                 <p className="text-sm text-gray-400 mt-1">Style selection is disabled when using a reference image.</p>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {([
                      {id: 'one-image', label: 'Single Image'},
                      {id: 'webtoon', label: 'Webtoon'},
                      {id: 'contrast', label: 'Contrast Meme'}
                  ] as const).map(style => (
                      <button
                          key={style.id}
                          onClick={() => setOutputStyle(style.id)}
                          disabled={isLoading || !!referenceImage.dataUrl}
                          className={`w-full p-3 font-semibold rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500
                              ${outputStyle === style.id ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-700 border-gray-600 hover:bg-gray-600/70 text-gray-300'}
                              ${(isLoading || !!referenceImage.dataUrl) ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                          aria-pressed={outputStyle === style.id}
                      >
                          {style.label}
                      </button>
                  ))}
                </div>
              </div>


              <div>
                <label className="text-lg font-semibold text-gray-300">
                  Reference Image (Optional):
                </label>
                <div className="mt-2">
                  {!referenceImage.dataUrl ? (
                    <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-900 hover:bg-gray-800 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                        </svg>
                        <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-500">PNG, JPG or WEBP</p>
                      </div>
                      <input id="file-upload" ref={fileInputRef} type="file" className="hidden" onChange={handleImageChange} accept="image/png, image/jpeg, image/webp"/>
                    </label>
                  ) : (
                    <div className="relative w-full max-w-sm mx-auto">
                      <img src={referenceImage.dataUrl} alt="Reference preview" className="rounded-lg w-full h-auto max-h-64 object-contain" />
                      <button onClick={clearReferenceImage} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition-colors" aria-label="Remove image">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-center bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                  <label htmlFor="realtime-toggle" className="flex items-center cursor-pointer">
                      <span className="mr-3 text-md font-medium text-gray-300">Use Real-time Trends</span>
                      <div className="relative">
                          <input 
                            type="checkbox" 
                            id="realtime-toggle" 
                            className="sr-only" 
                            checked={useRealtime}
                            onChange={() => setUseRealtime(!useRealtime)}
                            disabled={isLoading || !!referenceImage.dataUrl}
                          />
                          <div className={`block w-14 h-8 rounded-full transition ${useRealtime ? 'bg-purple-600' : 'bg-gray-600'}`}></div>
                          <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${useRealtime ? 'transform translate-x-6' : ''}`}></div>
                      </div>
                  </label>
              </div>


              <button
                onClick={handleGenerateMeme}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  'Generate Meme ✨'
                )}
              </button>
            </div>
          </div>

          <div className="mt-10">
            {isLoading && <LoadingSpinner />}
            {error && <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg">{error}</div>}
            
            {memeResult && (
              <div className="bg-gray-800 rounded-2xl overflow-hidden shadow-2xl animate-fade-in border border-gray-700">
                <div className="relative w-full max-w-lg mx-auto">
                    <img 
                        src={memeResult.imageUrl} 
                        alt="Generated meme" 
                        className="w-full h-auto object-contain"
                    />
                    <div className="absolute bottom-4 left-4 right-4 bg-black/70 p-3 rounded-lg backdrop-blur-sm">
                        <p className="text-center text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
                            "{memeResult.text}"
                        </p>
                    </div>
                </div>
                 {memeResult.sources && memeResult.sources.length > 0 && (
                  <div className="p-4 border-t border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-400 mb-2">Sources (based on Google Search):</h3>
                    <ul className="space-y-1">
                      {memeResult.sources.map((source, index) => (
                        <li key={index} className="text-xs">
                          <a 
                            href={source.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-purple-300 hover:text-purple-200 hover:underline truncate"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                            </svg>
                            <span className="truncate">{source.title || new URL(source.uri).hostname}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            {!isLoading && !memeResult && (
                <div className="text-center text-gray-500 p-8">
                    <p>Your generated meme will be displayed here.</p>
                </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;

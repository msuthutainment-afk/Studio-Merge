
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ImageState, BrandingConfig, GeneratedMetadata } from './types';
import { generateImageMetadata, artisticMergeImages } from './services/geminiService';

const App: React.FC = () => {
  const [bgImage, setBgImage] = useState<ImageState | null>(null);
  const [subjectImage, setSubjectImage] = useState<ImageState | null>(null);
  const [logo, setLogo] = useState<ImageState | null>(null);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [metadata, setMetadata] = useState<GeneratedMetadata | null>(null);
  const [config, setConfig] = useState<BrandingConfig>({
    logoSize: 24, // Increased 3x from previous 8
    padding: 25,
    circleOpacity: 1,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    isBlurEnabled: false,
    subjectSide: 'left',
    subjectZoom: 50
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'bg' | 'subject' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const state = {
          src: event.target?.result as string,
          file,
          width: img.width,
          height: img.height
        };
        if (type === 'bg') setBgImage(state);
        else if (type === 'subject') setSubjectImage(state);
        else setLogo(state);
        if (type !== 'logo') setAiResult(null);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleMagicMerge = async () => {
    if (!bgImage || !subjectImage) return;
    setIsMerging(true);
    try {
      const result = await artisticMergeImages(
        bgImage.src, 
        subjectImage.src, 
        config.isBlurEnabled,
        config.subjectSide,
        config.subjectZoom
      );
      setAiResult(result);
    } catch (error) {
      console.error("Magic Merge failed", error);
      alert("Failed to merge images. Please try again.");
    } finally {
      setIsMerging(false);
    }
  };

  const drawCanvas = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const targetWidth = 1920;
    const targetHeight = 1080;
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const finalizeWithLogo = () => {
      if (logo) {
        const logoImg = new Image();
        logoImg.src = logo.src;
        logoImg.onload = () => {
          const logoScale = (targetWidth * config.logoSize) / 100;
          const logoAspectRatio = logoImg.width / logoImg.height;
          
          let logoW, logoH;
          if (logoAspectRatio > 1) {
            logoW = logoScale;
            logoH = logoScale / logoAspectRatio;
          } else {
            logoH = logoScale;
            logoW = logoScale * logoAspectRatio;
          }

          const centerX = targetWidth / 2;
          const centerY = targetHeight - (logoH / 2) - config.padding;

          const drawX = centerX - logoW / 2;
          const drawY = centerY - logoH / 2;

          ctx.save();
          ctx.globalAlpha = config.circleOpacity;

          // Create a soft "round" dark shadow underneath the logo
          const shadowRadius = Math.max(logoW, logoH) * 0.75;
          const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, shadowRadius);
          gradient.addColorStop(0, 'rgba(0, 0, 0, 0.5)'); // Core shadow
          gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)'); // Mid fade
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Full transparent edge
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(centerX, centerY, shadowRadius, 0, Math.PI * 2);
          ctx.fill();

          // Draw the actual logo on top of the shadow
          ctx.drawImage(logoImg, drawX, drawY, logoW, logoH);
          ctx.restore();
        };
      }
    };

    if (aiResult) {
      const img = new Image();
      img.onload = () => {
        ctx.filter = `brightness(${config.brightness}%) contrast(${config.contrast}%) saturate(${config.saturation}%)`;
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        ctx.filter = 'none';
        finalizeWithLogo();
      };
      img.src = aiResult;
    } else if (bgImage) {
      const img = new Image();
      img.onload = () => {
        const aspectRatio = bgImage.width / bgImage.height;
        const targetRatio = targetWidth / targetHeight;
        let drawW, drawH, offX, offY;

        if (aspectRatio > targetRatio) {
          drawW = targetHeight * aspectRatio;
          drawH = targetHeight;
          offX = (targetWidth - drawW) / 2;
          offY = 0;
        } else {
          drawW = targetWidth;
          drawH = targetWidth / aspectRatio;
          offX = 0;
          offY = (targetHeight - drawH) / 2;
        }
        
        ctx.filter = config.isBlurEnabled ? 'blur(10px)' : 'none';
        ctx.drawImage(img, offX, offY, drawW, drawH);
        ctx.filter = 'none';
        
        if (subjectImage) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.font = 'bold 32px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`Aligning to ${config.subjectSide.toUpperCase()} with ${config.subjectZoom}% Zoom`, targetWidth/2, targetHeight/2);
        }
        
        finalizeWithLogo();
      };
      img.src = bgImage.src;
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      finalizeWithLogo();
    }
  }, [bgImage, subjectImage, logo, aiResult, config]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleAnalyze = async () => {
    if (!canvasRef.current) return;
    setIsProcessing(true);
    try {
      const dataUrl = canvasRef.current.toDataURL('image/jpeg');
      const aiMetadata = await generateImageMetadata(dataUrl);
      setMetadata(aiMetadata);
    } catch (error) {
      console.error("AI Analysis failed", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `${metadata?.suggestedFilename || 'studio-merge-branded'}.jpg`;
    link.href = canvasRef.current.toDataURL('image/jpeg', 0.95);
    link.click();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0d11] text-gray-200">
      <header className="bg-[#12151c] border-b border-gray-800/50 px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 rotate-3">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white uppercase italic">Studio Merge</h1>
            <p className="text-[10px] font-bold text-indigo-400 tracking-[0.3em] uppercase">AI-First Branding</p>
          </div>
        </div>
        <div className="flex gap-4">
          {aiResult && (
            <button 
              onClick={handleAnalyze}
              disabled={isProcessing}
              className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 rounded-xl hover:bg-indigo-500/20 disabled:opacity-50 transition-all"
            >
              {isProcessing ? 'AI Analyzing...' : 'Smart SEO Tags'}
            </button>
          )}
          <button 
            onClick={downloadImage}
            disabled={!bgImage && !aiResult}
            className="px-8 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 hover:shadow-indigo-500/40 disabled:opacity-20 transition-all shadow-xl flex items-center gap-2"
          >
            Export Final
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden p-6 lg:p-10 gap-8">
        <div className="flex-1 flex flex-col gap-6 relative">
          <div className="flex-1 bg-[#181d26] rounded-[3rem] border border-gray-800/50 shadow-inner flex items-center justify-center p-8 overflow-hidden relative">
            {isMerging && (
              <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-widest">Rendering Studio</h3>
                  <p className="text-gray-400 text-sm italic">Removing background & merging sharp subject...</p>
                </div>
              </div>
            )}
            
            {!bgImage ? (
              <div className="text-center p-12">
                <div className="w-32 h-32 bg-gray-800/30 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-gray-700/50">
                  <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="text-2xl font-black text-white mb-3 tracking-tighter uppercase">Creative Bay</h3>
                <p className="text-gray-500 text-sm max-w-xs mx-auto leading-relaxed">Combine a scene and an unedited subject for a pro-branded finish.</p>
              </div>
            ) : (
              <div className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)] bg-black ring-1 ring-white/10">
                <canvas ref={canvasRef} className="w-full h-full object-contain" />
              </div>
            )}
          </div>
          
          <div className="flex justify-center">
            <button 
              onClick={handleMagicMerge}
              disabled={!bgImage || !subjectImage || isMerging}
              className={`px-12 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-sm transition-all flex items-center gap-4 ${(!bgImage || !subjectImage) ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-white text-black hover:bg-indigo-400 hover:text-white shadow-2xl hover:scale-105 active:scale-95'}`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.12z" clipRule="evenodd" /></svg>
              {isMerging ? 'Compositing...' : 'Artistic AI Merge'}
            </button>
          </div>
        </div>

        <aside className="w-full lg:w-[400px] flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
          <div className="bg-[#12151c] p-6 rounded-[2rem] border border-gray-800/50 space-y-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Assets Manager</h2>
            
            <div className="space-y-4">
              <div className="relative">
                <label className={`block h-28 rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${bgImage ? 'border-indigo-500 bg-indigo-500/5' : 'border-gray-800 hover:border-gray-600'}`}>
                  {bgImage ? <img src={bgImage.src} className="absolute inset-0 w-full h-full object-cover opacity-30" /> : null}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">01. Scene Photo</span>
                    <p className="text-[9px] text-gray-500 mt-1 uppercase truncate max-w-full px-4">{bgImage ? bgImage.file?.name : 'Upload Base'}</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'bg')} />
                </label>
                
                <div className="mt-4 flex items-center justify-between bg-gray-900/40 p-3 rounded-xl border border-gray-800/50">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-gray-400">Scene Blur (10%)</span>
                    <span className="text-[8px] text-gray-600 uppercase">Pro depth effect</span>
                  </div>
                  <button 
                    onClick={() => setConfig({...config, isBlurEnabled: !config.isBlurEnabled})}
                    className={`w-12 h-6 rounded-full transition-all relative shadow-inner ${config.isBlurEnabled ? 'bg-indigo-600' : 'bg-gray-700'}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-md ${config.isBlurEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className={`block relative h-28 rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${subjectImage ? 'border-indigo-500 bg-indigo-500/5' : 'border-gray-800 hover:border-gray-600'}`}>
                  {subjectImage ? <img src={subjectImage.src} className="absolute inset-0 w-full h-full object-cover opacity-30" /> : null}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">02. Unedited Subject</span>
                    <p className="text-[9px] text-gray-500 mt-1 uppercase truncate max-w-full px-4">{subjectImage ? subjectImage.file?.name : 'Remove BG only'}</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'subject')} />
                </label>

                <div className="flex bg-gray-900/40 rounded-xl p-1 border border-gray-800/50">
                  <button 
                    onClick={() => setConfig({...config, subjectSide: 'left'})}
                    className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${config.subjectSide === 'left' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Align Left
                  </button>
                  <button 
                    onClick={() => setConfig({...config, subjectSide: 'right'})}
                    className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${config.subjectSide === 'right' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Align Right
                  </button>
                </div>

                <div className="bg-gray-900/40 p-3 rounded-xl border border-gray-800/50">
                  <div className="flex justify-between text-[10px] font-black uppercase mb-2 text-gray-500">
                    <span>Subject Zoom</span>
                    <span className="text-indigo-400">{config.subjectZoom}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={config.subjectZoom} 
                    onChange={(e) => setConfig({...config, subjectZoom: +e.target.value})} 
                    className="w-full accent-indigo-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer" 
                  />
                </div>
              </div>
            </div>

            <label className="flex items-center gap-4 bg-gray-800/20 p-4 rounded-2xl border border-gray-800/50 hover:bg-gray-800/40 cursor-pointer transition-all group">
              <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform overflow-hidden p-2">
                {logo ? <img src={logo.src} className="w-full h-full object-contain" /> : <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse" />}
              </div>
              <div className="flex-1">
                <p className="text-xs font-black uppercase text-white tracking-wider italic">Logo Overlay</p>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest italic underline decoration-indigo-500">Shadowed Center</p>
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} />
            </label>
          </div>

          <section className="bg-[#12151c] p-6 rounded-[2rem] border border-gray-800/50 space-y-6">
             <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Master Grade Controls</h2>
             
             <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-[10px] font-black uppercase mb-3 text-gray-500">
                    <span>Final Brightness</span>
                    <span className="text-indigo-400">{config.brightness}%</span>
                  </div>
                  <input type="range" min="50" max="150" value={config.brightness} onChange={(e) => setConfig({...config, brightness: +e.target.value})} className="w-full accent-indigo-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer" />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-black uppercase mb-3 text-gray-500">
                    <span>Final Saturation</span>
                    <span className="text-indigo-400">{config.saturation}%</span>
                  </div>
                  <input type="range" min="0" max="200" value={config.saturation} onChange={(e) => setConfig({...config, saturation: +e.target.value})} className="w-full accent-indigo-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer" />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-black uppercase mb-3 text-gray-500">
                    <span>Logo Scale (3x Boost)</span>
                    <span className="text-indigo-400">{config.logoSize}%</span>
                  </div>
                  <input type="range" min="5" max="65" value={config.logoSize} onChange={(e) => setConfig({...config, logoSize: +e.target.value})} className="w-full accent-indigo-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer" />
                </div>
             </div>
          </section>

          {metadata && (
            <section className="bg-gradient-to-br from-indigo-900 to-purple-900 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] mb-6 text-indigo-300">Semantic AI Output</h2>
              <div className="space-y-5">
                <div>
                  <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Alt Description</p>
                  <p className="bg-black/20 p-4 rounded-xl text-[11px] leading-relaxed text-indigo-100 border border-white/5">{metadata.altText}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-2">SEO Filename</p>
                  <p className="bg-black/20 p-3 rounded-xl font-mono text-[10px] text-indigo-200 border border-white/5">{metadata.suggestedFilename}.jpg</p>
                </div>
              </div>
            </section>
          )}
        </aside>
      </main>

      <footer className="px-10 py-6 bg-[#0b0d11] border-t border-gray-800 text-center">
        <p className="text-[9px] font-bold uppercase tracking-[0.6em] text-gray-700">
          Studio Merge &bull; Branded Headers v3.5
        </p>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </div>
  );
};

export default App;

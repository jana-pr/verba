'use client';

import React, { useState } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';

interface AudioButtonProps {
  text: string;
  lang?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const AudioButton: React.FC<AudioButtonProps> = ({
  text,
  lang = 'en-US',
  className = '',
  size = 'md',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isPlaying) return;
    setIsPlaying(true);

    try {
      // 1. Try Browser Web Speech API first (fastest, 0ms latency)
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Stop any pending speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.92; // Slightly clearer for language learning
        
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => {
          fallbackAudio();
        };

        window.speechSynthesis.speak(utterance);
        return;
      }

      fallbackAudio();
    } catch (err) {
      console.error('Audio play error:', err);
      setIsPlaying(false);
    }
  };

  const fallbackAudio = async () => {
    try {
      const audioUrl = `/api/tts?text=${encodeURIComponent(text)}&lang=${encodeURIComponent(lang)}`;
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      await audio.play();
    } catch {
      setIsPlaying(false);
    }
  };

  const isSm = size === 'sm';

  return (
    <button
      type="button"
      onClick={handlePlay}
      disabled={isPlaying}
      className={`inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-verba-slate hover:text-verba-indigo hover:border-indigo-200 transition-colors shadow-2xs active:scale-95 ${
        isSm ? 'p-1.5' : 'p-2'
      } ${className}`}
      title="Přehrát výslovnost"
      aria-label="Přehrát výslovnost"
    >
      {isPlaying ? (
        <Loader2 className={`${isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'} animate-spin text-verba-indigo`} />
      ) : (
        <Volume2 className={`${isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
      )}
    </button>
  );
};

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Square } from 'lucide-react';

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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isPlaying) {
      stopAudio();
      return;
    }

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
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
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
      onClick={handleToggle}
      className={`inline-flex items-center justify-center rounded-lg border transition-all shadow-2xs active:scale-95 ${
        isPlaying
          ? 'border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:border-rose-400 animate-pulse'
          : 'border-slate-200 bg-white text-verba-slate hover:text-verba-indigo hover:border-indigo-200'
      } ${isSm ? 'p-1.5' : 'p-2'} ${className}`}
      title={isPlaying ? 'Zastavit přehrávání' : 'Přehrát výslovnost'}
      aria-label={isPlaying ? 'Zastavit přehrávání' : 'Přehrát výslovnost'}
    >
      {isPlaying ? (
        <Square className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} fill-current`} />
      ) : (
        <Volume2 className={`${isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
      )}
    </button>
  );
};

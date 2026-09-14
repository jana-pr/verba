'use client';

import React, { useEffect, useState } from 'react';
import { QrCode, X, Copy, Check, Smartphone, ArrowUpRight } from 'lucide-react';
import QRCode from 'qrcode';

interface MobileQrModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileQrModal: React.FC<MobileQrModalProps> = ({ isOpen, onClose }) => {
  const [currentUrl, setCurrentUrl] = useState('https://verba-learning.web.app');
  const [copied, setCopied] = useState(false);
  const [qrSrc, setQrSrc] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const targetUrl = isLocal ? 'https://verba-learning.web.app' : window.location.origin;
      setCurrentUrl(targetUrl);
      QRCode.toDataURL(targetUrl, {
        width: 260,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      }).then((dataUrl) => {
        setQrSrc(dataUrl);
      }).catch((err) => {
        console.warn('QR code gen error:', err);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (currentUrl) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md p-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Zavřít"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Otevřít VERBA na mobilu
            </h2>
            <p className="text-xs text-slate-500">
              Optimalizováno pro iPhone 12 mini a menší displeje
            </p>
          </div>
        </div>

        {/* QR Code Card */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 flex flex-col items-center justify-center mb-5">
          <div className="bg-white p-3 rounded-xl shadow-xs border border-slate-200 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc}
              alt="QR kód pro stažení do mobilu"
              className="w-52 h-52 object-contain"
            />
          </div>

          <div className="flex items-center gap-2 max-w-full px-2">
            <span className="text-xs font-mono text-slate-600 truncate max-w-[220px]">
              {currentUrl || 'Načítám adresu...'}
            </span>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors shrink-0"
              title="Kopírovat odkaz"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-600">Zkopírováno</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-slate-500" />
                  <span>Kopírovat</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
            <span>📲</span>
            <span>Instalace na plochu iPhonu (PWA):</span>
          </div>

          <ol className="text-xs text-slate-600 space-y-2 pl-4 list-decimal">
            <li>
              Namiřte <strong>Fotoaparát iPhonu</strong> na QR kód a otevřete odkaz v <strong>Safari</strong>.
            </li>
            <li>
              Dole v Safari klepněte na tlačítko <strong>Sdílet</strong> (čtverec se šipkou nahoru).
            </li>
            <li>
              Vyberte <strong>„Přidat na plochu“</strong> (<em>Add to Home Screen</em>).
            </li>
          </ol>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              ✓ Nativní celoobrazovkový režim bez lišt
            </span>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-medium text-xs transition-colors"
            >
              Rozumím
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

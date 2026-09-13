const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A" />
      <stop offset="45%" stop-color="#1E1B4B" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>

    <linearGradient id="activeRecallGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="60%" stop-color="#14B8A6" />
      <stop offset="100%" stop-color="#0F766E" />
    </linearGradient>

    <linearGradient id="comprehensionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#A5B4FC" />
      <stop offset="50%" stop-color="#6366F1" />
      <stop offset="100%" stop-color="#4338CA" />
    </linearGradient>

    <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="40%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#D97706" stop-opacity="0" />
    </radialGradient>

    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#000000" flood-opacity="0.5" />
    </filter>
  </defs>

  <!-- Squircle Base (Apple style) -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />
  <rect width="508" height="508" x="2" y="2" rx="110" fill="none" stroke="#334155" stroke-width="2.5" stroke-opacity="0.5" />

  <!-- Ambient background glow -->
  <circle cx="256" cy="270" r="140" fill="#6366F1" fill-opacity="0.2" />

  <!-- Geometric V Icon -->
  <g filter="url(#softShadow)">
    <!-- Left Wing (Active Recall: CZ to Target) -->
    <path d="M120 120 C120 110, 134 104, 148 104 L184 104 C196 104, 206 112, 210 124 L256 324 L216 324 L146 132 C142 124, 132 120, 120 120 Z" fill="url(#activeRecallGrad)" />
    <path d="M148 104 L256 392 L220 392 L120 120 Z" fill="url(#activeRecallGrad)" opacity="0.9" />

    <!-- Right Wing (Comprehension: Target to CZ) -->
    <path d="M392 120 C392 110, 378 104, 364 104 L328 104 C316 104, 306 112, 302 124 L256 324 L296 324 L366 132 C370 124, 380 120, 392 120 Z" fill="url(#comprehensionGrad)" />
    <path d="M364 104 L256 392 L292 392 L392 120 Z" fill="url(#comprehensionGrad)" opacity="0.9" />

    <!-- Central Chevron Accent -->
    <path d="M210 240 L256 350 L302 240 L276 240 L256 294 L236 240 Z" fill="#EEF2FF" opacity="0.9" />

    <!-- Gold Mastery Node at Vertex -->
    <circle cx="256" cy="392" r="32" fill="url(#goldGlow)" />
    <polygon points="256,366 274,392 256,418 238,392" fill="#FDE68A" stroke="#B45309" stroke-width="1" />
    <circle cx="256" cy="392" r="5" fill="#FFFFFF" />
  </g>
</svg>`;

fs.writeFileSync('public/logo.svg', logoSvg, 'utf8');

async function generatePngs() {
  const svgBuffer = Buffer.from(logoSvg);
  
  await sharp(svgBuffer).resize(512, 512).png().toFile('public/verba-icon.png');
  await sharp(svgBuffer).resize(180, 180).png().toFile('public/apple-touch-icon.png');
  await sharp(svgBuffer).resize(192, 192).png().toFile('public/icon-192.png');
  await sharp(svgBuffer).resize(64, 64).png().toFile('public/favicon.png');

  const artifactPath = 'C:/Users/prosk/.gemini/antigravity/brain/a892eeb8-2f47-4438-af56-240cc9c03444/verba-logo.png';
  await sharp(svgBuffer).resize(512, 512).png().toFile(artifactPath);

  console.log('Logo and icons generated successfully!');
}

generatePngs().catch(console.error);

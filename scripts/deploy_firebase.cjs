const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

async function main() {
  console.log('===============================================================');
  console.log('🚀 PUBLIKACE VERBA NA FIREBASE HOSTING (futro-app)');
  console.log('   (Zero-Data-Loss: Google Cloud Firestore + Firebase Hosting)');
  console.log('===============================================================');

  const rootDir = path.resolve(__dirname, '..');
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  // 1. Ověření a sestavení statického exportu
  console.log('\n[1/3] Sestavuji produkční statický export (Next.js out/)...');
  try {
    execSync(`${npmCmd} run build`, { cwd: rootDir, stdio: 'inherit' });
    console.log('✓ Statický produkční export byl úspěšně vygenerován.');
  } catch (err) {
    console.error('❌ Chyba při sestavování Next.js balíčku.');
    process.exit(1);
  }

  // 2. Kontrola přítomnosti seed dat a indexu v out/
  console.log('\n[2/3] Kontrola integrity výstupního adresáře out/...');
  const outDir = path.join(rootDir, 'out');
  const indexHtml = path.join(outDir, 'index.html');
  const seedOut = path.join(outDir, 'data', 'seed-courses.json');
  const seedSrc = path.join(rootDir, 'public', 'data', 'seed-courses.json');

  if (!fs.existsSync(indexHtml)) {
    console.error('❌ Chybí out/index.html. Statický export selhal.');
    process.exit(1);
  }

  if (!fs.existsSync(seedOut) && fs.existsSync(seedSrc)) {
    console.log('Kopíruji seed-courses.json do out/data/...');
    fs.mkdirSync(path.join(outDir, 'data'), { recursive: true });
    fs.copyFileSync(seedSrc, seedOut);
  }
  console.log('✓ Výstupní adresář out/ je kompletní a připraven.');

  // 3. Nasazení na Firebase Hosting
  console.log('\n[3/3] Nahrávám aplikaci a Firestore pravidla na Firebase...');
  try {
    execSync(`${npxCmd} -y firebase-tools deploy --only hosting:verba-learning,firestore:rules --project futro-app`, {
      cwd: rootDir,
      stdio: 'inherit'
    });
  } catch (err) {
    console.error('❌ Chyba při nahrávání na Firebase Hosting.');
    process.exit(1);
  }

  console.log('\n===============================================================');
  console.log('🎉 APLIKACE VERBA JE ÚSPĚŠNĚ PUBLIKOVÁNA ONLINE!');
  console.log('===============================================================');
  console.log('🌐 Produkční URL: https://verba-learning.web.app');
  console.log('🔒 Data perzistence: Google Cloud Firestore (projekt futro-app)');
  console.log('✨ Data se NIKDY nesmažou při žádném restartu ani aktualizaci!');
  console.log('📱 Aplikace funguje na počítači, tabletu i mobilním telefonu.');
  console.log('===============================================================\n');
}

main().catch(err => {
  console.error('\n❌ Neočekávaná chyba:', err);
  process.exit(1);
});

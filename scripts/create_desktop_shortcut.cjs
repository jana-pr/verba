const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const desktopDir = 'c:\\Users\\prosk\\OneDrive\\Plocha';
const shortcutPath = path.join(desktopDir, 'VERBA.lnk');
const verbaDir = path.resolve(__dirname, '..');
const batPath = path.join(verbaDir, 'Spustit_VERBA.bat');
const iconPath = path.join(verbaDir, 'public', 'favicon.ico');

// Check Chrome path
const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
];

let chromeExe = chromePaths.find(p => fs.existsSync(p));

const scriptVbs = path.join(verbaDir, 'temp_shortcut.vbs');
let vbsContent = '';

if (chromeExe) {
  // App mode via Chrome (standalone window like GANTT)
  vbsContent = `
Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "${shortcutPath.replace(/\\/g, '\\\\')}"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "${chromeExe.replace(/\\/g, '\\\\')}"
oLink.Arguments = "--app=http://localhost:3000"
oLink.Description = "VERBA - Odborná jazyková platforma"
oLink.WorkingDirectory = "${verbaDir.replace(/\\/g, '\\\\')}"
${fs.existsSync(iconPath) ? `oLink.IconLocation = "${iconPath.replace(/\\/g, '\\\\')},0"` : ''}
oLink.Save
`;
} else {
  // Direct bat link
  vbsContent = `
Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "${shortcutPath.replace(/\\/g, '\\\\')}"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "${batPath.replace(/\\/g, '\\\\')}"
oLink.Description = "VERBA - Odborná jazyková platforma"
oLink.WorkingDirectory = "${verbaDir.replace(/\\/g, '\\\\')}"
${fs.existsSync(iconPath) ? `oLink.IconLocation = "${iconPath.replace(/\\/g, '\\\\')},0"` : ''}
oLink.Save
`;
}

fs.writeFileSync(scriptVbs, vbsContent, 'utf8');
try {
  execSync(`cscript //nologo "${scriptVbs}"`);
  console.log('✓ Zástupce na Ploše byl úspěšně vytvořen:', shortcutPath);
} catch (err) {
  console.error('Chyba při vytváření zástupce:', err.message);
} finally {
  if (fs.existsSync(scriptVbs)) fs.unlinkSync(scriptVbs);
}

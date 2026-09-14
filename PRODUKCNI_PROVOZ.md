# VERBA — PRODUKČNÍ PROVOZ & OCHRANA DAT (Firebase Hosting + Google Cloud Firestore)

Tento dokument slouží jako kompletní provozní příručka pro aplikaci **VERBA** po přesunu na **Firebase Hosting** a napojení na **Google Cloud Firestore**.

---

## 1. PROČ RENDER MAZAL DATA A JAK JE TO NYNÍ VYŘEŠENO

### Původní problém na Renderu:
Na bezplatném cloudu Render docházelo při každém novém nasazení (nebo uspání serveru po nečinnosti) ke kompletnímu znovuvytvoření kontejneru. Protože bezplatný Render nepodporuje trvalé disky, jakýkoliv lokální soubor databáze se smazal a vrátil do výchozího stavu z repozitáře.

### Nové řešení (shodné s KLAP):
1. **Google Cloud Firestore (`futro-app`):**
   - Všechny kurzy (předpřipravené i naimportované), vygenerované lekce, obousměrná historie pokusů (Active Recall CZ→EN i Porozumění EN→CZ) a streaky se automaticky a trvale ukládají do Google Cloud Firestore.
   - Ani restart kontejneru, ani redeploy kódů data **nikdy nesmaže**.

2. **Serverless Firebase Hosting (`https://verba-learning.web.app`):**
   - Aplikace je publikována na vysoce dostupné globální CDN síti Google Firebase.
   - Není závislá na žádném běžícím serveru, nevypíná se po nečinnosti a načítá se okamžitě.

3. **Klientský Master Vault (localStorage) + PWA Offline Podpora:**
   - Veškerý obsah a stav studia je zrcadlen v prohlížeči. Aplikace funguje i v offline režimu a při opětovném připojení se automaticky synchronizuje s cloudem.

---

## 2. PŘÍSTUPOVÉ ADRESY

* **Produkční online aplikace (PC, tablet, mobil kdekoliv na internetu):**  
  👉 **[https://verba-learning.web.app](https://verba-learning.web.app)**

* **Lokální vývojový režim:**  
  👉 **[http://localhost:3000](http://localhost:3000)**

---

## 3. PUBLIKACE A AKTUALIZACE NA 1 KLIKNUTÍ

Kdykoliv provedete změny v kódu, stačí:

1. Dvakrát poklepat na **`Publikovat_online.bat`** (nebo `deploy.bat`) v hlavní složce aplikace.
2. Skript automaticky:
   - Sestaví optimalizovaný produkční statický export (`npm run build` do `out/`).
   - Ověří integritu všech 50 lekcí a seed dat (`public/data/seed-courses.json`).
   - Nahraje novou verzi na Firebase Hosting (`verba-learning.web.app`) i bezpečnostní pravidla Firestore.
3. Během několika sekund je nová verze živě dostupná po celém světě.

---

## 4. ARCHITEKTURA A KLÍČOVÉ SOUBORY

- **`.firebaserc`**: Konfigurace projektu (`futro-app`) a cílového webu (`verba-learning`).
- **`firebase.json`**: Pravidla hostingu, cache hlavičky pro PWA a rewrite pravidla.
- **`firestore.rules`**: Pravidla zabezpečení pro trvalou databázi v Google Cloud Firestore.
- **`src/lib/firebase.ts`**: Inicializace Firebase SDK a synchronizace kurzů a stavu studia.
- **`src/lib/data-repository.ts`**: Centrální klientský repozitář dat pro obousměrný nácvik a správu kurzů.
- **`public/data/seed-courses.json`**: Výchozí balíček 4 profesních kurzů (200 kompletních lekcí, článků a cvičení).

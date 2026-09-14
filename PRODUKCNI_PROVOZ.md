# VERBA — PRODUKČNÍ PROVOZ & OCHRANA DAT (v1.0.0)

Tento dokument slouží jako provozní příručka pro aplikaci **VERBA** po sjednocení architektury s aplikacemi **KLAP** a **GANTT**.

---

## 1. PROČ RENDER MAZAL DATA A JAK JE TO NYNÍ VYŘEŠENO

Na bezplatném cloudu Render docházelo při každém novém nasazení (nebo uspání serveru po nečinnosti) ke kompletnímu znovuvytvoření kontejneru. Protože Render na free plánu nepodporuje trvalé disky, soubor databáze se smazal a vrátil do výchozího stavu z repozitáře.

### Nové řešení (stejně jako KLAP a GANTT):
1. **Google Cloud Firestore (jako KLAP):**
   - Všechny kurzy, vygenerované lekce, postupy a streaky se automaticky a trvale ukládají do Google Cloud Firestore (projekt `futro-app`, kolekce `verba`).
   - Ani restart kontejneru, ani redeploy kódů data nikdy nesmaže.

2. **Lokální produkční server s SQLite (jako GANTT):**
   - Aplikace běží přímo na tomto počítači. Databáze `data/verba.db` je uložena lokálně na disku v OneDrive složce a přežije jakoukoliv aktualizaci.
   - Běží jako samostatné PWA okno v Google Chrome bez adresního řádku.

3. **Klientský Master Vault (localStorage):**
   - Vše je navíc zálohováno přímo v prohlížeči, takže i při výpadku sítě jsou data ihned dostupná.

---

## 2. PŘÍSTUPOVÉ ADRESY

Server běží na portu `3000` a naslouchá na všech rozhraních (`0.0.0.0`):

* **Z tohoto počítače:**  
  👉 **[http://localhost:3000](http://localhost:3000)**

* **Z mobilního telefonu nebo tabletu na stejné Wi-Fi síti:**  
  📱 Stačí v aplikaci kliknout na ikonu **Mobilní přístup (QR kód)** v horní liště a naskenovat kód foťákem telefonu.
  Adresa v síti: `http://<Vase_IP_v_siti>:3000`

---

## 3. SPOUŠTĚNÍ APLIKACE NA 1 KLIKNUTÍ

Máte k dispozici 3 pohodlné možnosti:

1. **Přímo z Plochy Windows:**
   - Dvakrát poklepejte na ikonu **VERBA** na Ploše.
   - Aplikace se otevře v čistém samostatném okně (PWA).

2. **Dávkovým spouštěčem:**
   - Poklepejte na soubor `Spustit_VERBA.bat` nebo `start-production.bat` v kořenovém adresáři.

3. **Z příkazové řádky:**
   ```bash
   npm.cmd run start -- -H 0.0.0.0 -p 3000
   ```

---

## 4. NASAZENÍ OPRAV A AKTUALIZACÍ (HOTFIXŮ)

Když v aplikaci provedete úpravy kódu nebo přidáte novou funkci, stačí:

* Poklepat na **`Publikovat_online.bat`** nebo **`deploy.bat`**.

Skript automaticky:
1. Zkontroluje a sestaví optimalizovaný produkční build.
2. Zkontroluje integritu lokální databáze `verba.db`.
3. Ověří synchronizaci s Google Cloud Firestore.
4. Obnoví zástupce na Ploše.

import { CurriculumLessonOutline, LearningItem, Lesson, LessonExercise, TransferArticle } from '../db/schema';

export interface GeneratedLessonData {
  lesson: Omit<Lesson, 'id' | 'course_id' | 'created_at'>;
  items: Omit<LearningItem, 'id' | 'lesson_id' | 'course_id' | 'created_at'>[];
  exercises: Omit<LessonExercise, 'id' | 'lesson_id'>[];
  transferArticle: Omit<TransferArticle, 'id' | 'lesson_id' | 'created_at'>;
}

/**
 * Generates 50-lesson curriculum outline based on Target Language, CEFR level and Domain.
 */
export async function generateCurriculumOutline(
  targetLanguage: string,
  cefrLevel: string,
  domainArea: string
): Promise<CurriculumLessonOutline[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      return await generateOutlineViaGemini(targetLanguage, cefrLevel, domainArea, apiKey);
    } catch (err) {
      console.warn('Gemini API outline generation failed, falling back to rich pedagogical template generator:', err);
    }
  }

  // Resilient domain generator with 50 specific concrete topics
  return generateCurriculumTemplate(domainArea, cefrLevel);
}

/**
 * Generates full content for a specific lesson (1..50)
 */
export async function generateLessonContent(
  lessonNumber: number,
  lessonOutline: CurriculumLessonOutline,
  targetLanguage: string,
  cefrLevel: string,
  domainArea: string
): Promise<GeneratedLessonData> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      return await generateLessonViaGemini(lessonNumber, lessonOutline, targetLanguage, cefrLevel, domainArea, apiKey);
    } catch (err) {
      console.warn(`Gemini API lesson ${lessonNumber} generation failed, falling back to rich domain template:`, err);
    }
  }

  return generateLessonTemplate(lessonNumber, lessonOutline, domainArea, cefrLevel);
}

// -------------------------------------------------------------
// Curated 50-Lesson Domain Syllabi
// -------------------------------------------------------------

interface TopicDefinition {
  title: string;
  theme_focus: string;
  learning_goal: string;
}

const PM_50_TOPICS: TopicDefinition[] = [
  // 1-10 Initiation & Governance
  { title: "Project Initiation & Charter", theme_focus: "Formulace cílů, sponzorství a mandátu projektu", learning_goal: "Osvojení klíčových obratů pro definici projektového rámce a získání mandátu od sponzorů." },
  { title: "Stakeholder Identification & Power Mapping", theme_focus: "Analýza zájmových skupin a matice vlivu", learning_goal: "Fráze pro kategorizaci stakeholderů a vedení úvodních zjišťovacích rozhovorů." },
  { title: "Kick-off Meeting Leadership", theme_focus: "Facilitace zahajovací schůzky a nastavení pravidel", learning_goal: "Formulace agendy, představení vize a moderování diskuse na prvním setkání týmu." },
  { title: "Scope Definition & Deliverables", theme_focus: "Vymezení rozsahu a konkrétních výstupů", learning_goal: "Přesné vyjadřování hranic rozsahu (in-scope vs. out-of-scope) v angličtině." },
  { title: "Requirements Gathering & Elicitation", theme_focus: "Získávání a specifikace funkčních požadavků", learning_goal: "Vedení strukturovaných rozhovorů s byznysem a dokumentace akceptačních kritérií." },
  { title: "Work Breakdown Structure (WBS)", theme_focus: "Dekompozice díla a balíky prací", learning_goal: "Terminologie hierarchického rozpadu úkolů a přiřazování odpovědností." },
  { title: "Resource Allocation & Capacity Planning", theme_focus: "Alokace kapacit a řízení lidských zdrojů", learning_goal: "Obrat pro vyjednávání s liniovými manažery o uvolnění specialistů pro projekt." },
  { title: "Project Governance & Decision Gates", theme_focus: "Rozhodovací pravomoci a kontrolní brány", learning_goal: "Artikulace formálních schvalovacích procesů a eskalace do řídícího výboru." },
  { title: "Defining Success Criteria & KPIs", theme_focus: "Metriky úspěšnosti a měření hodnoty", learning_goal: "Formulace měřitelných cílů (SMART) a reportování milníků vedení." },
  { title: "Checkpoint 1: Initiation & Governance Mastery", theme_focus: "Milníkové prověření bloků 1–9", learning_goal: "Komplexní prověření zvládnutí terminologie zahájení projektu a governance." },

  // 11-20 Planning, Risk & Estimation
  { title: "Timeline Estimation & Critical Path Method", theme_focus: "Odhady pracnosti a metoda kritické cesty", learning_goal: "Diskuse o časových rezervách (float/slack) a dopadu zpoždění na finální termín." },
  { title: "Budget Baseline & Cost Estimation", theme_focus: "Finanční plánování, OPEX/CAPEX a rozpočtový rámec", learning_goal: "Vyjadřování nákladových odhadů, rozpočtových položek a rezerv na nepředvídané výdaje." },
  { title: "Managing Dependencies & Prerequisites", theme_focus: "Mezitémové závislosti a blokující faktory", learning_goal: "Identifikace a formulace kritických technických a procesních závislostí." },
  { title: "Risk Management & Mitigation Strategy", theme_focus: "Identifikace rizik, pravděpodobnost a dopad", learning_goal: "Prezentace rizikového registru a návrh preventivních a nápravných opatření." },
  { title: "Issue Management & Escalation Protocol", theme_focus: "Řešení otevřených problémů a krizová eskalace", learning_goal: "Asertivní formulace eskalace na úroveň C-level s návrhem doporučeného řešení." },
  { title: "Procurement & Vendor Negotiations", theme_focus: "Výběrová řízení, dodavatelé a SLA smlouvy", learning_goal: "Odborná vyjednávání o dodacích podmínkách, sankcích a rozhraní odpovědnosti." },
  { title: "Communication Strategy & Cadence", theme_focus: "Komunikační matice a pravidelnost reportingu", learning_goal: "Nastavení očekávání vůči klientovi a efektivní formát týdenních souhrnů." },
  { title: "Quality Assurance & Acceptance Planning", theme_focus: "Plán řízení kvality a standardy výstupů", learning_goal: "Definice kritérií připravenosti (DoR) a kritérií hotovo (DoD)." },
  { title: "Change Control & Scope Creep Prevention", theme_focus: "Řízení změn a prevence neřízeného bobtnání projektu", learning_goal: "Argumentace proti neformálním požadavkům a vedení formálního Change Request procesu." },
  { title: "Checkpoint 2: Planning, Risk & Estimation Review", theme_focus: "Milníkové prověření bloků 11–19", learning_goal: "Syntéza plánovacích dovedností, řízení rizik a rozpočtové komunikace." },

  // 21-30 Execution, Agile & Team Leadership
  { title: "Sprint Planning & Agile Ceremonies", theme_focus: "Agilní ceremonie a závazky pro iteraci", learning_goal: "Facilitace plánování sprintu a diskuse o prioritizaci produktového backlogu." },
  { title: "Daily Stand-ups & Blocker Removal", theme_focus: "Operativní schůzky a odstraňování překážek", learning_goal: "Stručné, úderné vyjadřování postupu a okamžitá identifikace blokátorů." },
  { title: "Cross-Functional Collaboration", theme_focus: "Spolupráce napříč technickými a byznysovými týmy", learning_goal: "Překlenutí jazykové propasti mezi vývojáři, designéry a obchodním vedením." },
  { title: "Conflict Resolution & Negotiation in Teams", theme_focus: "Konstruktivní řešení neshod a vyjednávání", learning_goal: "Profesionální mediace technických a osobních konfliktů v týmu." },
  { title: "Delegation & Accountability Management", theme_focus: "Delegování pravomocí a vymahatelnost závazků", learning_goal: "Jasné předávání odpovědnosti bez mikromanagementu a ověřování postupu." },
  { title: "Status Reporting & Executive Dashboards", theme_focus: "Manažerské souhrny a prezentace pro vedení", learning_goal: "Tvorba stručných a přesvědčivých executive summary pro zaneprázdněné ředitele." },
  { title: "Managing Difficult Client Expectations", theme_focus: "Komunikace s náročnými zadavateli a řízení očekávání", learning_goal: "Diplomatické odmítnutí nerealistických termínů a nabídka kompromisních řešení." },
  { title: "Budget Tracking & Burn Rate Oversight", theme_focus: "Sledování čerpání rozpočtu a analýza odchylek", learning_goal: "Vysvětlení odchylek v nákladech a predikce nákladů do dokončení (ETC)." },
  { title: "Facilitating Product Backlog Refinement", theme_focus: "Zpřesňování uživatelských příběhů a odhady", learning_goal: "Kladení přesných otázek pro vyjasnění akceptačních podmínek user stories." },
  { title: "Checkpoint 3: Execution & Team Leadership Mastery", theme_focus: "Milníkové prověření bloků 21–29", learning_goal: "Ověření aktivního vedení týmu, agilního slovníku a klientské komunikace." },

  // 31-40 Monitoring, Crisis Recovery & UAT
  { title: "Earned Value Management (EVM) & Variance", theme_focus: "Metrika získané hodnoty (CPI, SPI)", learning_goal: "Prezentace číselných ukazatelů výkonnosti projektu před investory a sponzory." },
  { title: "Schedule Compression: Crashing & Fast-Tracking", theme_focus: "Komprese harmonogramu a zrychlení dodávky", learning_goal: "Strategická diskuse o nákladech zrychlení prací a zvýšených rizicích." },
  { title: "Crisis Communication & Damage Control", theme_focus: "Krizová komunikace při selhání kritických komponent", learning_goal: "Zachování klidu, transparentní informování zasažených stran a nápravný plán." },
  { title: "Executive Steering Committee Alignment", theme_focus: "Příprava a vedení strategických zasedání", learning_goal: "Získání podpory pro strategické změny v prioritách a rozpočtu projektu." },
  { title: "Managing Third-Party Vendor Deadlocks", theme_focus: "Řešení patových situací s externími partnery", learning_goal: "Vymáhání smluvních závazků bez destrukce dlouhodobých partnerských vztahů." },
  { title: "User Acceptance Testing (UAT) Alignment", theme_focus: "Příprava a řízení uživatelské akceptace", learning_goal: "Komunikace akceptačních testovacích scénářů a řešení neshod s koncovými uživateli." },
  { title: "Defect Prioritization & Triage Meetings", theme_focus: "Klasifikace chyb (Blocker, Critical, Minor)", learning_goal: "Vedení triáže a obhajoba odkladu nekritických vad na další release." },
  { title: "Regulatory Audit & Compliance Readiness", theme_focus: "Příprava na oborový audit a soulad s normami", learning_goal: "Dokladování procesní integrity a předkládání auditních záznamů." },
  { title: "Operational Readiness Review (ORR)", theme_focus: "Připravenost provozu před nasazením do produkce", learning_goal: "Kontrola provozních příruček, monitoringu a schopnosti podpory L1/L2." },
  { title: "Checkpoint 4: Recovery, Crisis & Testing Review", theme_focus: "Milníkové prověření bloků 31–39", learning_goal: "Prověření komunikace v krizových scénářích, testování a řízení kvality." },

  // 41-50 Delivery, Handover & Project Closure
  { title: "Go/No-Go Decision Gate Protocol", theme_focus: "Konečné rozhodovací zasedání o nasazení", learning_goal: "Strukturované hlasování o spuštění produkce a schválení contingency plánu." },
  { title: "Cutover Planning & Rollback Strategies", theme_focus: "Plán přechodu do ostrého provozu a plán návratu", learning_goal: "Řízení hodinových harmonogramů nasazení a krizových rollback procedur." },
  { title: "Operational Handover to Support Teams", theme_focus: "Předání do rutinního provozu a SLA podpora", learning_goal: "Vedení formálního předávacího řízení se servisními týmy a service deskem." },
  { title: "End-User Training & Change Management", theme_focus: "Školení uživatelů a adopce nového řešení", learning_goal: "Motivace uživatelů k přechodu na nový systém a překonávání odporu ke změně." },
  { title: "Hypercare Support & Warranty Phase", theme_focus: "Zvýšená poprodukční péče a stabilizace", learning_goal: "Koordinace horkých oprav v prvních týdnech ostrého provozu." },
  { title: "Final Financial Reconciliation & Cost Closeout", theme_focus: "Finální finanční vypořádání a fakturace", learning_goal: "Uzavření dodavatelských smluv, schválení doplatků a uvolnění zádržného." },
  { title: "Formal Client Sign-Off & Acceptance Certificate", theme_focus: "Podpis akceptačního protokolu", learning_goal: "Vyjednání podpisu formální přejímky bez výhrad a uzavření kontraktu." },
  { title: "Retrospective & Lessons Learned Workshop", theme_focus: "Zpětná vazba, co se podařilo a co zlepšit", learning_goal: "Facilitace konstruktivní retrospektivy a sepsání trvalých doporučení pro firmu." },
  { title: "Celebrating Success & Releasing Resources", theme_focus: "Ocenění týmu a formální uvolnění kapacit", learning_goal: "Poděkování týmu, hodnocení jednotlivců a podpora jejich dalšího profesního růstu." },
  { title: "Checkpoint 5: Comprehensive Course Mastery", theme_focus: "Závěrečné celkové ověření všech 50 lekcí", learning_goal: "Závěrečné mistrovské prověření kompletního repertoáru odborného jazyka v praxi." }
];

const PROD_50_TOPICS: TopicDefinition[] = [
  // 1-10 Strategy & Research
  { title: "Product Vision & Strategic Differentiation", theme_focus: "Definice produktové vize a tržního odlišení", learning_goal: "Formulace jedinečné hodnotové propozice a strategického směřování produktu." },
  { title: "User Persona Research & Empathy Mapping", theme_focus: "Výzkum uživatelských person a hloubkové rozhovory", learning_goal: "Vedení zjišťovacích zákaznických interview a syntéza bolavých míst (pain points)." },
  { title: "Value Proposition Canvas & Problem-Solution Fit", theme_focus: "Sladění řešení s reálným problémem trhu", learning_goal: "Artikulace zákaznických zisků a úlev od bolesti před stakeholdery." },
  { title: "Market Opportunity Sizing: TAM, SAM, SOM", theme_focus: "Kvantifikace tržního potenciálu a odhady", learning_goal: "Prezentace velikosti trhu a odůvodnění investic před vedením." },
  { title: "Competitive Intelligence & Benchmarking", theme_focus: "Analýza konkurence a hledání mezer na trhu", learning_goal: "Porovnání funkcionalit, cenových modelů a taktických výhod konkurence." },
  { title: "Defining Core Product Metrics & North Star", theme_focus: "Metrika North Star a produktové KPIs", learning_goal: "Definice a obhajoba klíčových ukazatelů růstu, retence a zapojení uživatelů." },
  { title: "Product Requirement Document (PRD) Crafting", theme_focus: "Tvorba specifikace požadavků a zadání", learning_goal: "Jasné a srozumitelné sepsání PRD bez vágních formulací pro inženýrský tým." },
  { title: "User Journey Mapping & Experience Flows", theme_focus: "Mapování průchodu uživatele systémem", learning_goal: "Identifikace třecích ploch v uživatelské zkušenosti a optimalizace konverzí." },
  { title: "MVP Definition: Scoping the Bare Minimum", theme_focus: "Definice minimálního životaschopného produktu", learning_goal: "Nemilosrdné škrtání nepotřebných funkcí a obhajoba rychlého vstupu na trh." },
  { title: "Checkpoint 1: Discovery & Strategy Mastery", theme_focus: "Milníkové prověření bloků 1–9", learning_goal: "Komplexní prověření produktové strategie, výzkumu a definice PRD." },

  // 11-20 Prioritization & Execution
  { title: "Prioritization Frameworks: RICE, MoSCoW, Kano", theme_focus: "Metodiky prioritizace funkcí a backlogu", learning_goal: "Strukturovaná argumentace, proč má daná funkce přednost před jinou." },
  { title: "Collaborating with UX/UI Design & Prototyping", theme_focus: "Spolupráce s designéry a validace wireframů", learning_goal: "Poskytování konstruktivní zpětné vazby na interaktivní prototypy a usability testy." },
  { title: "Technical Feasibility & Engineering Alignment", theme_focus: "Technická proveditelnost a architektura", learning_goal: "Vedení partnerského dialogu s technickým ředitelem a vývojovými lídry." },
  { title: "Writing Actionable User Stories & Acceptance Criteria", theme_focus: "Formulace user stories a akceptačních kritérií", learning_goal: "Tvorba přesných kritérií podle standardu Gherkin (Given-When-Then)." },
  { title: "Release Planning & Roadmap Communication", theme_focus: "Komunikace produktové roadmapy a horizontů", learning_goal: "Prezentace roadmapy založené na výsledcích (outcomes) namísto pouhých termínů." },
  { title: "A/B Testing Design & Hypothesis Formulation", theme_focus: "Návrh experimentů a statistické hypotézy", learning_goal: "Formulace testovatelných hypotéz a vyhodnocování signifikance výsledků." },
  { title: "Pricing Models & Monetization Strategies", theme_focus: "Cenotvorba: SaaS subscription, freemium, usage-based", learning_goal: "Analýza ochoty platit (willingness to pay) a optimalizace cenových balíčků." },
  { title: "Product Analytics & Funnel Conversion Audit", theme_focus: "Analýza konverzních trychtýřů a drop-off bodů", learning_goal: "Interpretace dat z analytických nástrojů a návrhy na snížení churnu." },
  { title: "Handling Feature Requests from Sales & Enterprise", theme_focus: "Filtrování požadavků od obchodu a VIP klientů", learning_goal: "Diplomatické řízení tlaku na zakázkový vývoj versus škálovatelný produkt." },
  { title: "Checkpoint 2: Prioritization & Design Mastery", theme_focus: "Milníkové prověření bloků 11–19", learning_goal: "Prověření prioritizace, datové analytiky a spolupráce s vývojem." },

  // 21-30 Delivery & Go-to-Market
  { title: "Go-to-Market (GTM) Strategy & Cross-Team Launch", theme_focus: "Strategie uvedení produktu na trh a koordinace", learning_goal: "Sladění marketingu, obchodu a podpory před velkým uvedením novinky." },
  { title: "Product Marketing Alignment & Value Messaging", theme_focus: "Marketingová komunikace a positioning", learning_goal: "Překlad technických parametrů do srozumitelných přínosů pro zákazníka." },
  { title: "Sales Enablement: Collateral & Demo Scripts", theme_focus: "Podpora prodeje a školicí materiály", learning_goal: "Příprava prodejních skriptů, odpovědí na námitky a produktových demonstrací." },
  { title: "Beta Testing Programs & Early Adopter Feedback", theme_focus: "Beta programy a zpětná vazba prvních uživatelů", learning_goal: "Řízení kohorty beta testerů a rychlé zapracování kritické zpětné vazby." },
  { title: "Feature Flagging & Phased Rollout Strategies", theme_focus: "Postupné uvolňování funkcí a řízení rizik", learning_goal: "Komunikace canary deploymentů a monitorování stability po uvolnění." },
  { title: "Customer Onboarding & Time-to-Value (TTV)", theme_focus: "Aktivace uživatele a zkrácení doby k první hodnotě", learning_goal: "Optimalizace úvodního průvodce produktem a odstranění třecích ploch." },
  { title: "Retention Analysis & Cohort Retention Curves", theme_focus: "Kohortová analýza retence a udržení zákazníků", learning_goal: "Interpretace křivek retence a identifikace faktorů, které tvoří loajalitu." },
  { title: "Churn Diagnostics & Win-Back Strategies", theme_focus: "Důvody odchodu zákazníků a retenční kampaně", learning_goal: "Vedení rozhovorů při zrušení účtu a nabídka nápravných kroků." },
  { title: "Managing Technical Debt vs. Feature Velocity", theme_focus: "Rovnováha mezi novými funkcemi a technickým dluhem", learning_goal: "Vyjednávání vyčlenění kapacity na refaktoring a technologické inovace." },
  { title: "Checkpoint 3: Launch, GTM & Growth Review", theme_focus: "Milníkové prověření bloků 21–29", learning_goal: "Syntéza launchovacích strategií, retence a práce s uživatelskými daty." },

  // 31-40 Scaling, Feedback Loops & Platform
  { title: "Customer Advisory Boards & Qualitative Loops", theme_focus: "Zákaznické poradní sbory a hloubková vazba", learning_goal: "Vedení strategických workshopů s klíčovými korporátními zákazníky." },
  { title: "Net Promoter Score (NPS) & CSAT Deep Dive", theme_focus: "Spokojenost uživatelů a sentimentová analýza", learning_goal: "Práce se sentimentem zákazníků a převod skóre na konkrétní backlog úkoly." },
  { title: "Product-Led Growth (PLG) Mechanics & Virality", theme_focus: "Produktem tažený růst a virální smyčky", learning_goal: "Zabudování virálních mechanismů a organického sdílení přímo do produktu." },
  { title: "API as a Product: Developer Experience (DX)", theme_focus: "API jako samostatný produkt a integrace", learning_goal: "Definice dokumentace, sandboxů a partnerského ekosystému pro vývojáře." },
  { title: "Platform Ecosystems & Third-Party Integrations", theme_focus: "Platformové tržiště a partnerské ekosystémy", learning_goal: "Vyhodnocování přínosů integrací a partnerských smluv o sdílení tržeb." },
  { title: "Internationalization (i18n) & Local Market Fit", theme_focus: "Lokalizace a expanze na zahraniční trhy", learning_goal: "Přizpůsobení produktu kulturním, jazykovým a legislativním specifikům." },
  { title: "Data Privacy Compliance: GDPR, CCPA & Trust", theme_focus: "Ochrana soukromí a soulad s legislativou", learning_goal: "Implementace mechanismů ochrany dat jako konkurenční výhody produktu." },
  { title: "Product Operations & Tooling Standardization", theme_focus: "Standardizace nástrojů a procesů v produktovém týmu", learning_goal: "Efektivní správa produktového workflow napříč desítkami týmů." },
  { title: "Sunset & End-of-Life (EOL) Communications", theme_focus: "Ukončení starých funkcí a migrace zákazníků", learning_goal: "Diplomatická komunikace rušení zastaralých produktů s nabídkou alternativ." },
  { title: "Checkpoint 4: Scaling, Ecosystem & Platform Review", theme_focus: "Milníkové prověření bloků 31–39", learning_goal: "Ověření znalostí škálování, platformových strategií a mezinárodní expanze." },

  // 41-50 Leadership & Product Excellence
  { title: "Quarterly OKRs: Setting Product Objectives", theme_focus: "Stanovování cílů OKR a jejich propojení s vizí", learning_goal: "Formulace ambiciózních cílů a měřitelných klíčových výsledků (Key Results)." },
  { title: "Product Portfolio Governance & Capital Allocation", theme_focus: "Správa portfolia produktů a alokace zdrojů", learning_goal: "Rozhodování o investicích mezi novými inovacemi a udržováním dojených krav." },
  { title: "Board Presentations: Pitching Product Strategy", theme_focus: "Prezentace pro představenstvo a investory", learning_goal: "Představení vize v řeči čísel, návratnosti investic a strategických rizik." },
  { title: "Hiring, Mentoring & Growing Product Managers", theme_focus: "Budování a rozvoj produktového týmu", learning_goal: "Vedení hodnotících pohovorů a stanovení profesních rozvojových plánů." },
  { title: "Cross-Executive Negotiation: CEO, CTO, CMO", theme_focus: "Vyjednávání v nejužším vedení podniku", learning_goal: "Prosazení produktové vize i při protichůdných tlacích ostatních ředitelů." },
  { title: "Ethical AI & Responsible Product Design", theme_focus: "Etické aspekty AI a transparentnost algoritmů", learning_goal: "Formulace etických standardů při nasazování umělé inteligence v produktu." },
  { title: "Continuous Discovery Habits: The Weekly Rhythm", theme_focus: "Rytmus neustálého zjišťování potřeb uživatelů", learning_goal: "Zavedení kultury týdenního kontaktu s reálnými zákazníky pro celý tým." },
  { title: "Post-Launch Performance Post-Mortems", theme_focus: "Zpětné vyhodnocení úspěšnosti a selhání iniciativ", learning_goal: "Kultura bez obviňování (blameless) zaměřená na systémové poučení z chyb." },
  { title: "Building a Culture of Product Craftsmanship", theme_focus: "Budování kultury vysoké kvality a detailu", learning_goal: "Inspirace týmů k nekompromisnímu zaměření na precizní detail a eleganci." },
  { title: "Checkpoint 5: Comprehensive Product Leadership", theme_focus: "Závěrečné celkové ověření všech 50 lekcí", learning_goal: "Kompletní ověření strategického, operativního i komunikačního mistrovství." }
];

const SWE_50_TOPICS: TopicDefinition[] = [
  // 1-10 Architecture & Design
  { title: "System Architecture RFCs & Decision Records", theme_focus: "Tvorba architektonických návrhů (ADR) a RFC", learning_goal: "Osvojení terminologie pro formulaci architektonických rozhodnutí a kompromisů." },
  { title: "Monolith vs. Microservices Trade-offs", theme_focus: "Rozpad systémů a distribuovaná architektura", learning_goal: "Argumentace výhod a rizik přechodu na mikroslužby před technickým vedením." },
  { title: "RESTful API Design & Best Practices", theme_focus: "Návrh robustních REST rozhraní", learning_goal: "Přesné definice stavových kódů, idempotence a verzování API." },
  { title: "GraphQL Schema Design & Federation", theme_focus: "Dotazovací jazyk GraphQL a federovaná schémata", learning_goal: "Diskuse o over-fetchingu, n+1 problému a cachování dotazů." },
  { title: "Relational Database Indexing & Query Optimization", theme_focus: "Indexace, exekuční plány a ladění SQL", learning_goal: "Vysvětlení zpomalení databáze a návrh kompozitních indexů." },
  { title: "NoSQL Architectures: Key-Value, Document, Graph", theme_focus: "Výběr nerelačních databází dle use-case", learning_goal: "Odůvodnění volby MongoDB, Redis či Neo4j dle přístupových vzorů." },
  { title: "Event-Driven Systems: Kafka & Message Queues", theme_focus: "Zpracování událostí, streaming a asynchronní zprávy", learning_goal: "Terminologie pub/sub, partitioningu, consumer groups a garancí doručení." },
  { title: "Distributed Consensus: Raft, Paxos & CAP Theorem", theme_focus: "Distribuovaná shoda a teorém CAP", learning_goal: "Odborná diskuse o konzistenci, dostupnosti a odolnosti vůči rozpadu sítě." },
  { title: "Caching Strategies: Redis, Memcached & Invalidation", theme_focus: "Strategie mezipaměti a její invalidace", learning_goal: "Vysvětlení cache-aside, write-through a řešení cache stampede." },
  { title: "Checkpoint 1: Architecture & Data Systems Mastery", theme_focus: "Milníkové prověření bloků 1–9", learning_goal: "Komplexní prověření systémového designu, API a databází." },

  // 11-20 Code Quality, Testing & Security
  { title: "Clean Code Principles & Refactoring Patterns", theme_focus: "Čistý kód, SOLID principy a refaktoring", learning_goal: "Obhajoba nutnosti čistého návrhu a odstraňování technického dluhu." },
  { title: "Code Review Etiquette & Constructive Feedback", theme_focus: "Kultura schvalování pull requestů", learning_goal: "Formulace uctivé, ale nekompromisní technické zpětné vazby v pull requestu." },
  { title: "Concurrency, Threads & Race Conditions", theme_focus: "Paralelismus, vícevláknové programování a zámky", learning_goal: "Analýza deadlocků, race conditions a atomických operací." },
  { title: "Unit & Integration Testing Strategies", theme_focus: "Testovací pyramida, mockování a stubs", learning_goal: "Diskuse o testovacím pokrytí, flakiness testů a testovatelnosti kódu." },
  { title: "End-to-End (E2E) Automation & Contract Testing", theme_focus: "Automatizované E2E testy a contract testing", learning_goal: "Ověřování kompatibility rozhraní napříč nezávislými týmy (Pact)." },
  { title: "Application Security & OWASP Top 10", theme_focus: "Bezpečnost aplikací, SQLi, XSS, CSRF", learning_goal: "Identifikace zranitelností a návrh bezpečnostních záplat v kódu." },
  { title: "Authentication & Authorization: OAuth2 & JWT", theme_focus: "Autentizace, tokeny a správa identit", learning_goal: "Vysvětlení toků OAuth2 (authorization code grant) a zabezpečení claims." },
  { title: "Zero Trust Architecture & Network Hardening", theme_focus: "Bezpečnostní model Zero Trust a mikrosegmentace", learning_goal: "Prezentace principu 'nikdy nedůvěřuj, vždy ověřuj' v cloudovém prostředí." },
  { title: "Secret Management & Key Rotation Pipelines", theme_focus: "Správa tajných klíčů, Vault a rotace certifikátů", learning_goal: "Zajištění, aby se žádné heslo ani klíč nedostaly do repozitáře." },
  { title: "Checkpoint 2: Code Quality, Testing & Security Review", theme_focus: "Milníkové prověření bloků 11–19", learning_goal: "Prověření bezpečnosti, testovacích strategií a concurrency." },

  // 21-30 DevOps, CI/CD & Cloud Infrastructure
  { title: "Continuous Integration: Pipelines & Artifact Building", theme_focus: "Automatizace CI, build procesy a validace", learning_goal: "Optimalizace rychlosti pipeline a paralelního spouštění úloh." },
  { title: "Continuous Delivery & Deployment Automation", theme_focus: "Automatické nasazování a uvolňovací strategie", learning_goal: "Rozlišení průběžného doručování a nasazování s minimálním výpadkem." },
  { title: "Containerization: Docker Best Practices", theme_focus: "Optimalizace Docker kontejnerů a vrstvení", learning_goal: "Tvorba bezpečných, lehkých a multi-stage Dockerfile souborů." },
  { title: "Kubernetes Orchestration & Pod Lifecycle", theme_focus: "Orchestrace kontejnerů, Deploymenty, Služby", learning_goal: "Terminologie škálování (HPA), ingress kontrolérů a sond připravenosti." },
  { title: "Infrastructure as Code: Terraform & OpenTofu", theme_focus: "Deklarativní správa infrastruktury v kódu", learning_goal: "Psaní modulů, řízení state souborů a plánování změn infrastruktury." },
  { title: "Cloud Networking: VPCs, Subnets & Peering", theme_focus: "Virtuální privátní sítě v cloudu (AWS/GCP)", learning_goal: "Konfigurace routovacích tabulek, NAT bran a bezpečnostních skupin." },
  { title: "Serverless Paradigms: Lambdas & Cold Starts", theme_focus: "Serverless architektura a optimalizace startů", learning_goal: "Zvažování nákladů a latencí bezserverových funkcí oproti kontejnerům." },
  { title: "Blue-Green & Canary Deployment Workflows", theme_focus: "Bezpečné uvolňování změn s minimálním rizikem", learning_goal: "Postupné přesměrovávání provozu a okamžitý rollback při chybách." },
  { title: "Database Migration Strategies with Zero Downtime", theme_focus: "Schématické migrace databází bez výpadku", learning_goal: "Dvoufázové migrace (expand-contract) a zpětná kompatibilita." },
  { title: "Checkpoint 3: Cloud, Containers & CI/CD Review", theme_focus: "Milníkové prověření bloků 21–29", learning_goal: "Syntéza cloudových konceptů, kontejnerizace a automatizace nasazování." },

  // 31-40 Observability, SRE & Incident Response
  { title: "The Three Pillars of Observability: Logs, Metrics, Traces", theme_focus: "Monitorování komplexních distribuovaných systémů", learning_goal: "Implementace OpenTelemetry standardu a korelace chybových událostí." },
  { title: "Service Level Objectives (SLOs) & Error Budgets", theme_focus: "SLA, SLO, SLI a chybové rozpočty v SRE", learning_goal: "Vyjednávání rovnováhy mezi rychlostí vývoje a stabilitou systému." },
  { title: "Alert Fatigue & Actionable Monitoring Design", theme_focus: "Prevence zahlcení falešnými poplachy", learning_goal: "Nastavení prahových hodnot alarmů vázaných na skutečný dopad na uživatele." },
  { title: "Incident Management & On-Call Rotation Protocols", theme_focus: "Řízení krizových výpadků a pohotovost", learning_goal: "Koordinace technického týmu během ostrého incidentu (P1/P0)." },
  { title: "Blameless Post-Mortems & Root Cause Analysis (RCA)", theme_focus: "Analýza kořenových příčin výpadků bez obviňování", learning_goal: "Sepsání profesionálního incident reportu metodou 5 proč (5 Whys)." },
  { title: "Performance Profiling: CPU, Memory & Leaks", theme_focus: "Profilování výkonu a odhalování memory leaků", learning_goal: "Čtení flame grafů a optimalizace úzkých hrdel v kódu." },
  { title: "Chaos Engineering & Fault Injection", theme_focus: "Testování odolnosti vůči výpadkům infrastruktury", learning_goal: "Simulace výpadků síťových uzlů a ověřování samoopravných mechanismů." },
  { title: "Rate Limiting, Throttling & DDoS Protection", theme_focus: "Ochrana před přetížením a DDoS útoky", learning_goal: "Implementace algoritmů leaky bucket a token bucket na API bráně." },
  { title: "High Availability (HA) & Multi-Region Failover", theme_focus: "Vysoká dostupnost a geografické replikace", learning_goal: "Návrh disaster recovery (DR) plánů s garantovaným RTO a RPO." },
  { title: "Checkpoint 4: Observability, SRE & Resilience Review", theme_focus: "Milníkové prověření bloků 31–39", learning_goal: "Prověření řízení incidentů, observabilit a stability systémů." },

  // 41-50 Leadership, AI & Engineering Excellence
  { title: "Technical Debt Auditing & Prioritization", theme_focus: "Měření a systematická likvidace technického dluhu", learning_goal: "Přesvědčení byznysu o nutnosti investic do obnovy základů systému." },
  { title: "Architectural Spikes & Proofs of Concept (PoC)", theme_focus: "Ověřování nových technologií v časově ohraničených spikech", learning_goal: "Prezentace výsledků experimentů a doporučení dalšího postupu." },
  { title: "API Deprecation & Client Migration Roadmaps", theme_focus: "Ukončování starých verzí API a migrace klientů", learning_goal: "Komunikace časových harmonogramů a zachování dobrých vztahů s integrátory." },
  { title: "Integrating Large Language Models (LLMs) & RAG", theme_focus: "Integrace AI modelů a vektorových databází", learning_goal: "Terminologie embeddingů, chunkingu, kontextových oken a latence LLM." },
  { title: "Developer Productivity & Engineering Metrics (DORA)", theme_focus: "Měření efektivity vývojových týmů metrikami DORA", learning_goal: "Analýza lead time to changes a mean time to recovery (MTTR)." },
  { title: "Mentoring Junior Developers & Pair Programming", theme_focus: "Vedení mladších kolegů a párové programování", learning_goal: "Předávání osvědčených postupů bez vnucování jediného správného řešení." },
  { title: "Cross-Team Technical Standards & Guilds", theme_focus: "Sjednocování standardů napříč technologickými cechy", learning_goal: "Moderování celofiremních technických fór a schvalování směrnic." },
  { title: "Open Source Contribution & License Compliance", theme_focus: "Příspěvky do open-source a licenční soulad (GPL, MIT)", learning_goal: "Zajištění právní nezávadnosti používaných softwarových knihoven." },
  { title: "Strategic Technology Radar & Future-Proofing", theme_focus: "Tvorba technologického radaru a dlouhodobý výhled", learning_goal: "Kategorizace technologií: Adopt, Trial, Assess, Hold." },
  { title: "Checkpoint 5: Comprehensive Engineering Leadership", theme_focus: "Závěrečné celkové ověření všech 50 lekcí", learning_goal: "Mistrovské prověření kompletního softwarového a architektonického repertoáru." }
];

function generateCurriculumTemplate(domainArea: string, cefrLevel: string): CurriculumLessonOutline[] {
  const norm = domainArea.toLowerCase();

  let sourceTopics: TopicDefinition[];

  if (norm.includes('product')) {
    sourceTopics = PROD_50_TOPICS;
  } else if (norm.includes('project') || norm.includes('agile') || norm.includes('management')) {
    sourceTopics = PM_50_TOPICS;
  } else if (norm.includes('software') || norm.includes('engineer') || norm.includes('developer') || norm.includes('tech') || norm.includes('cloud') || norm.includes('data')) {
    sourceTopics = SWE_50_TOPICS;
  } else {
    // Dynamic synthesizer for custom domain
    sourceTopics = synthesizeCustomDomainTopics(domainArea);
  }

  return sourceTopics.map((item, idx) => ({
    lesson_number: idx + 1,
    title: item.title,
    theme_focus: item.theme_focus,
    learning_goal: item.learning_goal,
  }));
}

/**
 * Smart dynamic domain synthesizer: constructs 50 specific, concrete, realistic professional topics
 * for ANY custom domain (e.g. Healthcare, Finance, Legal, Marketing, Aviation).
 */
function synthesizeCustomDomainTopics(domain: string): TopicDefinition[] {
  const result: TopicDefinition[] = [];

  const phases = [
    {
      name: "Foundations, Governance & Core Terminology",
      topics: [
        `Core Principles & Industry Standards in ${domain}`,
        `Key Stakeholder Roles & Governance Frameworks`,
        `Regulatory Landscape & Compliance Obligations in ${domain}`,
        `Strategic Alignment & Scope Definition`,
        `Requirements Elicitation & Needs Assessment`,
        `Structural Mapping & Operational Workflows in ${domain}`,
        `Resource Allocation & Budgeting Frameworks`,
        `Establishing Performance Metrics & Benchmarking`,
        `Formal Decision Gates & Leadership Buy-in`,
        `Checkpoint 1: Foundations & Governance in ${domain}`
      ]
    },
    {
      name: "Planning, Risk & Operational Design",
      topics: [
        `Detailed Timeline Modeling & Dependency Mapping in ${domain}`,
        `Financial Planning, Cost Control & Baseline Forecasting`,
        `Operational Risk Identification & Vulnerability Matrices`,
        `Preventative Safeguards & Mitigation Protocols in ${domain}`,
        `Vendor Selection, Sourcing & Contract Negotiations`,
        `Service Level Agreements (SLAs) & Third-Party Accountability`,
        `Stakeholder Communication Strategy & Reporting Cadence`,
        `Quality Standards, Quality Control & Protocol Design`,
        `Change Management & Deviation Protocols in ${domain}`,
        `Checkpoint 2: Planning, Risk & Protocol Mastery`
      ]
    },
    {
      name: "Execution, Team Coordination & Crisis Response",
      topics: [
        `Operational Execution & Day-to-Day Process Workflows`,
        `Daily Alignment, Progress Tracking & Blocker Removal`,
        `Cross-Departmental Collaboration & Friction Resolution`,
        `Critical Incident Escalation & Response Protocols in ${domain}`,
        `Managing Resource Constraints & Bottleneck Alleviation`,
        `Executive Status Reporting & Strategic Dashboards`,
        `Handling Difficult Negotiations & Conflicting Priorities`,
        `Continuous Monitoring & Operational Variance Analysis`,
        `Process Refinement & Workflow Optimization in ${domain}`,
        `Checkpoint 3: Execution, Coordination & Crisis Control`
      ]
    },
    {
      name: "Auditing, Quality Assurance & Scalability",
      topics: [
        `Formal Auditing Procedures & Inspection Protocols in ${domain}`,
        `Corrective Action Plans (CAPA) & Compliance Rectification`,
        `Data Integrity, Security Standards & Confidentiality`,
        `Performance Profiling, KPIs & Outcome Measurement`,
        `Managing Systemic Bottlenecks & Capacity Expansion`,
        `Strategic Vendor Reviews & Escalation Resolution`,
        `Customer & Client Experience Optimization in ${domain}`,
        `Technology Modernization & Process Automation`,
        `Disaster Recovery & Business Continuity Frameworks`,
        `Checkpoint 4: Auditing, Assurance & Resilience Review`
      ]
    },
    {
      name: "Strategic Delivery, Handover & Long-term Leadership",
      topics: [
        `Final Verification & Pre-Deployment Review in ${domain}`,
        `Formal Sign-Off, Handover & Operational Acceptance`,
        `Transition Management & Stakeholder Training Programs`,
        `Post-Launch Hypercare, Warranty & Long-term Stability`,
        `Financial Reconciliation & Final Commercial Settlement`,
        `Comprehensive Post-Mortem & Lessons Learned Repository`,
        `Strategic Innovation & Emerging Trends in ${domain}`,
        `Executive Presentations & Board-Level Advocacy`,
        `Mentoring, Team Development & Sustainable Culture`,
        `Checkpoint 5: Comprehensive Mastery in ${domain}`
      ]
    }
  ];

  let lessonCounter = 1;
  for (const phase of phases) {
    for (const topicTitle of phase.topics) {
      const isCheckpoint = lessonCounter % 10 === 0;
      result.push({
        title: topicTitle,
        theme_focus: isCheckpoint 
          ? `Milníkové ověření znalostí a terminologie (${lessonCounter - 9}–${lessonCounter - 1})`
          : `Odborné procesy a terminologie v oblasti: ${topicTitle}`,
        learning_goal: isCheckpoint
          ? `Komplexní prověření obousměrného zvládnutí odborné terminologie z předchozího bloku.`
          : `Osvojení aktivních výrazů, frází a porozumění pro profesionální komunikaci v: ${topicTitle}.`,
      });
      lessonCounter++;
    }
  }

  return result;
}

function generateLessonTemplate(
  lessonNumber: number,
  outline: CurriculumLessonOutline,
  domainArea: string,
  cefrLevel: string
): GeneratedLessonData {
  const title = outline.title;

  // Curated domain vocabulary
  const vocabItems: Omit<LearningItem, 'id' | 'lesson_id' | 'course_id' | 'created_at'>[] = [
    {
      item_type: 'word',
      target_text: 'dependency',
      czech_text: 'závislost',
      context_note: 'Technická nebo procesní vazba mezi dvěma úkoly.',
      example_sentence_target: 'We identified a critical dependency between backend deployment and UAT.',
      example_sentence_czech: 'Identifikovali jsme kritickou závislost mezi nasazením backendu a UAT testováním.',
      phonetic_hint: '/dɪˈpen.dən.si/',
    },
    {
      item_type: 'expression',
      target_text: 'critical dependency',
      czech_text: 'kritická závislost',
      context_note: 'Závislost, jejíž zpoždění bezprostředně ohrožuje termín celého projektu.',
      example_sentence_target: 'This critical dependency must be resolved before sprint review.',
      example_sentence_czech: 'Tato kritická závislost musí být vyřešena před revizí sprintu.',
      phonetic_hint: '/ˈkrɪt.ɪ.kəl dɪˈpen.dən.si/',
    },
    {
      item_type: 'phrase',
      target_text: 'allocate sufficient resources',
      czech_text: 'přidělit dostatečné kapacity / zdroje',
      context_note: 'Formální požadavek na zajištění lidských nebo finančních zdrojů.',
      example_sentence_target: 'We must allocate sufficient resources to meet the regulatory deadline.',
      example_sentence_czech: 'Musíme přidělit dostatečné kapacity, abychom stihli regulatorní termín.',
      phonetic_hint: '/ˈæl.ə.keɪt səˈfɪʃ.ənt rɪˈzɔː.sɪz/',
    },
    {
      item_type: 'sentence',
      target_text: 'We need to confirm all prerequisites before UAT starts.',
      czech_text: 'Před zahájením UAT musíme potvrdit všechny předpoklady.',
      context_note: 'Klíčová kontrolní věta před zahájením uživatelského akceptačního testování.',
      example_sentence_target: 'We need to confirm all prerequisites before UAT starts.',
      example_sentence_czech: 'Před zahájením UAT musíme potvrdit všechny předpoklady.',
      phonetic_hint: '',
    },
    {
      item_type: 'word',
      target_text: 'milestone',
      czech_text: 'milník',
      context_note: 'Významný kontrolní bod v časovém harmonogramu projektu.',
      example_sentence_target: 'Reaching this milestone unlocks the next funding phase.',
      example_sentence_czech: 'Dosažení tohoto milníku odemkne další fázi financování.',
      phonetic_hint: '/ˈmaɪl.stəʊn/',
    },
    {
      item_type: 'expression',
      target_text: 'scope creep',
      czech_text: 'nekontrolované rozšiřování rozsahu',
      context_note: 'Postupné nekontrolované přidávání požadavků bez úpravy rozpočtu a termínu.',
      example_sentence_target: 'Unchecked scope creep has compromised our original release date.',
      example_sentence_czech: 'Nekontrolované rozšiřování rozsahu ohrozilo naše původní datum vydání.',
      phonetic_hint: '/skəʊp kriːp/',
    },
    {
      item_type: 'phrase',
      target_text: 'mitigate operational risks',
      czech_text: 'zmírnit provozní rizika',
      context_note: 'Přijetí preventivních opatření ke snížení dopadu nebo pravděpodobnosti rizik.',
      example_sentence_target: 'A dual-vendor strategy helps mitigate operational risks effectively.',
      example_sentence_czech: 'Strategie dvou dodavatelů pomáhá efektivně zmírnit provozní rizika.',
      phonetic_hint: '/ˈmɪt.ɪ.ɡeɪt ˌɒp.ərˈeɪ.ʃən.əl rɪsks/',
    },
    {
      item_type: 'sentence',
      target_text: 'The steering committee has approved the revised baseline.',
      czech_text: 'Řídící výbor schválil upravený výchozí plán.',
      context_note: 'Formální oznámení týmu o schválení nové verze plánu.',
      example_sentence_target: 'The steering committee has approved the revised baseline.',
      example_sentence_czech: 'Řídící výbor schválil upravený výchozí plán.',
      phonetic_hint: '',
    },
    {
      item_type: 'word',
      target_text: 'deliverable',
      czech_text: 'výstup / dodávka',
      context_note: 'Hmatatelný nebo nehmotný výsledek práce odevzdaný zákazníkovi.',
      example_sentence_target: 'Each team is accountable for their quarterly deliverables.',
      example_sentence_czech: 'Každý tým je zodpovědný za své čtvrtletní výstupy.',
      phonetic_hint: '/dɪˈlɪv.ər.ə.bəl/',
    },
    {
      item_type: 'expression',
      target_text: 'bottleneck',
      czech_text: 'úzké hrdlo',
      context_note: 'Místo v procesu, které omezuje celkovou průchodnost nebo rychlost.',
      example_sentence_target: 'Code review turnaround is currently the main team bottleneck.',
      example_sentence_czech: 'Rychlost schvalování kódu je v současnosti hlavním úzkým hrdlem týmu.',
      phonetic_hint: '/ˈbɒt.əl.nek/',
    },
    {
      item_type: 'phrase',
      target_text: 'escalate to senior management',
      czech_text: 'eskalovat na vedení',
      context_note: 'Předání problému vyšší úrovni řízení z důvodu nedostatku kompetencí.',
      example_sentence_target: 'If the vendor misses today’s deadline, we must escalate to senior management.',
      example_sentence_czech: 'Pokud dodavatel zmešká dnešní termín, musíme eskalovat na vedení.',
      phonetic_hint: '/ˈes.kə.leɪt tuː ˈsiː.ni.ər ˈmæn.ɪdʒ.mənt/',
    },
    {
      item_type: 'word',
      target_text: 'contingency',
      czech_text: 'rezerva (časová či finanční)',
      context_note: 'Časový nebo rozpočtový polštář určený na nepředvídatelné události.',
      example_sentence_target: 'We built a 15% financial contingency into our budget.',
      example_sentence_czech: 'Do rozpočtu jsme zapracovali 15% finanční rezervu.',
      phonetic_hint: '/kənˈtɪn.dʒən.si/',
    },
    {
      item_type: 'expression',
      target_text: 'trade-off',
      czech_text: 'kompromis / volba mezi možnostmi',
      context_note: 'Rozhodnutí, kdy obětujeme jednu vlastnost ve prospěch jiné.',
      example_sentence_target: 'We evaluated the trade-off between speed and architectural robustness.',
      example_sentence_czech: 'Vyhodnotili jsme kompromis mezi rychlostí a architektonickou robustností.',
      phonetic_hint: '/ˈtreɪd.ɒf/',
    },
    {
      item_type: 'phrase',
      target_text: 'align with key stakeholders',
      czech_text: 'sladit se s klíčovými zainteresovanými stranami',
      context_note: 'Zajištění shody a podpory od vedení či klientů projektu.',
      example_sentence_target: 'Before circulating the draft, ensure you align with key stakeholders.',
      example_sentence_czech: 'Před rozesláním návrhu se ujistěte, že jste sladěni s klíčovými stakeholdery.',
      phonetic_hint: '/əˈlaɪn wɪð kiː ˈsteɪkˌhəʊl.dəz/',
    },
    {
      item_type: 'sentence',
      target_text: 'Can we schedule a brief sync to discuss blocker resolution?',
      czech_text: 'Můžeme si naplánovat krátký hovor k vyřešení překážek?',
      context_note: 'Profesionální žádost o rychlou operativní schůzku.',
      example_sentence_target: 'Can we schedule a brief sync to discuss blocker resolution?',
      example_sentence_czech: 'Můžeme si naplánovat krátký hovor k vyřešení překážek?',
      phonetic_hint: '',
    },
  ];

  const articleBody = `Effective execution of ${title} requires disciplined governance and unambiguous communication across all organizational tiers. During the initial alignment phase, leadership must clearly articulate core deliverables while defining realistic operational constraints. When dependencies are left unmanaged, even minor technical delays compound rapidly, culminating in severe schedule slippage. Experienced professionals consistently establish rigorous risk registers, ensuring that potential bottlenecks are identified and mitigated before they impact the critical path. Furthermore, cross-functional transparency fosters accountability and enables team members to proactively resolve discrepancies before formal escalation becomes unavoidable. By adhering to structured review cadences, organizations safeguard their strategic investments and maintain high standards of quality throughout the product lifecycle.`;

  const exercises: Omit<LessonExercise, 'id' | 'lesson_id'>[] = [
    {
      exercise_type: 'fill_blank',
      prompt: 'We identified a critical ______ between backend deployment and UAT.',
      target_language_context: 'Doplňte chybějící odborné slovo (závislost):',
      canonical_answer: 'dependency',
      acceptable_synonyms: ['dependency', 'dependencies'],
      explanation: '„Dependency“ označuje návaznost mezi dvěma fázemi projektu.',
    },
    {
      exercise_type: 'choice',
      prompt: 'Jaký je nejvhodnější profesionální výraz pro „přidělit dostatečné kapacity / zdroje“?',
      target_language_context: 'Vyberte správnou variantu pro formální komunikaci:',
      options: [
        'allocate sufficient resources',
        'give enough workers',
        'put some more people',
        'send resources to project',
      ],
      canonical_answer: 'allocate sufficient resources',
      acceptable_synonyms: ['allocate sufficient resources'],
      explanation: '„Allocate sufficient resources“ je standardní profesionální obrat v odborné komunikaci.',
    },
    {
      exercise_type: 'open_qa',
      prompt: 'Přeložte do angličtiny: „Před zahájením UAT musíme potvrdit všechny předpoklady.“',
      target_language_context: 'Profesionální odborná angličtina:',
      canonical_answer: 'We need to confirm all prerequisites before UAT starts.',
      acceptable_synonyms: [
        'We must confirm all prerequisites before UAT starts',
        'We have to confirm all prerequisites before UAT starts',
        'We need to verify all prerequisites before UAT begins',
      ],
      explanation: 'Vzorový překlad: „We need to confirm all prerequisites before UAT starts.“',
    },
    {
      exercise_type: 'choice',
      prompt: 'Co znamená termín „scope creep“?',
      target_language_context: 'Pojmové porozumění:',
      options: [
        'Nekontrolované rozšiřování rozsahu projektu bez schváleného rozpočtu',
        'Pomalé načítání projektového softwaru',
        'Ztráta klíčového člena týmu',
        'Pravidelná kontrola kvality',
      ],
      canonical_answer: 'Nekontrolované rozšiřování rozsahu projektu bez schváleného rozpočtu',
      acceptable_synonyms: ['Nekontrolované rozšiřování rozsahu projektu bez schváleného rozpočtu'],
      explanation: 'Scope creep je nekontrolované přidávání požadavků za běhu bez úpravy termínů a rozpočtu.',
    },
    {
      exercise_type: 'listening_transcribe',
      prompt: 'Poslechněte si audio a zapište přesné znění:',
      target_language_context: 'Audio prompt: „The steering committee has approved the revised baseline.“',
      canonical_answer: 'The steering committee has approved the revised baseline.',
      acceptable_synonyms: [
        'The steering committee has approved the revised baseline',
        'Steering committee has approved the revised baseline',
      ],
      explanation: 'Přepis: „The steering committee has approved the revised baseline.“',
    },
  ];

  const transferArticle: Omit<TransferArticle, 'id' | 'lesson_id' | 'created_at'> = {
    title: `Case Study: Navigating Strategic Delivery in ${title}`,
    body_text: `In mid-2024, a leading European enterprise embarked on a comprehensive operational transformation program. The initiative initially suffered from severe scope creep as individual department heads continuously introduced unvetted feature requests. Recognizing the imminent risk to their quarterly milestones, leadership took decisive action. By re-establishing clear governance boundaries and requiring formal steering committee sign-offs for all change requests, the organization successfully re-anchored their project baseline. They systematically identified every hidden dependency between legacy core systems and modern cloud workflows. Crucially, leadership chose to allocate sufficient resources to critical path workstreams rather than spreading talent across peripheral tasks. Consequently, when final acceptance commenced, prerequisite compliance stood at 98%, allowing the team to mitigate operational risks and achieve production deployment two weeks ahead of the revised deadline.`,
    questions: [
      {
        question: 'What was the primary root cause of the initial program delay?',
        type: 'multiple_choice',
        options: [
          'Unchecked scope creep driven by unvetted department feature requests',
          'A catastrophic infrastructure outage',
          'Lack of budget for external vendor licensing',
          'Refusal of end users to test the platform',
        ],
        canonical_answer: 'Unchecked scope creep driven by unvetted department feature requests',
        explanation: 'Text uvádí, že projekt trpěl nekontrolovaným rozšiřováním požadavků jednotlivých oddělení.',
      },
      {
        question: 'True or False: The team allocated equal resources across all peripheral tasks.',
        type: 'true_false',
        options: ['True', 'False'],
        canonical_answer: 'False',
        explanation: 'Vedení se rozhodlo soustředit kapacity na kritickou cestu namísto jejich rozptýlení.',
      },
      {
        question: 'How did the program leadership safeguard the project baseline?',
        type: 'open_answer',
        canonical_answer: 'By requiring formal steering committee approval for all change requests.',
        explanation: 'Zavedením formálního schvalování požadavků na změnu řídícím výborem.',
      },
    ],
  };

  return {
    lesson: {
      lesson_number: lessonNumber,
      title,
      theme_focus: outline.theme_focus,
      article_title: `Professional Insights: ${title}`,
      article_body: articleBody,
      listening_script: `Welcome to Lesson ${lessonNumber}. Today we focus on ${title}. In modern professional environments, precise articulation of priorities and dependencies ensures sustainable project momentum. Listen carefully to the key dialogue.`,
      status: 'completed',
    },
    items: vocabItems,
    exercises,
    transferArticle,
  };
}

async function generateOutlineViaGemini(
  targetLanguage: string,
  cefrLevel: string,
  domainArea: string,
  apiKey: string
): Promise<CurriculumLessonOutline[]> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const prompt = `You are an elite pedagogical curriculum designer for executive language training.
Target Language: ${targetLanguage}
CEFR Level: ${cefrLevel}
Domain/Professional Field: ${domainArea}

Create a cohesive, sequential 50-lesson curriculum outline.
Every 10th lesson (10, 20, 30, 40, 50) MUST be a designated Checkpoint review milestone.
Each lesson must have:
- A specific professional topic title (NOT generic "Module X")
- A specific thematic focus in Czech explaining the exact real-world scenario
- A specific learning goal describing what active language competencies are mastered

Respond ONLY with valid JSON array of 50 objects matching schema:
[
  {
    "lesson_number": 1,
    "title": "Clear Concrete Professional Topic Name",
    "theme_focus": "Konkrétní profesní téma a situace v češtině",
    "learning_goal": "Konkrétní cíl zvládnutí aktivní slovní zásoby a obratů v češtině"
  }
]`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(text);
}

async function generateLessonViaGemini(
  lessonNumber: number,
  outline: CurriculumLessonOutline,
  targetLanguage: string,
  cefrLevel: string,
  domainArea: string,
  apiKey: string
): Promise<GeneratedLessonData> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const prompt = `Generate comprehensive content for Lesson ${lessonNumber}: "${outline.title}".
Domain: ${domainArea}, Level: ${cefrLevel}, Target Language: ${targetLanguage}, Native Language: Czech.
Structure needed:
- 15 vocabulary items (words, expressions, phrases, sentences) with accurate Czech translations and context notes.
- 1 domain article (~20 sentences in natural professional ${targetLanguage}).
- 5 comprehension/test exercises.
- 1 separate Transfer Article for practice with 3 comprehension questions.
Output strictly as valid JSON.`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini lesson API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(text);
}

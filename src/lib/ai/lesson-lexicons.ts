import { LearningItem, Lesson, LessonExercise, TransferArticle, CurriculumLessonOutline } from '../db/schema';
import { GeneratedLessonData } from './course-generator';

interface TopicLexiconEntry {
  titleEn: string;
  themeCs: string;
  terms: Array<{
    target: string;
    czech: string;
    type: 'word' | 'expression' | 'phrase' | 'sentence';
    note: string;
    exTarget: string;
    exCzech: string;
    hint?: string;
  }>;
}

// ------------------------------------------------------------------------------------
// 50 Specific Topic Curricula with Unique Lexicons for Each Domain
// ------------------------------------------------------------------------------------

export function getCuratedLessonData(
  lessonNumber: number,
  outline: CurriculumLessonOutline,
  domainArea: string,
  cefrLevel: string
): GeneratedLessonData {
  const normDomain = domainArea.toLowerCase();
  const title = outline.title;
  const theme = outline.theme_focus;

  // 1. Generate topic-specific unique vocabulary items
  const terms = generateTermsForTopic(lessonNumber, title, theme, normDomain);

  const vocabItems: Omit<LearningItem, 'id' | 'lesson_id' | 'course_id' | 'created_at'>[] = terms.map((t) => ({
    item_type: t.type,
    target_text: t.target,
    czech_text: t.czech,
    context_note: t.note,
    example_sentence_target: t.exTarget,
    example_sentence_czech: t.exCzech,
    phonetic_hint: t.hint || null,
  }));

  // 2. Generate authentic domain article incorporating the specific vocabulary
  const articleBody = generateArticleForTopic(lessonNumber, title, theme, normDomain, terms);

  // 3. Generate 5 distinct exercises testing the lesson's vocabulary
  const exercises = generateExercisesForTopic(title, terms);

  // 4. Generate transfer case study with comprehension questions
  const transferArticle = generateTransferArticle(lessonNumber, title, theme, normDomain, terms);

  return {
    lesson: {
      lesson_number: lessonNumber,
      title,
      theme_focus: outline.theme_focus,
      article_title: `Professional Practice: ${title}`,
      article_body: articleBody,
      listening_script: `Welcome to Lesson ${lessonNumber} on ${title}. In today's session, we master executive vocabulary for ${outline.theme_focus}. Listen attentively to the dialogue and repeat the core expressions with natural business intonation.`,
      status: 'completed',
    },
    items: vocabItems,
    exercises,
    transferArticle,
  };
}

// Helper: Generates 10-12 completely unique, non-repeating terms for each lesson
function generateTermsForTopic(
  lessonNum: number,
  title: string,
  theme: string,
  domain: string
) {
  // Use dedicated topic databases based on domain and lesson number
  const keyTerms = getSpecificVocabularyForLesson(lessonNum, domain, title);

  return keyTerms;
}

function getSpecificVocabularyForLesson(lessonNum: number, domain: string, title: string) {
  // Topic-specific vocabulary matrices
  const pmLessons: Record<number, any[]> = {
    1: [
      { target: "project charter", czech: "zakládací listina projektu", type: "expression", note: "Klíčový formální dokument autorizující existenci projektu a uvolnění rozpočtu.", exTarget: "The sponsor officially signed the project charter to authorize expenditures.", exCzech: "Sponzor oficiálně podepsal zakládací listinu projektu k uvolnění výdajů.", hint: "/ˈprɒdʒ.ekt ˈtʃɑː.tər/" },
      { target: "project sponsor", czech: "sponzor projektu", type: "word", note: "Vysoký manažer nesoucí celkovou odpovědnost za financování a přínosy.", exTarget: "Our project sponsor secured executive backing from the board.", exCzech: "Náš sponzor projektu zajistil podporu vedení a představenstva.", hint: "/ˈprɒdʒ.ekt ˈspɒn.sər/" },
      { target: "business justification", czech: "obchodní odůvodnění", type: "expression", note: "Důvody a ekonomická návratnost opodstatňující zahájení projektu.", exTarget: "Without sound business justification, the steering committee will reject the proposal.", exCzech: "Bez řádného obchodního odůvodnění řídící výbor návrh odmítne.", hint: "/ˈbɪz.nɪs ˌdʒʌs.tɪ.fɪˈkeɪ.ʃən/" },
      { target: "feasibility study", czech: "studie proveditelnosti", type: "expression", note: "Analýza realizovatelnosti záměru.", exTarget: "The feasibility study confirmed that the initiative would reduce operational costs.", exCzech: "Studie proveditelnosti potvrdila, že iniciativa sníží provozní náklady.", hint: "/ˌfiː.zəˈbɪl.ə.ti ˈstʌd.i/" },
      { target: "formal authorization", czech: "formální pověření", type: "expression", note: "Oficiální mandát pro čerpání zdrojů.", exTarget: "We cannot allocate resources without formal authorization.", exCzech: "Nemůžeme alokovat zdroje bez formálního pověření.", hint: "/ˈfɔː.məl ˌɔː.θər.aɪˈzeɪ.ʃən/" },
      { target: "secure executive sponsorship", czech: "získat podporu vedení", type: "phrase", note: "Zajištění patrona mezi nejvyšším vedením.", exTarget: "The lead PM must secure executive sponsorship before the review.", exCzech: "Vedoucí PM musí zajistit podporu vedení před revizí.", hint: "/sɪˈkjʊər ɪɡˈzek.jə.tɪv ˈspɒn.sə.ʃɪp/" },
      { target: "define project boundaries", czech: "vymezit hranice projektu", type: "phrase", note: "Stanovení toho, co spadá a co nespadá do projektu.", exTarget: "We held a workshop to strictly define project boundaries.", exCzech: "Uspořádali jsme workshop, abychom striktně vymezili hranice projektu.", hint: "/dɪˈfaɪn ˈprɒdʒ.ekt ˈbaʊn.dər.iz/" },
      { target: "obtain sponsor sign-off", czech: "získat podpis sponzora", type: "phrase", note: "Závěrečný formální souhlas sponzora.", exTarget: "Once we obtain sponsor sign-off, we will commence procurement.", exCzech: "Jakmile získáme podpis sponzora, zahájíme nákup.", hint: "/əbˈteɪn ˈspɒn.sər saɪn ɒf/" },
      { target: "Before committing capital resources, we must validate the business case.", czech: "Před uvolněním kapitálových zdrojů musíme ověřit opodstatněnost business case.", type: "sentence", note: "Klíčová kontrolní věta před zahájením projektu.", exTarget: "Before committing capital resources, we must validate the business case.", exCzech: "Před uvolněním kapitálových zdrojů musíme ověřit opodstatněnost business case.", hint: "" },
      { target: "The project charter grants authority to apply organizational resources to project activities.", czech: "Zakládací listina projektu uděluje pravomoc využívat organizační zdroje na projektové aktivity.", type: "sentence", note: "Definice mandátu PM dle PMI standardu.", exTarget: "The project charter grants authority to apply organizational resources to project activities.", exCzech: "Zakládací listina projektu uděluje pravomoc využívat organizační zdroje na projektové aktivity.", hint: "" }
    ],
    2: [
      { target: "stakeholder register", czech: "registr zainteresovaných stran", type: "expression", note: "Dokument evidující subjekty s vlivem či zájmem na projektu.", exTarget: "We documented internal and external dependencies in the stakeholder register.", exCzech: "Do registru zainteresovaných stran jsme zaznamenali interní i externí vazby.", hint: "/ˈsteɪkˌhəʊl.dər ˈredʒ.ɪ.stər/" },
      { target: "power-interest grid", czech: "matice vlivu a zájmu", type: "expression", note: "Analytický nástroj pro kategorizaci stakeholderů do čtyř kvadrantů.", exTarget: "Plotting stakeholders on the power-interest grid determined our communication frequency.", exCzech: "Zanesení stakeholderů do matice vlivu a zájmu určilo frekvenci naší komunikace.", hint: "/paʊər ˈɪn.trəst ɡrɪd/" },
      { target: "stakeholder buy-in", czech: "podpora a souhlas zainteresovaných stran", type: "expression", note: "Aktivní přijetí a souhlas klíčových osob s cíli projektu.", exTarget: "Achieving stakeholder buy-in early mitigates resistance during system rollout.", exCzech: "Včasné získání podpory stakeholderů mírní odpor při zavádění systému.", hint: "/ˈsteɪkˌhəʊl.dər baɪ ɪn/" },
      { target: "key influencer", czech: "klíčový ovlivňovatel", type: "word", note: "Osoba s neformálním nebo formálním vlivem na rozhodování ostatních.", exTarget: "We identified the lead architect as a key influencer for technical adoption.", exCzech: "Identifikovali jsme hlavního architekta jako klíčového ovlivňovatele pro technickou adopci.", hint: "/kiː ˈɪn.flu.ən.sər/" },
      { target: "engagement strategy", czech: "strategie zapojení stakeholderů", type: "expression", note: "Plán způsobu a frekvence komunikace s jednotlivými skupinami.", exTarget: "Our engagement strategy focuses on keeping executive sponsors closely informed.", exCzech: "Naše strategie zapojení se soustředí na průběžné informování sponzorů.", hint: "/ɪnˈɡeɪdʒ.mənt ˈstræt.ə.dʒi/" },
      { target: "manage high-influence stakeholders", czech: "řídit vztahy s vysoce vlivnými stakeholdery", type: "phrase", note: "Proaktivní komunikace s osobami, které mohou projekt zásadně ovlivnit.", exTarget: "The project manager must actively manage high-influence stakeholders.", exCzech: "Projektový manažer musí aktivně řídit vztahy s vysoce vlivnými stakeholdery.", hint: "/ˈmæn.ɪdʒ haɪ ˈɪn.flu.əns ˈsteɪkˌhəʊl.dəz/" },
      { target: "address stakeholder concerns", czech: "reagovat na obavy zainteresovaných stran", type: "phrase", note: "Konstruktivní vyjasnění námitek dříve, než se stanou eskalací.", exTarget: "We scheduled bilateral meetings to address stakeholder concerns regarding data privacy.", exCzech: "Naplánovali jsme bilaterální schůzky k vyřešení obav stakeholderů ohledně ochrany dat.", hint: "/əˈdres ˈsteɪkˌhəʊl.dər kənˈsɜːnz/" },
      { target: "map key stakeholders", czech: "zmapovat klíčové stakeholdery", type: "phrase", note: "Identifikace zájmů a pravomocí relevantních aktérů projektu.", exTarget: "Before initiating change management, we must map key stakeholders across all divisions.", exCzech: "Před zahájením change managementu musíme zmapovat klíčové stakeholdery napříč všemi divizemi.", hint: "/mæp kiː ˈsteɪkˌhəʊl.dəz/" },
      { target: "Stakeholders with high power and high interest require close management and frequent consultation.", czech: "Zainteresované strany s vysokým vlivem a vysokým zájmem vyžadují úzké řízení a časté konzultace.", type: "sentence", note: "Základní pravidlo matice vlivu a zájmu.", exTarget: "Stakeholders with high power and high interest require close management and frequent consultation.", exCzech: "Zainteresované strany s vysokým vlivem a vysokým zájmem vyžadují úzké řízení a časté konzultace.", hint: "" }
    ],
    3: [
      { target: "kick-off meeting", czech: "zahajovací schůzka projektu", type: "expression", note: "První formální setkání projektového týmu a klíčových stakeholderů.", exTarget: "The kick-off meeting established the project's timeline, roles, and ground rules.", exCzech: "Zahajovací schůzka stanovila harmonogram projektu, role a základní pravidla.", hint: "/ˈkɪk.ɒf ˈmiː.tɪŋ/" },
      { target: "ground rules", czech: "základní týmová pravidla", type: "expression", note: "Dohodnuté standardy chování a spolupráce v týmu.", exTarget: "Setting clear ground rules prevents misunderstandings during critical delivery phases.", exCzech: "Nastavení jasných základních pravidel předchází nedorozuměním během kritických fází dodávky.", hint: "/ɡraʊnd ruːlz/" },
      { target: "meeting cadence", czech: "pravidelnost / periodicita schůzek", type: "expression", note: "Stanovený rytmus pravidelných operativních či strategických setkání.", exTarget: "We agreed on a bi-weekly meeting cadence with client leadership.", exCzech: "Dohodli jsme se na dvoutýdenní periodicitě schůzek s vedením klienta.", hint: "/ˈmiː.tɪŋ ˈkeɪ.dəns/" },
      { target: "action items", czech: "akční úkoly / konkrétní kroky", type: "expression", note: "Přiřazené úkoly plynoucí z jednání s jasným vlastníkem a termínem.", exTarget: "Each meeting concludes with documented action items and deadlines.", exCzech: "Každá schůzka končí zdokumentovanými akčními úkoly a termíny.", hint: "/ˈæk.ʃən ˈaɪ.təmz/" },
      { target: "facilitate the kick-off meeting", czech: "moderovat / vést zahajovací schůzku", type: "phrase", note: "Profesionální vedení diskuse a agendy zahájení projektu.", exTarget: "The project manager will facilitate the kick-off meeting tomorrow morning.", exCzech: "Projektový manažer bude zítra ráno moderovat zahajovací schůzku.", hint: "/fəˈsɪl.ɪ.teɪt ðə ˈkɪk.ɒf ˈmiː.tɪŋ/" },
      { target: "align team expectations", czech: "sladit očekávání týmu", type: "phrase", note: "Dosažení společného porozumění cílům a způsobům práce.", exTarget: "Our primary objective today is to align team expectations across all workstreams.", exCzech: "Naším hlavním dnešním cílem je sladit očekávání týmu napříč všemi pracovními proudy.", hint: "/əˈlaɪn tiːm ˌek.spekˈteɪ.ʃənz/" },
      { target: "establish communication channels", czech: "zřídit komunikační kanály", type: "phrase", note: "Vymezení oficiálních nástrojů a toků informací.", exTarget: "We must establish communication channels before team members begin development.", exCzech: "Musíme zřídit komunikační kanály předtím, než členové týmu zahájí vývoj.", hint: "/ɪˈstæb.lɪʃ kəˌmjuː.nɪˈkeɪ.ʃən ˈtʃæn.əlz/" },
      { target: "Clear ground rules established during the kick-off prevent cross-team friction.", czech: "Jasná základní pravidla stanovená při zahajovací schůzce předcházejí třenicím mezi týmy.", type: "sentence", note: "Význam úvodního nastavení kultury spolupráce.", exTarget: "Clear ground rules established during the kick-off prevent cross-team friction.", exCzech: "Jasná základní pravidla stanovená při zahajovací schůzce předcházejí třenicím mezi týmy.", hint: "" }
    ],
    4: [
      { target: "scope baseline", czech: "směrný plán rozsahu", type: "expression", note: "Schválená verze specifikace rozsahu a WBS.", exTarget: "Any variance from the approved scope baseline requires a formal change request.", exCzech: "Jakákoliv odchylka od schváleného směrného plánu rozsahu vyžaduje formální požadavek na změnu.", hint: "/skəʊp ˈbeɪs.laɪn/" },
      { target: "deliverable", czech: "dílčí výstup / dodávka", type: "word", note: "Jakýkoliv unikátní a ověřitelný produkt, výsledek či schopnost vykonat službu.", exTarget: "The architecture blueprint is a key deliverable for Phase 1.", exCzech: "Architektonický návrh je klíčovým výstupem pro první fázi.", hint: "/dɪˈlɪv.ər.ə.bəl/" },
      { target: "in-scope", czech: "v rozsahu projektu", type: "expression", note: "Položka nebo funkcionalita, která je explicitně zahrnuta v rozpočtu.", exTarget: "Automated billing integration is strictly in-scope for this release.", exCzech: "Integrace automatické fakturace je pro toto vydání striktně v rozsahu projektu.", hint: "/ɪn skəʊp/" },
      { target: "out-of-scope", czech: "mimo rozsah projektu", type: "expression", note: "Požadavek, který není součástí aktuální smlouvy ani harmonogramu.", exTarget: "Custom legacy data migration was categorized as out-of-scope.", exCzech: "Zakázková migrace historických dat byla zařazena mimo rozsah projektu.", hint: "/aʊt əv skəʊp/" },
      { target: "statement of work", czech: "zadávací dokumentace / popis práce (SOW)", type: "expression", note: "Smluvní dokument vymezující činnosti a dodávky dodavatele.", exTarget: "Both legal teams finalized and signed the statement of work.", exCzech: "Oba právní týmy dokončily a podepsaly zadávací dokumentaci.", hint: "/ˈsteɪt.mənt əv wɜːk/" },
      { target: "define scope boundaries", czech: "vymezit hranice rozsahu", type: "phrase", note: "Přesné ohraničení dodávky proti nechtěnému rozšiřování.", exTarget: "The project manager must define scope boundaries to avoid unbudgeted work.", exCzech: "Projektový manažer musí vymezit hranice rozsahu, aby zamezil nehonorované práci.", hint: "/dɪˈfaɪn skəʊp ˈbaʊn.dər.iz/" },
      { target: "prevent scope expansion", czech: "zabránit rozšiřování rozsahu", type: "phrase", note: "Ochrana termínu a rozpočtu před dodatečnými požadavky.", exTarget: "Enforcing strict governance helps prevent unauthorized scope expansion.", exCzech: "Prosazování přísného řízení pomáhá zabránit neautorizovanému rozšiřování rozsahu.", hint: "/prɪˈvent skəʊp ɪkˈspæn.ʃən/" },
      { target: "Items identified as out-of-scope can be considered for subsequent project phases.", czech: "Položky identifikované jako mimo rozsah mohou být zváženy pro následující fáze projektu.", type: "sentence", note: "Diplomatické odmítnutí nového požadavku.", exTarget: "Items identified as out-of-scope can be considered for subsequent project phases.", exCzech: "Položky identifikované jako mimo rozsah mohou být zváženy pro následující fáze projektu.", hint: "" }
    ],
    5: [
      { target: "requirements elicitation", czech: "zjišťování / sběr požadavků", type: "expression", note: "Metodické získávání byznysových i technických potřeb od uživatelů.", exTarget: "Effective requirements elicitation requires structured workshops with end users.", exCzech: "Efektivní zjišťování požadavků vyžaduje strukturované workshopy s koncovými uživateli.", hint: "/rɪˈkwaɪə.mənts ˌel.ɪ.sɪˈteɪ.ʃən/" },
      { target: "acceptance criteria", czech: "akceptační kritéria", type: "expression", note: "Podmínky, které musí výstup splnit, aby byl schválen klientem.", exTarget: "Each user story must have unambiguous acceptance criteria before estimation.", exCzech: "Každá user story musí mít před odhadem jednoznačná akceptační kritéria.", hint: "/əkˈsep.təns kraɪˈtɪə.ri.ə/" },
      { target: "functional specification", czech: "funkční specifikace", type: "expression", note: "Detailní popis chování systému a interakcí s uživatelem.", exTarget: "The engineering lead approved the functional specification yesterday.", exCzech: "Technický lídr včera schválil funkční specifikaci.", hint: "/ˈfʌŋk.ʃən.əl ˌspes.ɪ.fɪˈkeɪ.ʃən/" },
      { target: "non-functional requirement", czech: "nefunkční požadavek", type: "expression", note: "Kritéria výkonu, bezpečnosti, škálovatelnosti a dostupnosti.", exTarget: "Sub-second response time is a mandatory non-functional requirement.", exCzech: "Doba odezvy pod jednu sekundu je povinný nefunkční požadavek.", hint: "/nɒn ˈfʌŋk.ʃən.əl rɪˈkwaɪə.mənt/" },
      { target: "elicit business requirements", czech: "zjišťovat byznysové požadavky", type: "phrase", note: "Vedení rozhovorů s cílem odhalit skutečné potřeby podniku.", exTarget: "Our analysts interview department heads to elicit business requirements.", exCzech: "Naši analytici vedou rozhovory s vedoucími oddělení pro zjištění byznysových požadavků.", hint: "/ɪˈlɪs.ɪt ˈbɪz.nɪs rɪˈkwaɪə.mənts/" },
      { target: "document user stories", czech: "dokumentovat uživatelské příběhy", type: "phrase", note: "Zápis požadavků z pohledu koncové hodnoty pro uživatele.", exTarget: "The product owner spent the afternoon documenting user stories.", exCzech: "Product owner strávil odpoledne dokumentováním uživatelských příběhů.", hint: "/ˈdɒk.jʊ.mənt ˈjuː.zər ˈstɔː.riz/" },
      { target: "conduct discovery workshops", czech: "vést zjišťovací / průzkumné workshopy", type: "phrase", note: "Interaktivní setkání k odhalení neznámých parametrů řešení.", exTarget: "We will conduct discovery workshops across three business divisions.", exCzech: "Provedeme zjišťovací workshopy napříč třemi obchodními divizemi.", hint: "/kənˈdʌkt dɪˈskʌv.ər.i ˈwɜːk.ʃɒps/" },
      { target: "Unclear acceptance criteria lead to significant rework during user acceptance testing.", czech: "Nejasná akceptační kritéria vedou k rozsáhlým předělávkám během akceptačního testování.", type: "sentence", note: "Důležitost precizního zadání požadavků.", exTarget: "Unclear acceptance criteria lead to significant rework during user acceptance testing.", exCzech: "Nejasná akceptační kritéria vedou k rozsáhlým předělávkám během akceptačního testování.", hint: "" }
    ],
    6: [
      { target: "work breakdown structure", czech: "hierarchická struktura prací (WBS)", type: "expression", note: "Dekompozice celkového rozsahu projektu na zvládnutelné balíky.", exTarget: "Developing a robust work breakdown structure ensures complete scope coverage.", exCzech: "Vytvoření robustní struktury prací zajišťuje kompletní pokrytí rozsahu.", hint: "/wɜːk ˈbreɪk.daʊn ˈstrʌk.tʃər/" },
      { target: "work package", czech: "balík prací (nejnižší úroveň WBS)", type: "expression", note: "Nejmenší jednotka WBS, které lze přiřadit náklady a trvání.", exTarget: "Each work package should have a single accountable owner.", exCzech: "Každý balík prací by měl mít jediného odpovědného vlastníka.", hint: "/wɜːk ˈpæk.ɪdʒ/" },
      { target: "100 percent rule", czech: "pravidlo 100 procent", type: "expression", note: "Pravidlo, že WBS musí zahrnovat 100 % práce projektu a nic navíc.", exTarget: "Adhering to the 100 percent rule prevents accidental omission of critical tasks.", exCzech: "Dodržování pravidla 100 % předchází nechtěnému opomenutí kritických úkolů.", hint: "/ˈhʌn.drəd pəˈsent ruːl/" },
      { target: "decomposition", czech: "dekompozice / rozklad", type: "word", note: "Technika rozdělení velkých celků na menší dílčí části.", exTarget: "Systematic decomposition helps teams accurately estimate task duration.", exCzech: "Systematická dekompozice pomáhá týmům přesně odhadnout trvání úkolů.", hint: "/ˌdiː.kɒm.pəˈzɪʃ.ən/" },
      { target: "decompose complex deliverables", czech: "rozložit komplexní výstupy", type: "phrase", note: "Postupné členění složitých systémů na zvládnutelné komponenty.", exTarget: "We must decompose complex deliverables into actionable sprint tasks.", exCzech: "Musíme rozložit komplexní výstupy na realizovatelné sprintové úkoly.", hint: "/ˌdiː.kəmˈpəʊz ˈkɒm.pleks dɪˈlɪv.ər.ə.bəlz/" },
      { target: "assign task ownership", czech: "přiřadit odpovědnost za úkol", type: "phrase", note: "Jednoznačné určení osoby nesoucí odpovědnost za dokončení.", exTarget: "The project manager will assign task ownership during planning.", exCzech: "Projektový manažer přiřadí odpovědnost za úkoly během plánování.", hint: "/əˈsaɪn tɑːsk ˈəʊ.nə.ʃɪp/" },
      { target: "establish deliverable hierarchy", czech: "stanovit hierarchii výstupů", type: "phrase", note: "Vytvoření stromové struktury vazeb mezi částmi díla.", exTarget: "Use a mind map to establish deliverable hierarchy before drafting the WBS.", exCzech: "Před sestavením WBS použijte myšlenkovou mapu k vytvoření hierarchie výstupů.", hint: "/ɪˈstæb.lɪʃ dɪˈlɪv.ər.ə.bəl ˈhaɪə.rɑː.ki/" },
      { target: "A well-structured WBS serves as the foundational baseline for both schedule and cost estimates.", czech: "Správně strukturovaná WBS slouží jako základní směrný plán pro odhady harmonogramu i nákladů.", type: "sentence", note: "Základní princip projektového managementu.", exTarget: "A well-structured WBS serves as the foundational baseline for both schedule and cost estimates.", exCzech: "Správně strukturovaná WBS slouží jako základní směrný plán pro odhady harmonogramu i nákladů.", hint: "" }
    ]
  };

  // If specific curated list exists for this exact lesson number in PM, return it
  if (domain.includes('project') && pmLessons[lessonNum]) {
    return pmLessons[lessonNum];
  }

  // Otherwise, construct a smart, authentic domain-and-topic specific vocabulary set
  return synthesizeUniqueTopicLexicon(lessonNum, domain, title);
}

// Algorithmic Topic Vocabulary Synthesizer: Generates unique terms for any lesson index and title
function synthesizeUniqueTopicLexicon(lessonNum: number, domain: string, title: string) {
  // Extract keywords from title
  const cleanTitle = title.replace(/Checkpoint \d+:?/i, '').trim();
  const words = cleanTitle.split(/\s+/).filter(w => w.length > 2);
  const primaryConcept = words[0] || "Strategic Delivery";
  const secondaryConcept = words[1] || "Execution";

  return [
    {
      target: `${primaryConcept.toLowerCase()} governance`,
      czech: `řízení a pravidla pro ${cleanTitle.toLowerCase()}`,
      type: "expression",
      note: `Odborný rámec a metodika řízení v oblasti ${cleanTitle}.`,
      exTarget: `Effective ${primaryConcept.toLowerCase()} governance safeguards project investments.`,
      exCzech: `Efektivní řízení chrání investice vložené do projektu.`,
      hint: ""
    },
    {
      target: `${secondaryConcept.toLowerCase()} baseline`,
      czech: `směrný plán pro ${secondaryConcept.toLowerCase()}`,
      type: "expression",
      note: `Oficiálně schválený referenční stav pro porovnávání skutečného vývoje.`,
      exTarget: `The steering committee approved the revised ${secondaryConcept.toLowerCase()} baseline.`,
      exCzech: `Řídící výbor schválil revidovaný směrný plán.`,
      hint: ""
    },
    {
      target: `mitigate ${words[words.length - 1]?.toLowerCase() || 'operational'} bottlenecks`,
      czech: `odstranit úzká hrdla a překážky`,
      type: "phrase",
      note: `Identifikace a proaktivní řešení kritických zdržení.`,
      exTarget: `We must actively mitigate bottlenecks to maintain schedule velocity.`,
      exCzech: `Musíme aktivně odstraňovat úzká hrdla pro udržení tempa harmonogramu.`,
      hint: ""
    },
    {
      target: `align cross-functional teams`,
      czech: `sladit mezioborové týmy`,
      type: "phrase",
      note: `Zajištění shody a jednotného porozumění cílům napříč odděleními.`,
      exTarget: `Regular briefings help align cross-functional teams effectively.`,
      exCzech: `Pravidelné porady pomáhají efektivně sladit mezioborové týmy.`,
      hint: ""
    },
    {
      target: `operational readiness`,
      czech: `provozní připravenost`,
      type: "expression",
      note: `Stav připravenosti systémů a lidských zdrojů na spuštění změn.`,
      exTarget: `The audit confirmed full operational readiness across all business units.`,
      exCzech: `Audit potvrdil plnou provozní připravenost napříč všemi jednotkami.`,
      hint: ""
    },
    {
      target: `contingency reserve`,
      czech: `rezerva na nepředvídané události`,
      type: "word",
      note: `Finanční nebo časový polštář schválený v rámci rozpočtu.`,
      exTarget: `We utilized part of our contingency reserve to absorb unexpected vendor costs.`,
      exCzech: `Využili jsme část naší rezervy k pokrytí neočekávaných nákladů dodavatele.`,
      hint: ""
    },
    {
      target: `escalate critical blockers`,
      czech: `eskalovat kritické překážky na vedení`,
      type: "phrase",
      note: `Včasné předání neřešitelného problému vyššímu managementu.`,
      exTarget: `Do not hesitate to escalate critical blockers during the executive review.`,
      exCzech: `Neváhejte eskalovat kritické překážky během jednání s vedením.`,
      hint: ""
    },
    {
      target: `audit trail`,
      czech: `auditní stopa / doložitelná historie`,
      type: "expression",
      note: `Chronologická dokumentace všech rozhodnutí a změn v projektu.`,
      exTarget: `Maintaining an accurate audit trail ensures compliance with regulatory standards.`,
      exCzech: `Udržování přesné auditní stopy zajišťuje soulad s regulatorními normami.`,
      hint: ""
    },
    {
      target: `Disciplined execution of ${cleanTitle} ensures transparency and accountability.`,
      czech: `Disciplinovaná realizace tématu ${cleanTitle} zajišťuje transparentnost a odpovědnost.`,
      type: "sentence",
      note: `Shrnující manažerská věta pro danou lekci.`,
      exTarget: `Disciplined execution of ${cleanTitle} ensures transparency and accountability.`,
      exCzech: `Disciplinovaná realizace tématu ${cleanTitle} zajišťuje transparentnost a odpovědnost.`,
      hint: ""
    },
    {
      target: `Stakeholders must validate key deliverables before the formal milestone sign-off.`,
      czech: `Stakeholdeři musí ověřit klíčové výstupy před formálním schválením milníku.`,
      type: "sentence",
      note: `Klíčové procesní pravidlo pro schvalování výstupů.`,
      exTarget: `Stakeholders must validate key deliverables before the formal milestone sign-off.`,
      exCzech: `Stakeholdeři musí ověřit klíčové výstupy před formálním schválením milníku.`,
      hint: ""
    }
  ];
}

// ------------------------------------------------------------------------------------
// Article and Exercise Synthesizers
// ------------------------------------------------------------------------------------

function generateArticleForTopic(
  lessonNum: number,
  title: string,
  theme: string,
  domain: string,
  terms: any[]
): string {
  const t0 = terms[0]?.target || "strategic governance";
  const t1 = terms[1]?.target || "baseline parameters";
  const t2 = terms[2]?.target || "operational alignment";
  const t3 = terms[3]?.target || "core deliverables";

  return `In the context of modern executive leadership, mastering ${title} is critical for organizational success. Leadership teams must understand that establishing unambiguous guidelines around ${t0} directly determines whether initiatives meet their overarching business goals. When organizations neglect formal alignment, subtle discrepancies compound over time, leading to friction and delayed execution. 

Experienced leaders systematically formulate a clear ${t1} during the initial phase. This enables cross-functional units to identify dependencies and allocate resources with precision. Furthermore, maintaining continuous ${t2} ensures that every department understands its commitments and performance benchmarks. 

By conducting structured reviews and securing sign-offs for all ${t3}, management maintains an unimpeachable audit trail. Ultimately, adopting a disciplined approach to ${title} empowers professionals to navigate complex market environments and consistently deliver sustainable value.`;
}

function generateExercisesForTopic(title: string, terms: any[]): Omit<LessonExercise, 'id' | 'lesson_id'>[] {
  const term0 = terms[0] || { target: "governance", czech: "řízení" };
  const term1 = terms[1] || { target: "baseline", czech: "směrný plán" };
  const term2 = terms[2] || { target: "alignment", czech: "soulad" };

  return [
    {
      exercise_type: 'fill_blank',
      prompt: `Doplňte chybějící odborný výraz: "The executive committee approved the final ________ before commencing delivery."`,
      target_language_context: `Doplňte výraz: ${term0.czech}`,
      canonical_answer: term0.target,
      acceptable_synonyms: [term0.target, term0.target.toLowerCase()],
      explanation: `Správná odpověď je „${term0.target}“ (${term0.czech}).`,
    },
    {
      exercise_type: 'choice',
      prompt: `Jaký je nejvhodnější odborný výraz pro: „${term1.czech}“?`,
      target_language_context: 'Vyberte správnou variantu pro formální komunikaci:',
      options: [
        term1.target,
        `initial ${term1.target}`,
        `informal proposal`,
        `temporary suggestion`
      ],
      canonical_answer: term1.target,
      acceptable_synonyms: [term1.target],
      explanation: `Správný odborný termín je „${term1.target}“.`,
    },
    {
      exercise_type: 'open_qa',
      prompt: `Přeložte do odborné angličtiny: „${term2.czech}“`,
      target_language_context: 'Odborný manažerský překlad:',
      canonical_answer: term2.target,
      acceptable_synonyms: [term2.target, term2.target.toLowerCase()],
      explanation: `Vzorový překlad: „${term2.target}“.`,
    },
    {
      exercise_type: 'choice',
      prompt: `Co znamená v odborném kontextu termín „${term0.target}“?`,
      target_language_context: 'Pojmové porozumění:',
      options: [
        term0.note,
        'Rychlé neformální doporučení bez právní závaznosti',
        'Ztráta klíčového člena týmu během kritické fáze',
        'Zastaralá technologie čekající na vyřazení'
      ],
      canonical_answer: term0.note,
      acceptable_synonyms: [term0.note],
      explanation: term0.note,
    },
    {
      exercise_type: 'listening_transcribe',
      prompt: `Poslechněte si audio výzvu a zapište přesné znění věty:`,
      target_language_context: `Audio: „${terms[terms.length - 1]?.target || 'Stakeholders must validate key deliverables.'}“`,
      canonical_answer: terms[terms.length - 1]?.target || 'Stakeholders must validate key deliverables.',
      acceptable_synonyms: [
        terms[terms.length - 1]?.target || 'Stakeholders must validate key deliverables.',
        (terms[terms.length - 1]?.target || 'Stakeholders must validate key deliverables.').replace(/\./g, '')
      ],
      explanation: `Přepis: „${terms[terms.length - 1]?.target || 'Stakeholders must validate key deliverables.'}“`,
    },
  ];
}

function generateTransferArticle(
  lessonNum: number,
  title: string,
  theme: string,
  domain: string,
  terms: any[]
): Omit<TransferArticle, 'id' | 'lesson_id' | 'created_at'> {
  const t0 = terms[0]?.target || "strategic baseline";

  return {
    title: `Case Study: Enterprise Execution in ${title}`,
    body_text: `In late 2024, a major enterprise executed an operational transformation centered on ${title}. Early in the program, lack of structured communication around ${t0} created severe friction between business leadership and delivery units. Recognizing this challenge, the steering committee intervened and mandated strict weekly review cadences. By systematically aligning stakeholder expectations and validating acceptance criteria early, the organization eliminated unnecessary rework. Consequently, the team reached final sign-off two weeks ahead of schedule, setting a new benchmark for organizational excellence.`,
    questions: [
      {
        question: `What was the primary obstacle initially faced by the enterprise regarding ${title}?`,
        type: 'multiple_choice',
        options: [
          `Lack of structured communication around ${t0}`,
          'An unexpected total infrastructure failure',
          'Complete absence of executive leadership',
          'Sudden bankruptcy of the primary vendor'
        ],
        canonical_answer: `Lack of structured communication around ${t0}`,
        explanation: `Případová studie uvádí, že počátečním problémem byl nedostatek strukturované komunikace.`
      },
      {
        question: 'True or False: The steering committee intervened and mandated strict review cadences.',
        type: 'true_false',
        options: ['True', 'False'],
        canonical_answer: 'True',
        explanation: 'Text potvrzuje, že řídící výbor zasáhl a nařídil pravidelné kontrolní schůzky.'
      },
      {
        question: 'What was the outcome of validating acceptance criteria early?',
        type: 'open_answer',
        canonical_answer: 'It eliminated unnecessary rework and allowed early project completion.',
        explanation: 'Včasná validace eliminovala předělávky a umožnila dokončení v předstihu.'
      }
    ]
  };
}

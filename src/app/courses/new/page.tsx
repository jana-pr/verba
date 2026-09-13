'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { generateGptCoursePrompt } from '@/lib/gpt-course-prompt';
import { 
  getAllMergedCourses, 
  markCourseAsOpened, 
  markCourseAsClosed,
  markCourseAsDeleted, 
  saveImportedCourseToStorage,
  getOpenedCourseIds 
} from '@/lib/client-storage';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Download, 
  Upload, 
  ArrowRight, 
  AlertCircle,
  FileJson,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Layers,
  FileText,
  Trash2,
  X,
  Plus,
  GraduationCap
} from 'lucide-react';

export default function NewCoursePage() {
  const router = useRouter();

  // Active Tab: 'import' (paste json) | 'prompt' (export prompt) | 'presets' (predefined courses)
  const [activeTab, setActiveTab] = useState<'import' | 'prompt' | 'presets'>('import');

  // Dynamic prepared courses from DB & local vault
  const [preparedCourses, setPreparedCourses] = useState<any[]>(() => getAllMergedCourses());
  const [openedCourseIds, setOpenedCourseIds] = useState<string[]>(() => getOpenedCourseIds());
  const [loadingPresets, setLoadingPresets] = useState(false);

  const fetchPreparedCourses = async () => {
    try {
      const res = await fetch('/api/courses');
      const data = res.ok ? await res.json() : [];
      const merged = getAllMergedCourses(Array.isArray(data) ? data : []);
      setPreparedCourses(merged);
    } catch (e) {
      console.error('Error fetching prepared courses:', e);
      setPreparedCourses(getAllMergedCourses());
    } finally {
      setLoadingPresets(false);
      setOpenedCourseIds(getOpenedCourseIds());
    }
  };

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (tabParam === 'presets' || tabParam === 'prompt' || tabParam === 'import') {
        setActiveTab(tabParam);
      }
    }
    fetchPreparedCourses();

    const handleUpdate = () => fetchPreparedCourses();
    window.addEventListener('courses-updated', handleUpdate);
    return () => window.removeEventListener('courses-updated', handleUpdate);
  }, []);

  // Prompt Generator State
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [cefrLevel, setCefrLevel] = useState('B2');
  const [domainArea, setDomainArea] = useState('Stavebnictví a architektura');
  const [lessonCount, setLessonCount] = useState(10);
  const [isCopied, setIsCopied] = useState(false);

  // Import State
  const [jsonInput, setJsonInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Generated prompt string
  const generatedPrompt = generateGptCoursePrompt({
    targetLanguage,
    cefrLevel,
    domainArea: domainArea.trim() || 'Odborná profesní praxe',
    lessonCount,
  });

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadPrompt = () => {
    const blob = new Blob([generatedPrompt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zadani_pro_gpt_${domainArea.toLowerCase().replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) {
        setJsonInput(text);
        setImportError(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImportCourse = async () => {
    if (!jsonInput.trim()) {
      setImportError('Vložte prosím vygenerovaný JSON kód.');
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      const res = await fetch('/api/courses/import-gpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonText: jsonInput }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Chyba při importu kurzu.');
      }

      // Extract raw lessons from jsonInput if possible
      let parsedLessons = [];
      try {
        const parsed = JSON.parse(jsonInput);
        parsedLessons = parsed.lessons || parsed.course?.lessons || [];
      } catch {}

      // Permanently save to client storage vault so it NEVER disappears!
      const fullCourse = data.course || {
        id: data.courseId,
        domain_area: data.domainArea || domainArea,
        target_language: targetLanguage,
        native_language: 'cs',
        cefr_level: cefrLevel,
        status: 'ready',
        total_lessons: data.lessonCount || parsedLessons.length,
        completed_lessons_count: data.lessonCount || parsedLessons.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      saveImportedCourseToStorage({
        ...fullCourse,
        lessons: data.lessons || parsedLessons,
        rawJson: jsonInput,
      });

      markCourseAsOpened(data.courseId, fullCourse);
      setImportSuccess(data.message || 'Kurz byl úspěšně vytvořen a trvale uložen!');
      window.dispatchEvent(new Event('courses-updated'));
      fetchPreparedCourses();

      setTimeout(() => {
        router.push(`/courses/${data.courseId}`);
      }, 800);
    } catch (err: any) {
      setImportError(err.message || 'Nepodařilo se naimportovat kurz.');
      setIsImporting(false);
    }
  };

  const handleDeletePreset = async (courseId: string, domainArea: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!confirm(`Opravdu chcete smazat předpřipravený kurz „${domainArea}“? Všechna data kurzu budou nenávratně odstraněna.`)) {
      return;
    }

    // 1. Mark as deleted in client storage immediately
    markCourseAsDeleted(courseId);
    setPreparedCourses((prev) => prev.filter((c) => c.id !== courseId));
    window.dispatchEvent(new Event('courses-updated'));

    // 2. Delete on server
    try {
      const res = await fetch(`/api/courses/${courseId}`, { method: 'DELETE' });
      if (!res.ok) {
        console.warn('Server delete response note:', res.status);
      }
    } catch (err) {
      console.error('Error deleting preset course on server:', err);
    }
  };

  const handleClosePreset = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const remaining = markCourseAsClosed(courseId);
    setOpenedCourseIds(remaining);
  };

  const handleOpenPreset = (course: any, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    markCourseAsOpened(course.id, course);
    setOpenedCourseIds(getOpenedCourseIds());
    router.push(`/courses/${course.id}`);
  };

  // Sample quick test JSON for instant testing
  const loadSampleJson = () => {
    const sample = {
      course: {
        title: "Stavební inženýrství & Architektura",
        domain_area: "Civil Engineering & Architecture",
        target_language: "en",
        native_language: "cs",
        cefr_level: "B2",
        description: "Profesní terminologie pro stavbyvedoucí, projektanty a statiky."
      },
      lessons: [
        {
          lesson_number: 1,
          title: "Site Survey & Geotechnical Exploration",
          theme_focus: "Průzkum staveniště a geotechnické posouzení",
          article_title: "Foundations and Soil Mechanics on Site",
          article_body: "Before excavating the building pit, the structural team must complete a borehole investigation. Soil bearing capacity determines whether shallow or deep pile foundations will be engineered.",
          listening_script: "Good morning team. We have received the geotechnical soil report for zone B. The groundwater level is higher than expected.",
          items: [
            {
              item_type: "expression",
              target_text: "soil bearing capacity",
              czech_text: "únosnost zeminy",
              context_note: "Schopnost podloží unést zatížení základové konstrukce bez sedání.",
              example_sentence_target: "The engineer verified that the soil bearing capacity meets the structural specification.",
              example_sentence_czech: "Inženýr ověřil, že únosnost zeminy splňuje statické zadání.",
              phonetic_hint: "/sɔɪl ˈbeə.rɪŋ kəˈpæs.ə.ti/"
            },
            {
              item_type: "expression",
              target_text: "borehole sample",
              czech_text: "vzorek z vrtu / jádrový vzorek",
              context_note: "Geotechnický vzorek zeminy odebraný při průzkumném vrtání.",
              example_sentence_target: "Borehole samples revealed a thick layer of dense clay at five meters depth.",
              example_sentence_czech: "Vzorky z vrtu odhalily silnou vrstvu hutného jílu v hloubce pěti metrů.",
              phonetic_hint: "/ˈbɔː.həʊl ˈsɑːm.pəl/"
            },
            {
              item_type: "word",
              target_text: "excavation",
              czech_text: "výkop / výkopové práce",
              context_note: "Odebrání zeminy pro základy nebo suterénní prostory.",
              example_sentence_target: "Excavation for the underground parking lot starts on Monday.",
              example_sentence_czech: "Výkopové práce pro podzemní parkoviště začínají v pondělí.",
              phonetic_hint: "/ˌek.skəˈveɪ.ʃən/"
            },
            {
              item_type: "phrase",
              target_text: "shallow foundations",
              czech_text: "plošné zakládání / plošné základy",
              context_note: "Základové pasy, patky nebo desky přenášející zatížení těsně pod terénem.",
              example_sentence_target: "Due to solid bedrock near the surface, shallow foundations were selected.",
              example_sentence_czech: "Vzhledem k pevné skalní vrstvě blízko povrchu bylo zvoleno plošné zakládání.",
              phonetic_hint: "/ˈʃæl.əʊ faʊnˈdeɪ.ʃənz/"
            }
          ],
          exercises: [
            {
              exercise_type: "choice",
              prompt: "Který výraz označuje schopnost podloží přenést zatížení stavby bez nebezpečného sedání?",
              options: ["soil bearing capacity", "excavation permit", "borehole sample", "tensile strain"],
              canonical_answer: "soil bearing capacity",
              explanation: "Soil bearing capacity vyjadřuje únosnost základové půdy."
            }
          ]
        },
        {
          lesson_number: 2,
          title: "Reinforced Concrete & Structural Framing",
          theme_focus: "Železobetonové konstrukce a statický rám",
          article_title: "Formwork and Curing Time in Modern Construction",
          article_body: "Reinforced concrete combines the high compressive strength of concrete with the tensile strength of steel rebar. Adequate curing time is essential before striking the formwork.",
          listening_script: "Please check the rebar spacing on slab level 3 before the concrete pour scheduled for tomorrow morning.",
          items: [
            {
              item_type: "expression",
              target_text: "reinforced concrete",
              czech_text: "železobeton / vyztužený beton",
              context_note: "Kompozitní stavební materiál z betonu a ocelové výztuže.",
              example_sentence_target: "Reinforced concrete columns support the entire transfer slab.",
              example_sentence_czech: "Železobetonové sloupy nesou celou roznášecí desku.",
              phonetic_hint: "/ˌriː.ɪnˈfɔːst ˈkɒŋ.kriːt/"
            },
            {
              item_type: "word",
              target_text: "rebar",
              czech_text: "stavební výztuž / armovací ocel",
              context_note: "Ocelové pruty vkládané do betonu pro přenos tahových sil.",
              example_sentence_target: "Inspect the rebar placement to confirm proper concrete cover thickness.",
              example_sentence_czech: "Zkontrolujte uložení výztuže pro zajištění správné tloušťky krycí vrstvy.",
              phonetic_hint: "/ˈriː.bɑːr/"
            },
            {
              item_type: "expression",
              target_text: "curing time",
              czech_text: "doba zrání betonu",
              context_note: "Čas potřebný k hydrataci cementu a dosažení projektované pevnosti.",
              example_sentence_target: "Accelerated curing time allows earlier striking of vertical formwork.",
              example_sentence_czech: "Zrychlená doba zrání umožňuje dřívější odbednění svislých konstrukcí.",
              phonetic_hint: "/ˈkjʊə.rɪŋ taɪm/"
            }
          ],
          exercises: [
            {
              exercise_type: "choice",
              prompt: "Jak se v angličtině označuje armovací ocel / výztuž do železobetonu?",
              options: ["rebar", "aggregate", "formwork", "mortar"],
              canonical_answer: "rebar",
              explanation: "Rebar (short for reinforcing bar) je odborný termín pro výztuž."
            }
          ]
        }
      ]
    };

    setJsonInput(JSON.stringify(sample, null, 2));
    setImportError(null);
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 py-2">
        {/* Header */}
        <div>
          <span className="text-[10px] sm:text-xs font-bold text-verba-indigo uppercase tracking-wider">
            Správa kurzů
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-verba-ink tracking-tight mt-0.5">
            Nový odborný kurz
          </h1>
          <p className="text-xs text-verba-slate mt-1">
            Získejte zadání pro ChatGPT / Claude a nahrajte vygenerovaný kurz přímo do aplikace.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-2 select-none overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 py-2.5 px-3.5 border-b-2 font-semibold text-xs transition-colors whitespace-nowrap ${
              activeTab === 'import'
                ? 'border-verba-indigo text-verba-indigo'
                : 'border-transparent text-verba-slate hover:text-verba-ink'
            }`}
          >
            <FileJson className="w-4 h-4" />
            <span>Vložit JSON z GPT</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prompt')}
            className={`flex items-center gap-2 py-2.5 px-3.5 border-b-2 font-semibold text-xs transition-colors whitespace-nowrap ${
              activeTab === 'prompt'
                ? 'border-verba-indigo text-verba-indigo'
                : 'border-transparent text-verba-slate hover:text-verba-ink'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Zadání pro GPT (Prompt)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-2 py-2.5 px-3.5 border-b-2 font-semibold text-xs transition-colors whitespace-nowrap ${
              activeTab === 'presets'
                ? 'border-verba-indigo text-verba-indigo'
                : 'border-transparent text-verba-slate hover:text-verba-ink'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Předpřipravené kurzy</span>
          </button>

          <Link
            href="/courses/my"
            className="flex items-center gap-2 py-2.5 px-3.5 border-b-2 font-semibold text-xs transition-colors whitespace-nowrap border-transparent text-verba-indigo hover:text-verba-indigo-dark bg-indigo-50/40 rounded-t-lg ml-auto"
          >
            <GraduationCap className="w-4 h-4 text-verba-indigo" />
            <span>Mé kurzy ({openedCourseIds.length}) &rarr;</span>
          </Link>
        </div>

        {/* TAB 1: IMPORT FROM GPT JSON */}
        {activeTab === 'import' && (
          <div className="space-y-4">
            <div className="verba-card p-4 sm:p-6 space-y-4">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-verba-ink">
                  Vložení vygenerovaného kurzu z GPT
                </h2>
                <p className="text-xs text-verba-slate leading-relaxed">
                  Vložte JSON vygenerovaný z ChatGPT nebo Claude do pole níže. Aplikace automaticky vytvoří kurz, lekce, slovní zásobu i cvičení.
                </p>
              </div>

              {/* Error / Success feedback */}
              {importError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-verba-error shrink-0 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{importSuccess} Otevírám kurz...</span>
                </div>
              )}

              {/* Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-verba-slate uppercase tracking-wider">
                    JSON kód kurzu:
                  </label>
                  <button
                    type="button"
                    onClick={loadSampleJson}
                    className="text-[11px] font-semibold text-verba-indigo hover:underline"
                  >
                    Vložit ukázkový JSON pro test
                  </button>
                </div>
                <textarea
                  value={jsonInput}
                  onChange={(e) => {
                    setJsonInput(e.target.value);
                    setImportError(null);
                  }}
                  rows={10}
                  placeholder="Vložte sem zkopírovaný JSON objekt z ChatGPT / Claude..."
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/50 font-mono text-xs text-verba-ink focus:outline-hidden focus:border-verba-indigo focus:bg-white transition-all"
                />
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Nahrát .json soubor</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".json,.txt"
                    className="hidden"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleImportCourse}
                  disabled={isImporting || !jsonInput.trim()}
                  className="py-2.5 px-6 rounded-xl bg-verba-indigo hover:bg-verba-indigo-dark text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
                >
                  {isImporting ? (
                    <span>Ukládám kurz...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Vytvořit a otevřít kurz</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Helper */}
            <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-950">
              <HelpCircle className="w-4 h-4 text-verba-indigo shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Nemáte ještě vygenerovaný JSON? </span>
                Přejděte na záložku <strong>„Zadání pro GPT (Prompt)“</strong>, zkopírujte připravené zadání a vložte jej do ChatGPT nebo Claude.
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EXPORT PROMPT & SCHEMA FOR GPT */}
        {activeTab === 'prompt' && (
          <div className="space-y-4">
            <div className="verba-card p-4 sm:p-6 space-y-5">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-verba-ink">
                  Nastavení zadání pro GPT
                </h2>
                <p className="text-xs text-verba-slate">
                  Nakonfigurujte parametry a jedním kliknutím zkopírujte prompt pro ChatGPT / Claude včetně přesného schématu a pedagogických instrukcí.
                </p>
              </div>

              {/* Form parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Target Language */}
                <div>
                  <label className="block text-[11px] font-semibold text-verba-slate uppercase mb-1">
                    Cílový jazyk
                  </label>
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-verba-ink focus:border-verba-indigo"
                  >
                    <option value="en">Angličtina (English)</option>
                    <option value="de">Němčina (Deutsch)</option>
                    <option value="es">Španělština (Español)</option>
                    <option value="fr">Francouzština (Français)</option>
                    <option value="it">Italština (Italiano)</option>
                  </select>
                </div>

                {/* CEFR Level */}
                <div>
                  <label className="block text-[11px] font-semibold text-verba-slate uppercase mb-1">
                    CEFR Úroveň
                  </label>
                  <select
                    value={cefrLevel}
                    onChange={(e) => setCefrLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-verba-ink focus:border-verba-indigo"
                  >
                    <option value="A1">A1 — Úplný začátečník</option>
                    <option value="A2">A2 — Základní znalosti</option>
                    <option value="B1">B1 — Mírně pokročilý</option>
                    <option value="B2">B2 — Středně pokročilý (Doporučeno)</option>
                    <option value="C1">C1 — Pokročilý / Expert</option>
                    <option value="C2">C2 — Rodilý mluvčí</option>
                  </select>
                </div>

                {/* Domain Area */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-verba-slate uppercase mb-1">
                    Profesní obor / Zaměření kurzu
                  </label>
                  <input
                    type="text"
                    value={domainArea}
                    onChange={(e) => setDomainArea(e.target.value)}
                    placeholder="např. Stavebnictví, Právo a smlouvy, Lékařská diagnostika..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-verba-ink focus:border-verba-indigo"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[
                      'Stavebnictví a architektura',
                      'Právo a soudní spory',
                      'Lékařská péče a farmacie',
                      'Finanční audit a controlling',
                      'Logistika a dodavatelský řetězec',
                      'Marketing & Public Relations',
                    ].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setDomainArea(preset)}
                        className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 text-[10px] font-medium text-verba-slate hover:text-verba-indigo transition-colors"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Number of Lessons */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-verba-slate uppercase mb-1">
                    Počet lekcí v zadání
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { count: 5, note: 'Rychlé generování' },
                      { count: 10, note: 'Doporučeno' },
                      { count: 20, note: 'Střední rozsah' },
                      { count: 50, note: 'Plný rozsah' },
                    ].map((opt) => (
                      <button
                        type="button"
                        key={opt.count}
                        onClick={() => setLessonCount(opt.count)}
                        className={`p-2 rounded-xl text-center border transition-all ${
                          lessonCount === opt.count
                            ? 'bg-verba-indigo text-white border-verba-indigo shadow-xs'
                            : 'bg-white text-verba-ink border-slate-200 hover:border-indigo-200'
                        }`}
                      >
                        <div className="text-xs font-bold">{opt.count} lekcí</div>
                        <div className={`text-[9px] mt-0.5 ${lessonCount === opt.count ? 'text-indigo-100' : 'text-verba-slate'}`}>
                          {opt.note}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action buttons: Copy & Download */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-2 active:scale-98 ${
                    isCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-verba-indigo hover:bg-verba-indigo-dark text-white'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Zkopírováno do schránky! ✅</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Kopírovat zadání pro GPT</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPrompt}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Stáhnout jako .txt</span>
                </button>
              </div>

              {/* Prompt Preview */}
              <div>
                <label className="block text-[11px] font-semibold text-verba-slate uppercase mb-1">
                  Náhled zadání a JSON schématu:
                </label>
                <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] max-h-56 overflow-y-auto leading-relaxed select-all whitespace-pre-wrap">
                  {generatedPrompt}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PREPARED COURSES */}
        {activeTab === 'presets' && (
          <div className="space-y-3">
            <div className="verba-card p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h2 className="text-sm font-bold text-verba-ink">
                    Předpřipravené a uložené kurzy ({preparedCourses.length})
                  </h2>
                  <p className="text-xs text-verba-slate mt-0.5">
                    Všechny hotové a naimportované kurzy připravené ke studiu. Každý kurz můžete přímo otevřít nebo trvale smazat.
                  </p>
                </div>
              </div>

              {loadingPresets ? (
                <div className="py-8 text-center text-xs text-verba-slate">
                  Načítání předpřipravených kurzů...
                </div>
              ) : preparedCourses.length === 0 ? (
                <div className="py-8 text-center text-xs text-verba-slate space-y-2">
                  <p>Zatím nemáte žádné předpřipravené kurzy.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('import')}
                    className="text-verba-indigo font-semibold hover:underline"
                  >
                    Vložit kurz z GPT &rarr;
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {preparedCourses.map((c) => {
                    const isOpened = openedCourseIds.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 group relative bg-white ${
                          isOpened ? 'border-indigo-200 bg-indigo-50/15 shadow-2xs' : 'border-slate-200 hover:border-indigo-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="font-bold text-xs text-verba-ink group-hover:text-verba-indigo line-clamp-1">
                              {c.domain_area}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-verba-slate uppercase">
                                {c.target_language} • {c.cefr_level}
                              </span>
                              {isOpened && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  <span>V Mých kurzech</span>
                                </span>
                              )}
                              {c.id.startsWith('crs_gpt_') && (
                                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-purple-100 text-purple-700">
                                  GPT
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-[11px] text-verba-slate">
                            {c.completed_lessons_count} {c.completed_lessons_count === 1 ? 'lekce' : c.completed_lessons_count < 5 ? 'lekce' : 'lekcí'} připraveno ke studiu
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100/80">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isOpened ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => router.push(`/courses/${c.id}`)}
                                  className="text-xs font-semibold text-verba-indigo hover:text-verba-indigo-dark flex items-center gap-1 py-1 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                                >
                                  <span>Přejít do kurzu</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleClosePreset(c.id, e)}
                                  className="text-[11px] font-medium text-slate-500 hover:text-amber-700 hover:bg-amber-50 px-2 py-1 rounded-lg border border-slate-200 hover:border-amber-200 transition-colors flex items-center gap-1"
                                  title={`Zavřít kurz „${c.domain_area}“ (odebere z Mých kurzů, zůstane v tomto katalogu)`}
                                >
                                  <X className="w-3 h-3" />
                                  <span>Zavřít</span>
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => handleOpenPreset(c, e)}
                                className="text-xs font-semibold text-white bg-verba-indigo hover:bg-verba-indigo-dark flex items-center gap-1.5 py-1 px-3 rounded-lg shadow-2xs transition-colors active:scale-98"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Otevřít do Mých kurzů</span>
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleDeletePreset(c.id, c.domain_area, e)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-verba-error hover:bg-rose-50 transition-colors"
                            title={`Trvale smazat kurz ${c.domain_area}`}
                            aria-label={`Trvale smazat kurz ${c.domain_area}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

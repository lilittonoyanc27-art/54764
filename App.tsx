import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Volume2,
  VolumeX,
  HelpCircle,
  PhoneCall,
  Users,
  Trophy,
  RotateCcw,
  Sparkles,
  ChevronRight,
  BookOpen,
  Play,
  CheckCircle2,
  XCircle,
  Flame,
  ArrowRight,
  Eye,
  EyeOff,
  Coins,
  ShieldCheck,
  Search,
  Check,
} from 'lucide-react';
import { QUESTIONS, PRIZE_LADDER, Question } from './questions.ts';
import { sounds } from './audio.ts';

type GameState = 'INTRO' | 'PLAYING' | 'GAME_OVER' | 'VICTORY' | 'DICTIONARY';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('INTRO');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [isLockedIn, setIsLockedIn] = useState<boolean>(false);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Lifelines state
  const [lifeline5050Used, setLifeline5050Used] = useState<boolean>(false);
  const [disabledOptions, setDisabledOptions] = useState<string[]>([]);
  const [lifelineCoachUsed, setLifelineCoachUsed] = useState<boolean>(false);
  const [coachModalOpen, setCoachModalOpen] = useState<boolean>(false);
  const [lifelineCrowdUsed, setLifelineCrowdUsed] = useState<boolean>(false);
  const [crowdModalOpen, setCrowdModalOpen] = useState<boolean>(false);
  const [crowdStats, setCrowdStats] = useState<Record<string, number>>({});

  // Translation display controls:
  // "пусть при клике на исп откроьется перевод на арм"
  // Per-question and per-option revealed state
  const [showQuestionTranslation, setShowQuestionTranslation] = useState<boolean>(false);
  const [revealedOptionTranslations, setRevealedOptionTranslations] = useState<Record<string, boolean>>({});
  const [globalShowTranslation, setGlobalShowTranslation] = useState<boolean>(false);

  // Mobile drawer for ladder
  const [ladderDrawerOpen, setLadderDrawerOpen] = useState<boolean>(false);

  // Dictionary search
  const [dictionarySearch, setDictionarySearch] = useState<string>('');

  const currentQ: Question = QUESTIONS[currentIndex] || QUESTIONS[0];

  // Sync sound manager enabled
  useEffect(() => {
    sounds.enabled = soundEnabled;
  }, [soundEnabled]);

  // Reset translations and option selections on question change
  useEffect(() => {
    setSelectedOption(null);
    setIsLockedIn(false);
    setIsAnswerRevealed(false);
    setDisabledOptions([]);
    setShowQuestionTranslation(globalShowTranslation);
    setRevealedOptionTranslations(
      globalShowTranslation
        ? { A: true, B: true, C: true, D: true }
        : {}
    );
  }, [currentIndex, globalShowTranslation]);

  // Safe milestone calculation
  const guaranteedAmount = useMemo(() => {
    if (currentIndex >= 19 && isAnswerRevealed && selectedOption === currentQ.correct) {
      return 25000000;
    }
    if (currentIndex >= 15) return 1000000;
    if (currentIndex >= 10) return 100000;
    if (currentIndex >= 5) return 5000;
    return 0;
  }, [currentIndex, isAnswerRevealed, selectedOption, currentQ]);

  // Current winnings if player walks away
  const currentSafeWinnings = useMemo(() => {
    if (currentIndex === 0) return 0;
    return PRIZE_LADDER[currentIndex - 1].amount;
  }, [currentIndex]);

  const startNewGame = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsLockedIn(false);
    setIsAnswerRevealed(false);
    setLifeline5050Used(false);
    setLifelineCoachUsed(false);
    setLifelineCrowdUsed(false);
    setDisabledOptions([]);
    setGameState('PLAYING');
    sounds.playLifeline();
  };

  // Lifeline: 50:50
  const use5050 = () => {
    if (lifeline5050Used || isLockedIn) return;
    sounds.playLifeline();
    setLifeline5050Used(true);

    const wrongOptions = currentQ.options
      .map((o) => o.key)
      .filter((k) => k !== currentQ.correct);

    // Shuffle and pick 2 wrong options to disable
    const shuffled = [...wrongOptions].sort(() => 0.5 - Math.random());
    const toDisable = shuffled.slice(0, 2);
    setDisabledOptions(toDisable);

    // If currently selected is disabled, deselect
    if (selectedOption && toDisable.includes(selectedOption)) {
      setSelectedOption(null);
    }
  };

  // Lifeline: Call the Coach
  const useCallCoach = () => {
    if (lifelineCoachUsed || isLockedIn) return;
    sounds.playLifeline();
    setLifelineCoachUsed(true);
    setCoachModalOpen(true);
  };

  // Lifeline: Ask the Crowd
  const useAskCrowd = () => {
    if (lifelineCrowdUsed || isLockedIn) return;
    sounds.playLifeline();
    setLifelineCrowdUsed(true);

    // Generate realistic audience votes favoring correct answer
    const correctKey = currentQ.correct;
    const correctPercentage = Math.floor(Math.random() * 20) + 68; // 68-87%
    const remaining = 100 - correctPercentage;
    const wrongKeys = ['A', 'B', 'C', 'D'].filter((k) => k !== correctKey);

    const r1 = Math.floor(Math.random() * (remaining - 4));
    const r2 = Math.floor(Math.random() * (remaining - r1 - 2));
    const r3 = remaining - r1 - r2;

    const stats: Record<string, number> = {
      [correctKey]: correctPercentage,
      [wrongKeys[0]]: r1,
      [wrongKeys[1]]: r2,
      [wrongKeys[2]]: r3,
    };
    setCrowdStats(stats);
    setCrowdModalOpen(true);
  };

  // Select an option
  const handleSelectOption = (key: 'A' | 'B' | 'C' | 'D') => {
    if (isLockedIn || disabledOptions.includes(key)) return;
    sounds.playClick();
    setSelectedOption(key);
  };

  // Lock in and confirm answer
  const handleConfirmAnswer = () => {
    if (!selectedOption || isLockedIn) return;
    setIsLockedIn(true);
    sounds.playLockIn();

    // Suspense delay
    setTimeout(() => {
      setIsAnswerRevealed(true);
      const isCorrect = selectedOption === currentQ.correct;
      if (isCorrect) {
        sounds.playCorrect();
        if (currentIndex === QUESTIONS.length - 1) {
          // Final 20th question won!
          setTimeout(() => {
            sounds.playVictory();
            confetti({
              particleCount: 150,
              spread: 80,
              origin: { y: 0.6 },
            });
            setGameState('VICTORY');
          }, 1800);
        }
      } else {
        sounds.playWrong();
        setTimeout(() => {
          setGameState('GAME_OVER');
        }, 2200);
      }
    }, 1500);
  };

  // Next Question
  const handleNextQuestion = () => {
    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  // Toggle translation on Spanish text click
  const toggleQuestionTranslation = () => {
    sounds.playClick();
    setShowQuestionTranslation((prev) => !prev);
  };

  const toggleOptionTranslation = (key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    sounds.playClick();
    setRevealedOptionTranslations((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Pronounce Spanish phrase
  const handlePronounce = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    sounds.speakSpanish(text);
  };

  // Filtered dictionary
  const filteredDictionary = useMemo(() => {
    if (!dictionarySearch.trim()) return QUESTIONS;
    const term = dictionarySearch.toLowerCase();
    return QUESTIONS.filter(
      (q) =>
        q.phrase.toLowerCase().includes(term) ||
        q.questionEs.toLowerCase().includes(term) ||
        q.questionHy.toLowerCase().includes(term) ||
        q.explanationHy.toLowerCase().includes(term) ||
        q.explanationEs.toLowerCase().includes(term)
    );
  }, [dictionarySearch]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-900 stadium-bg">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-cyan-900/40 px-3 sm:px-6 py-2.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => {
              sounds.playClick();
              setGameState('INTRO');
            }}
            className="flex items-center gap-2 group text-left"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 flex items-center justify-center text-slate-950 shadow-md group-hover:scale-105 transition-transform font-black text-lg">
              ⚽
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight bg-gradient-to-r from-yellow-300 via-amber-200 to-cyan-200 bg-clip-text text-transparent">
                Ֆուտբոլային Միլիոնատեր
              </h1>
              <p className="text-[10px] sm:text-xs text-cyan-300/80 hidden sm:block">
                Fútbol Millonario • Իսպաներեն & Հայերեն
              </p>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Audio Pronunciation / Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/60 hover:border-amber-400/50 hover:bg-slate-800 text-slate-300 hover:text-amber-300 transition-colors"
            title={soundEnabled ? 'Անջատել ձայնը / Silenciar' : 'Միացնել ձայնը / Activar sonido'}
            aria-label="Sound Toggle"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Dictionary / Study Mode Button */}
          <button
            onClick={() => {
              sounds.playClick();
              setGameState(gameState === 'DICTIONARY' ? 'PLAYING' : 'DICTIONARY');
            }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              gameState === 'DICTIONARY'
                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md'
                : 'bg-slate-900/80 text-cyan-200 border-cyan-800/60 hover:bg-slate-800 hover:border-cyan-500'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Բառարան</span>
            <span className="xs:hidden">Գիրք</span>
          </button>

          {/* Translation Mode Quick Toggle */}
          <button
            onClick={() => {
              sounds.playClick();
              const nextVal = !globalShowTranslation;
              setGlobalShowTranslation(nextVal);
              setShowQuestionTranslation(nextVal);
              setRevealedOptionTranslations(
                nextVal ? { A: true, B: true, C: true, D: true } : {}
              );
            }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              globalShowTranslation
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-md'
                : 'bg-slate-900/80 text-slate-300 border-slate-700/60 hover:border-cyan-400'
            }`}
            title="Միշտ ցուցադրել հայերեն թարգմանությունը / Mostrar siempre traducción"
          >
            {globalShowTranslation ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
            <span className="text-[11px] sm:text-xs">
              {globalShowTranslation ? 'Թարգմանությունը բաց է' : 'Թարգմանել սեղմումով'}
            </span>
          </button>

          {gameState === 'PLAYING' && (
            <button
              onClick={() => setLadderDrawerOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 font-bold text-xs flex items-center gap-1"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>{PRIZE_LADDER[currentIndex]?.label}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col justify-center max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8">
        {/* VIEW 1: INTRO / WELCOME SCREEN */}
        {gameState === 'INTRO' && (
          <div className="max-w-3xl mx-auto w-full my-auto text-center py-6 sm:py-10 px-4">
            <div className="relative inline-block mb-6">
              <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 p-1.5 shadow-2xl millionaire-glow-gold flex items-center justify-center animate-pulse-subtle">
                <div className="w-full h-full bg-slate-950 rounded-full flex flex-col items-center justify-center border-2 border-amber-300/40">
                  <span className="text-4xl sm:text-5xl">⚽</span>
                  <span className="text-[10px] sm:text-xs font-bold text-amber-300 tracking-wider uppercase mt-1">
                    25,000,000 ֏
                  </span>
                </div>
              </div>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-3">
              Ո՞վ է ուզում դառնալ <br />
              <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
                Ֆուտբոլային Միլիոնատեր
              </span>
            </h2>

            <p className="text-sm sm:text-base text-cyan-200/90 max-w-xl mx-auto mb-6 leading-relaxed">
              20 հարց իսպաներեն և հայերեն՝ մարզչի հրահանգներ, ֆուտբոլային տերմիններ և խաղային իրավիճակներ։
              Սովորիր իսպաներեն ֆուտբոլային լեզուն՝ խաղալով հայտնի խաղը։
            </p>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto mb-8 text-left text-xs sm:text-sm">
              <div className="bg-slate-900/70 border border-cyan-800/40 rounded-xl p-3.5 backdrop-blur-sm">
                <div className="flex items-center gap-2 font-bold text-amber-300 mb-1">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span>Ինտերակտիվ թարգմանություն</span>
                </div>
                <p className="text-slate-300 text-xs">
                  Սեղմիր ցանկացած իսպաներեն նախադասության կամ պատասխանի վրա՝ ակնթարթորեն հայերեն թարգմանությունը տեսնելու համար։
                </p>
              </div>

              <div className="bg-slate-900/70 border border-cyan-800/40 rounded-xl p-3.5 backdrop-blur-sm">
                <div className="flex items-center gap-2 font-bold text-amber-300 mb-1">
                  <PhoneCall className="w-4 h-4 text-emerald-400" />
                  <span>3 Կյանք (Հուշումներ)</span>
                </div>
                <p className="text-slate-300 text-xs">
                  50:50, Զանգ մարզչին (Llamar al míster) և Դահլիճի օգնություն՝ բարդ իրավիճակներում ճիշտ որոշում կայացնելու համար։
                </p>
              </div>

              <div className="bg-slate-900/70 border border-cyan-800/40 rounded-xl p-3.5 backdrop-blur-sm">
                <div className="flex items-center gap-2 font-bold text-amber-300 mb-1">
                  <Volume2 className="w-4 h-4 text-yellow-400" />
                  <span>Իսպաներեն արտասանություն</span>
                </div>
                <p className="text-slate-300 text-xs">
                  Լսիր մարզչի հրահանգները մաքուր իսպաներեն հնչողությամբ (Audio Speech Synthesis)։
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={startNewGame}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-slate-950 font-black text-base shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 millionaire-glow-gold"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                <span>Սկսել Խաղը (Jugar)</span>
              </button>

              <button
                onClick={() => {
                  sounds.playClick();
                  setGameState('DICTIONARY');
                }}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900/90 border border-cyan-700/60 hover:border-cyan-400 text-cyan-200 font-bold text-base hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <span>Ուսումնասիրել 20 հարցերը (Բառարան)</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: PLAYING GAME STAGE */}
        {gameState === 'PLAYING' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Main Stage (Questions & Options) */}
            <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-6">
              {/* Question Header Status Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/80 border border-cyan-900/50 rounded-xl px-4 py-2.5 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-xs sm:text-sm">
                    Հարց {currentQ.id} / 20
                  </span>
                  <span className="text-xs text-slate-300 font-medium">
                    Շահում՝ <strong className="text-yellow-300 font-bold">{currentQ.prize}</strong>
                  </span>
                </div>

                {/* Lifelines Controls */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* 50:50 */}
                  <button
                    onClick={use5050}
                    disabled={lifeline5050Used || isLockedIn}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all border ${
                      lifeline5050Used
                        ? 'opacity-30 line-through bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                        : 'bg-indigo-950/80 text-cyan-300 border-cyan-600/60 hover:border-cyan-400 hover:bg-indigo-900 hover:scale-105 active:scale-95 shadow-sm'
                    }`}
                    title="50:50 — Հեռացնել 2 սխալ պատասխան"
                  >
                    50:50
                  </button>

                  {/* Call the coach */}
                  <button
                    onClick={useCallCoach}
                    disabled={lifelineCoachUsed || isLockedIn}
                    className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${
                      lifelineCoachUsed
                        ? 'opacity-30 bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60 hover:border-emerald-400 hover:bg-emerald-900 hover:scale-105 active:scale-95 shadow-sm'
                    }`}
                    title="Զանգ մարզչին (Llamar al míster)"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Մարզիչ</span>
                  </button>

                  {/* Ask crowd */}
                  <button
                    onClick={useAskCrowd}
                    disabled={lifelineCrowdUsed || isLockedIn}
                    className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${
                      lifelineCrowdUsed
                        ? 'opacity-30 bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                        : 'bg-blue-950/80 text-blue-300 border-blue-600/60 hover:border-blue-400 hover:bg-blue-900 hover:scale-105 active:scale-95 shadow-sm'
                    }`}
                    title="Դահլիճի օգնություն (Público)"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Դահլիճ</span>
                  </button>
                </div>
              </div>

              {/* Question Card (Interactive Click on Spanish reveals Armenian) */}
              <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 via-indigo-950/70 to-slate-900 border-2 border-cyan-500/50 p-5 sm:p-7 shadow-2xl millionaire-glow">
                {/* Header ribbon */}
                <div className="flex items-center justify-between mb-3 text-xs text-cyan-300/80">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span>Մարզչի հրահանգ # {currentQ.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handlePronounce(currentQ.phrase, e)}
                      className="px-2 py-1 rounded-md bg-cyan-950/70 border border-cyan-700/60 hover:border-cyan-400 text-cyan-200 text-xs flex items-center gap-1.5 transition-colors"
                      title="Լսել իսպաներեն արտասանությունը / Escuchar pronunciación"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Լսել «{currentQ.phrase}»</span>
                    </button>
                  </div>
                </div>

                {/* Spanish Question (Clickable to reveal Armenian) */}
                <div
                  onClick={toggleQuestionTranslation}
                  className="cursor-pointer group p-3 rounded-xl bg-slate-950/40 hover:bg-slate-950/70 border border-cyan-900/60 hover:border-amber-400/60 transition-all mb-3 text-center"
                  title="Սեղմիր իսպաներենի վրա՝ հայերեն թարգմանությունը տեսնելու համար"
                >
                  <p className="text-lg sm:text-2xl font-bold tracking-tight text-white group-hover:text-amber-200 transition-colors">
                    {currentQ.questionEs}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-amber-400/90 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    <Eye className="w-3 h-3" />
                    <span>
                      {showQuestionTranslation
                        ? 'Սեղմիր՝ հայերենը փակելու համար'
                        : 'Սեղմիր այստեղ՝ հայերեն թարգմանությունը տեսնելու համար 🇦🇲'}
                    </span>
                  </div>
                </div>

                {/* Armenian Question Translation */}
                {showQuestionTranslation && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-base sm:text-lg font-medium text-center animate-in fade-in zoom-in-95 duration-200">
                    <span className="text-xs text-amber-400 font-bold uppercase block mb-0.5">
                      Հայերեն թարգմանություն
                    </span>
                    {currentQ.questionHy}
                  </div>
                )}
              </div>

              {/* 4 Options (A, B, C, D) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {currentQ.options.map((opt) => {
                  const isSelected = selectedOption === opt.key;
                  const isCorrect = opt.key === currentQ.correct;
                  const isDisabled = disabledOptions.includes(opt.key);
                  const showTranslation =
                    revealedOptionTranslations[opt.key] ||
                    globalShowTranslation ||
                    isAnswerRevealed;

                  // Compute dynamic border and background styles
                  let cardStyle =
                    'bg-slate-900/80 border-slate-700/80 text-slate-200 hover:border-cyan-400 hover:bg-slate-850';

                  if (isDisabled) {
                    cardStyle =
                      'opacity-20 pointer-events-none line-through bg-slate-950 border-slate-800 text-slate-600';
                  } else if (isAnswerRevealed) {
                    if (isCorrect) {
                      cardStyle =
                        'bg-emerald-950/90 border-emerald-400 text-emerald-100 millionaire-glow-green scale-[1.02] ring-2 ring-emerald-400';
                    } else if (isSelected) {
                      cardStyle =
                        'bg-rose-950/90 border-rose-500 text-rose-200 millionaire-glow-red animate-shake';
                    }
                  } else if (isSelected) {
                    cardStyle =
                      'bg-amber-950/90 border-amber-400 text-amber-100 millionaire-glow-gold scale-[1.01] ring-2 ring-amber-400';
                  }

                  return (
                    <div
                      key={opt.key}
                      onClick={() => handleSelectOption(opt.key)}
                      className={`relative p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between select-none ${cardStyle}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Option letter badge */}
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 border ${
                            isAnswerRevealed && isCorrect
                              ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                              : isAnswerRevealed && isSelected
                              ? 'bg-rose-500 text-white border-rose-300'
                              : isSelected
                              ? 'bg-amber-400 text-slate-950 border-amber-200'
                              : 'bg-slate-800 text-cyan-300 border-cyan-800/80'
                          }`}
                        >
                          {opt.key}
                        </div>

                        {/* Spanish Text & Pronounce Button */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-sm sm:text-base leading-snug">
                              {opt.es}
                            </span>
                            <button
                              onClick={(e) => handlePronounce(opt.es, e)}
                              className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800/80 transition-colors shrink-0"
                              title="Լսել իսպաներեն արտասանությունը"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Armenian translation toggle button or text */}
                          <div className="mt-2.5 pt-2 border-t border-slate-800/60">
                            {showTranslation ? (
                              <div
                                onClick={(e) => toggleOptionTranslation(opt.key, e)}
                                className="text-xs sm:text-sm text-cyan-300/90 font-medium bg-cyan-950/40 p-2 rounded-lg border border-cyan-900/50 hover:border-cyan-600 transition-colors flex items-center justify-between"
                                title="Սեղմիր՝ հայերենը թաքցնելու համար"
                              >
                                <span>🇦🇲 {opt.hy}</span>
                                <EyeOff className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1.5" />
                              </div>
                            ) : (
                              <button
                                onClick={(e) => toggleOptionTranslation(opt.key, e)}
                                className="text-[11px] text-amber-400/90 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded-md border border-amber-500/20 flex items-center gap-1.5 transition-colors"
                              >
                                <Eye className="w-3 h-3 text-amber-400" />
                                <span>Սեղմիր թարգմանության համար (🇦🇲)</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* State status mark */}
                      {isAnswerRevealed && (
                        <div className="absolute top-2 right-2">
                          {isCorrect ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : isSelected ? (
                            <XCircle className="w-5 h-5 text-rose-400" />
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action Stage / Confirmation Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-900/90 border border-cyan-900/40 rounded-xl">
                <div>
                  {!isLockedIn && selectedOption ? (
                    <div className="text-xs sm:text-sm text-amber-300 font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                      <span>
                        Ընտրվել է տարբերակ <strong>{selectedOption}</strong>։ Հաստատե՞լ վերջնական։
                      </span>
                    </div>
                  ) : isLockedIn && !isAnswerRevealed ? (
                    <div className="text-xs sm:text-sm text-cyan-300 font-semibold flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                      <span>Պատասխանն ընդունված է... Լարվածության պահ...</span>
                    </div>
                  ) : isAnswerRevealed ? (
                    <div className="text-xs sm:text-sm font-semibold">
                      {selectedOption === currentQ.correct ? (
                        <span className="text-emerald-400 flex items-center gap-1.5">
                          <Check className="w-4 h-4" /> Ճիշտ պատասխան! Շնորհավորում ենք։
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1.5">
                          <XCircle className="w-4 h-4" /> Ցավոք, սխալ պատասխան։ Ճիշտ էր{' '}
                          <strong>{currentQ.correct}</strong> տարբերակը։
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs sm:text-sm text-slate-400">
                      Ընտրեք 4 տարբերակներից մեկը (սեղմեք իսպաներենի վրա թարգմանության համար)։
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {!isLockedIn && selectedOption && (
                    <button
                      onClick={handleConfirmAnswer}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm shadow-md hover:scale-105 active:scale-95 transition-all millionaire-glow-gold flex items-center justify-center gap-1.5"
                    >
                      <span>Հաստատել (Confirmar)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  {isAnswerRevealed && selectedOption === currentQ.correct && (
                    <button
                      onClick={handleNextQuestion}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-sm shadow-md hover:scale-105 active:scale-95 transition-all millionaire-glow-green flex items-center justify-center gap-1.5"
                    >
                      <span>
                        {currentIndex < QUESTIONS.length - 1
                          ? `Հաջորդ հարցը (${currentIndex + 2}/20)`
                          : 'Վերջնական Հաղթանակ 🏆'}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Tactical Explanation Card when answer is revealed */}
              {isAnswerRevealed && (
                <div className="p-4 sm:p-5 rounded-xl bg-slate-900/90 border border-emerald-500/40 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Տակտիկական մեկնաբանություն / Explicación táctica
                    </span>
                    <button
                      onClick={() => handlePronounce(currentQ.explanationEs)}
                      className="text-xs text-slate-400 hover:text-amber-300 flex items-center gap-1"
                      title="Լսել բացատրությունը իսպաներեն"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Լսել</span>
                    </button>
                  </div>
                  <p className="text-sm text-slate-200 mb-2 italic">
                    «{currentQ.explanationEs}»
                  </p>
                  <p className="text-sm text-cyan-200 font-medium">
                    🇦🇲 {currentQ.explanationHy}
                  </p>
                </div>
              )}
            </div>

            {/* Desktop Prize Ladder Sidebar */}
            <div className="hidden lg:block lg:col-span-4 bg-slate-900/85 border border-cyan-900/50 rounded-2xl p-4 shadow-xl backdrop-blur-md sticky top-20 max-h-[82vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span className="font-bold text-sm text-amber-200">Մրցանակային սանդուղք</span>
                </div>
                <span className="text-xs text-slate-400">20 մակարդակ</span>
              </div>

              <div className="flex flex-col gap-1">
                {[...PRIZE_LADDER].reverse().map((item) => {
                  const isCurrent = item.level - 1 === currentIndex;
                  const isCompleted = item.level - 1 < currentIndex;
                  const isMilestone = item.isMilestone;

                  let itemStyle = 'text-slate-400 hover:bg-slate-800/40';
                  if (isCurrent) {
                    itemStyle =
                      'bg-gradient-to-r from-amber-500/30 via-yellow-400/20 to-transparent border-l-4 border-amber-400 text-amber-200 font-bold';
                  } else if (isCompleted) {
                    itemStyle = 'text-emerald-400/90 font-medium line-through opacity-70';
                  } else if (isMilestone) {
                    itemStyle = 'text-white font-bold bg-cyan-950/30';
                  }

                  return (
                    <div
                      key={item.level}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors ${itemStyle}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-right font-mono text-[11px] text-slate-400">
                          {item.level}
                        </span>
                        {isMilestone && (
                          <span
                            className="text-amber-400"
                            title="Անվտանգ գումար (Zona segura)"
                          >
                            ★
                          </span>
                        )}
                        <span>{item.label}</span>
                      </div>
                      {isCurrent && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 animate-pulse">
                          Ընթացիկ
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Guaranteed safety note */}
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Անվտանգ գումար՝</span>
                <strong className="text-amber-300 font-bold">
                  {guaranteedAmount > 0 ? `${guaranteedAmount.toLocaleString()} ֏` : '0 ֏'}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: GAME OVER (Lost) */}
        {gameState === 'GAME_OVER' && (
          <div className="max-w-md mx-auto my-auto text-center py-8 px-4 bg-slate-900/90 border border-rose-500/40 rounded-2xl shadow-2xl backdrop-blur-md">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 mx-auto flex items-center justify-center mb-4">
              <XCircle className="w-10 h-10" />
            </div>

            <h3 className="text-2xl font-black text-white mb-2">Խաղն ավարտվեց!</h3>
            <p className="text-sm text-slate-300 mb-4">
              Ձեր պատասխանը ճիշտ չէր։ Բայց դուք արդեն սովորեցիք կարևոր ֆուտբոլային արտահայտություններ։
            </p>

            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 mb-6 text-left text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Հասած մակարդակ՝</span>
                <span className="font-bold text-white">Հարց {currentIndex + 1} / 20</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Անվտանգ շահում՝</span>
                <span className="font-bold text-amber-300">
                  {guaranteedAmount.toLocaleString()} ֏
                </span>
              </div>
              <div className="mt-2 text-slate-300">
                <strong className="text-emerald-400 block mb-1">
                  Ճիշտ պատասխանն էր ({currentQ.correct})՝
                </strong>
                <p className="italic text-slate-200">
                  {currentQ.options.find((o) => o.key === currentQ.correct)?.es}
                </p>
                <p className="text-cyan-300 mt-0.5">
                  🇦🇲 {currentQ.options.find((o) => o.key === currentQ.correct)?.hy}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={startNewGame}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Կրկին փորձել</span>
              </button>

              <button
                onClick={() => setGameState('DICTIONARY')}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-200 font-bold text-sm border border-slate-700 transition-all flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                <span>Բառարան</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 4: VICTORY (Full 20 Questions Won - Grand Champion) */}
        {gameState === 'VICTORY' && (
          <div className="max-w-lg mx-auto my-auto text-center py-10 px-6 bg-slate-900/95 border-2 border-amber-400/80 rounded-3xl shadow-2xl backdrop-blur-md millionaire-glow-gold animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-200 text-slate-950 mx-auto flex items-center justify-center mb-4 shadow-xl">
              <Trophy className="w-14 h-14" />
            </div>

            <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
              Մեծ Հաղթանակ • Campeón Absoluto
            </span>

            <h2 className="text-3xl sm:text-4xl font-black text-white mt-3 mb-1">
              ԴՈՒՔ ՄԻԼԻՈՆԱՏԵՐ ԵՔ!
            </h2>
            <div className="text-2xl sm:text-3xl font-black text-amber-300 mb-4 tracking-tight">
              25,000,000 ֏
            </div>

            <p className="text-sm text-cyan-100 max-w-md mx-auto mb-6 leading-relaxed">
              Շնորհավորում ենք! Դուք հաջողությամբ պատասխանեցիք բոլոր 20 իսպաներեն ֆուտբոլային հարցերին և
              հրահանգներին։ Այժմ դուք տիրապետում եք իսպանական ֆուտբոլի տակտիկական լեզվին։
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={startNewGame}
                className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Խաղալ Նորից</span>
              </button>

              <button
                onClick={() => setGameState('DICTIONARY')}
                className="flex-1 py-3.5 px-6 rounded-xl bg-slate-850 hover:bg-slate-800 text-cyan-200 font-bold text-sm border border-cyan-800/80 transition-all flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span>Վերանայել բոլոր 20 արտահայտությունները</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 5: DICTIONARY / STUDY FLASHCARDS */}
        {gameState === 'DICTIONARY' && (
          <div className="max-w-4xl mx-auto w-full py-4 flex flex-col gap-6">
            {/* Dictionary Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-cyan-900/40 rounded-2xl p-4 sm:p-6 backdrop-blur-md">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-amber-400" />
                  <span>Ֆուտբոլային բառարան & Մարզչի հրահանգներ</span>
                </h2>
                <p className="text-xs sm:text-sm text-cyan-200/80 mt-1">
                  Բոլոր 20 իսպաներեն-հայերեն հարցերը, արտահայտությունները և մեկնաբանությունները
                </p>
              </div>

              <button
                onClick={() => setGameState('PLAYING')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 self-stretch sm:self-auto justify-center"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Վերադառնալ խաղին</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={dictionarySearch}
                onChange={(e) => setDictionarySearch(e.target.value)}
                placeholder="Որոնել արտահայտություն, հրահանգ կամ հայերեն բառ... (Buscar...)"
                className="w-full bg-slate-900/90 border border-cyan-900/60 focus:border-amber-400 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder-slate-400 outline-none transition-all shadow-inner"
              />
            </div>

            {/* List of 20 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDictionary.map((q) => {
                const correctOption = q.options.find((o) => o.key === q.correct);
                return (
                  <div
                    key={q.id}
                    className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/60 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Phrase and audio */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono font-bold text-xs border border-amber-500/30">
                          #{q.id}
                        </span>
                        <button
                          onClick={() => handlePronounce(q.phrase)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 transition-colors flex items-center gap-1 text-xs"
                          title="Լսել իսպաներեն հնչողությունը"
                        >
                          <Volume2 className="w-4 h-4 text-amber-400" />
                          <span className="hidden sm:inline">Լսել</span>
                        </button>
                      </div>

                      {/* Main Phrase Heading */}
                      <h3 className="text-lg font-bold text-white mb-1 group-hover:text-amber-300 transition-colors">
                        {q.phrase}
                      </h3>

                      {/* Spanish & Armenian Question */}
                      <div className="space-y-1 mb-3 text-xs sm:text-sm">
                        <p className="text-slate-300 italic">{q.questionEs}</p>
                        <p className="text-cyan-300 font-medium">{q.questionHy}</p>
                      </div>

                      {/* Correct meaning highlight */}
                      <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 mb-3 text-xs sm:text-sm">
                        <span className="text-[11px] font-bold text-emerald-400 uppercase block mb-0.5">
                          ✅ Ճիշտ իմաստը ({q.correct})՝
                        </span>
                        <p className="text-slate-200 font-semibold">{correctOption?.es}</p>
                        <p className="text-emerald-200 mt-0.5">🇦🇲 {correctOption?.hy}</p>
                      </div>

                      {/* Tactical note */}
                      <div className="text-xs text-slate-400 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80">
                        <strong className="text-amber-400 block mb-0.5">Տակտիկա՝</strong>
                        <p className="mb-1 text-slate-300">{q.explanationEs}</p>
                        <p className="text-cyan-200/90">{q.explanationHy}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredDictionary.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                Արդյունքներ չեն գտնվել «{dictionarySearch}» հարցումով։
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: Call the Coach (Llamar al míster) */}
      {coachModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 font-bold text-xl">
                👔
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Զանգ մարզչին (Llamar al míster)</h3>
                <p className="text-xs text-emerald-400">Գլխավոր մարզչի տակտիկական խորհուրդը</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm mb-5 space-y-2">
              <p className="text-slate-200 italic">
                «¡Hola! Escúchame bien: En esta situación táctica, la respuesta correcta es sin duda la{' '}
                <strong className="text-amber-300 font-bold">[{currentQ.correct}]</strong>. {currentQ.explanationEs}»
              </p>
              <div className="pt-2 border-t border-slate-800 text-cyan-200 text-xs">
                🇦🇲 <strong>Հայերեն թարգմանություն՝</strong> «Բարև! Ուշադիր լսիր. այս տակտիկական
                իրավիճակում ճիշտ տարբերակը միանշանակ <strong className="text-amber-300 font-bold">[{currentQ.correct}]</strong>-ն
                է։ {currentQ.explanationHy}»
              </div>
              <div className="pt-1 text-[11px] text-amber-400 flex items-center justify-between">
                <span>Վստահություն՝</span>
                <span className="font-bold">95% վստահ է</span>
              </div>
            </div>

            <button
              onClick={() => {
                sounds.playClick();
                setCoachModalOpen(false);
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm hover:bg-emerald-400 transition-colors"
            >
              Շնորհակալություն, մարզիչ! (Entendido)
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: Ask the Crowd (Público) */}
      {crowdModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-blue-500/60 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/40">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Դահլիճի օգնություն (Público)</h3>
                <p className="text-xs text-blue-300">Մարզադաշտի երկրպագուների քվեարկությունը</p>
              </div>
            </div>

            <div className="space-y-3 mb-6 bg-slate-950 p-4 rounded-xl border border-slate-800">
              {(['A', 'B', 'C', 'D'] as const).map((key) => {
                const percent = crowdStats[key] || 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-300">Տարբերակ {key}</span>
                      <span className="text-amber-300">{percent}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-700 ${
                          key === currentQ.correct
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : 'bg-slate-600'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                sounds.playClick();
                setCrowdModalOpen(false);
              }}
              className="w-full py-2.5 rounded-xl bg-blue-500 text-slate-950 font-bold text-sm hover:bg-blue-400 transition-colors"
            >
              Փակել արդյունքները (Cerrar)
            </button>
          </div>
        </div>
      )}

      {/* MOBILE DRAWER: Prize Ladder */}
      {ladderDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm lg:hidden flex justify-end">
          <div className="bg-slate-900 w-72 h-full p-4 flex flex-col justify-between border-l border-cyan-800 shadow-2xl animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <span className="font-bold text-sm text-amber-300 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" /> Մրցանակներ
                </span>
                <button
                  onClick={() => setLadderDrawerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1 overflow-y-auto max-h-[72vh]">
                {[...PRIZE_LADDER].reverse().map((item) => {
                  const isCurrent = item.level - 1 === currentIndex;
                  const isCompleted = item.level - 1 < currentIndex;
                  const isMilestone = item.isMilestone;

                  return (
                    <div
                      key={item.level}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs ${
                        isCurrent
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : isCompleted
                          ? 'text-emerald-400 line-through opacity-70'
                          : isMilestone
                          ? 'text-white font-bold bg-cyan-950/40'
                          : 'text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 font-mono">{item.level}</span>
                        {isMilestone && <span className="text-amber-400">★</span>}
                        <span>{item.label}</span>
                      </div>
                      {isCurrent && <span className="text-[10px] uppercase font-bold">Խաղում ես</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 flex justify-between">
              <span>Անվտանգ գումար՝</span>
              <strong className="text-amber-300">{guaranteedAmount.toLocaleString()} ֏</strong>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/80 px-4 py-3 text-center text-[11px] text-slate-500">
        ⚽ Fútbol Millonario • 20 ֆուտբոլային հարց իսպաներեն և հայերեն • Սեղմեք իսպաներեն տեքստին՝ թարգմանությունը տեսնելու համար
      </footer>
    </div>
  );
}

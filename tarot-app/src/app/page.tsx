/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SPREAD_CATEGORIES } from "../data/spreads";
import { TAROT_THEMES } from "../data/themes";
import { CARD_BACK_IMAGE, KKRT_DECK } from "../data/kkrtDeck";
import { drawSpread, SpreadCard } from "../lib/tarot";

type ReadingPayload = {
  headline: string;
  overview: string;
  cardInsights: { card: string; position: string; insight: string }[];
  integration: string;
  affirmation: string;
};

const SHUFFLE_DURATION = 1400;

export default function HomePage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    SPREAD_CATEGORIES[0]?.id ?? "",
  );
  const [selectedThemeId, setSelectedThemeId] = useState(
    TAROT_THEMES[0]?.id ?? "",
  );
  const [spread, setSpread] = useState<SpreadCard[]>([]);
  const [reading, setReading] = useState<ReadingPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingReading, setLoadingReading] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [isRevealPending, setIsRevealPending] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const selectedCategory = useMemo(
    () =>
      SPREAD_CATEGORIES.find((category) => category.id === selectedCategoryId) ??
      SPREAD_CATEGORIES[0],
    [selectedCategoryId],
  );

  const activeTheme = useMemo(
    () =>
      TAROT_THEMES.find((theme) => theme.id === selectedThemeId) ??
      TAROT_THEMES[0],
    [selectedThemeId],
  );

  const speakReading = useCallback(
    (payload: ReadingPayload) => {
      if (typeof window === "undefined") return;
      if (!voiceEnabled) return;
      if (!("speechSynthesis" in window)) return;
      const scene = [
        payload.headline,
        payload.overview,
        ...payload.cardInsights.map(
          (item) => `${item.position} - ${item.card}: ${item.insight}`,
        ),
        payload.integration,
        `Affirmation: ${payload.affirmation}`,
      ].join(". ");

      const utterance = new SpeechSynthesisUtterance(scene);
      utterance.rate = 1.04;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((voice) =>
          voice.name.toLowerCase().includes("female") ||
          voice.name.toLowerCase().includes("samantha"),
        ) ?? voices[0];
      if (preferred) {
        utterance.voice = preferred;
      }
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    [voiceEnabled],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!voiceEnabled) {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
    }
  }, [voiceEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const preload = () => synth.getVoices();
    preload();
    synth.addEventListener("voiceschanged", preload);
    return () => {
      synth.removeEventListener("voiceschanged", preload);
    };
  }, []);

  useEffect(() => {
    if (!reading) return;
    speakReading(reading);
  }, [reading, speakReading]);

  const fetchReading = useCallback(
    async (cards: SpreadCard[]) => {
      setLoadingReading(true);
      setError(null);
      try {
        const response = await fetch("/api/reading", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId: selectedCategory.id,
            spread: cards.map(({ card, position, isReversed }) => ({
              name: card.name,
              position,
              isReversed,
              keywords: card.keywords,
              upright: card.upright,
              reversed: card.reversed,
            })),
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? "Unable to retrieve reading.");
        }

        const payload = (await response.json()) as ReadingPayload;
        setReading(payload);
      } catch (caught) {
        const issue =
          caught instanceof Error
            ? caught.message
            : "Something disrupted the reading.";
        setError(issue);
        setReading(null);
      } finally {
        setLoadingReading(false);
      }
    },
    [selectedCategory.id],
  );

  const handleRevealSpread = useCallback(() => {
    if (isShuffling || isRevealPending) return;
    const newSpread = drawSpread(selectedCategory, KKRT_DECK);
    setError(null);
    setReading(null);
    setSpread([]);
    setIsShuffling(true);
    setIsRevealPending(true);
    setTimeout(() => {
      setSpread(newSpread);
      setIsShuffling(false);
      setIsRevealPending(false);
      fetchReading(newSpread);
    }, SHUFFLE_DURATION);
  }, [fetchReading, isRevealPending, isShuffling, selectedCategory]);

  const handleReplayVoice = useCallback(() => {
    if (reading) {
      speakReading(reading);
    }
  }, [reading, speakReading]);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${activeTheme.gradient} opacity-90`}
      />
      <div
        className="absolute inset-0 opacity-70 mix-blend-screen"
        style={{ backgroundImage: activeTheme.bgPattern }}
      />
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 pb-16 pt-12 text-slate-100 sm:px-10">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm uppercase tracking-[0.35em] text-slate-200/70">
              KKRT TAROT WEAVER
            </span>
            <h1 className="text-balance text-4xl font-semibold leading-tight md:text-5xl">
              Shuffle luminous spreads. Receive a voice of insight. Embody the
              archetypes calling your name.
            </h1>
          </div>
          <p className="max-w-2xl text-pretty text-base text-slate-200/80 md:text-lg">
            Choose a spread focus, watch the deck swirl into formation, and hear
            an AI-guided narration from the Keeper of the KKRT tarot.
          </p>
        </header>

        <section className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/30 backdrop-blur-lg md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="flex-1 space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                {TAROT_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelectedThemeId(theme.id)}
                    className={`rounded-full border border-white/20 px-4 py-1.5 text-sm font-medium transition ${
                      theme.id === activeTheme.id
                        ? "bg-white/30 text-slate-900 shadow-lg shadow-white/30"
                        : "bg-white/5 text-white hover:bg-white/20 hover:text-slate-900"
                    }`}
                  >
                    {theme.name}
                  </button>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {SPREAD_CATEGORIES.map((category) => {
                  const active = category.id === selectedCategory.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/20 p-5 text-left transition hover:border-white/30 hover:bg-slate-800/30 ${
                        active ? "ring-2 ring-white/40 shadow-xl shadow-white/20" : ""
                      }`}
                      onClick={() => setSelectedCategoryId(category.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-lg font-semibold text-white">
                          {category.label}
                        </h2>
                        <span className="text-xs uppercase tracking-wide text-white/60">
                          {category.positions.length} cards
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-200/80">
                        {category.description}
                      </p>
                      <div className="mt-4">
                        <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
                          Positions
                        </span>
                        <p className="mt-1 text-sm text-white/70">
                          {category.positions.join(" • ")}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex w-full flex-col gap-4 rounded-3xl border border-white/15 bg-slate-950/40 p-5 shadow-inner shadow-black/50 md:max-w-xs">
              <div>
                <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Voiceover
                </span>
                <div className="mt-3 flex items-center justify-between rounded-full bg-white/10 p-1">
                  <button
                    type="button"
                    onClick={() => setVoiceEnabled(true)}
                    className={`flex-1 rounded-full px-4 py-1 text-sm font-semibold transition ${
                      voiceEnabled
                        ? "bg-white text-slate-900 shadow"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    On
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoiceEnabled(false)}
                    className={`flex-1 rounded-full px-4 py-1 text-sm font-semibold transition ${
                      !voiceEnabled
                        ? "bg-white text-slate-900 shadow"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    Off
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={handleReplayVoice}
                disabled={!reading || !voiceEnabled}
                className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/50"
              >
                Replay narration
              </button>
              <button
                type="button"
                onClick={handleRevealSpread}
                disabled={isRevealPending || isShuffling}
                className="group flex items-center justify-center gap-2 rounded-2xl bg-white py-3 text-base font-semibold text-slate-900 shadow-lg shadow-white/30 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isShuffling ? (
                  <>
                    <motion.span
                      className="h-2 w-2 rounded-full bg-slate-900"
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
                    />
                    <span>Shuffling</span>
                  </>
                ) : (
                  "Reveal spread"
                )}
              </button>
              {error && (
                <div className="rounded-2xl border border-rose-300/40 bg-rose-300/20 px-4 py-3 text-sm text-rose-50">
                  {error}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/30 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl md:p-8">
            <div className="pointer-events-none absolute inset-x-10 top-0 h-40 bg-gradient-to-b from-white/20 via-white/10 to-transparent blur-3xl" />
            <div className="relative flex flex-col gap-6">
              <header className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold text-white">
                  {selectedCategory.label} Spread
                </h3>
                <p className="text-sm text-white/70">
                  Watch the Keeper lay down the cards drawn from the KKRT deck.
                </p>
              </header>

              <div className="relative min-h-[280px] overflow-hidden rounded-2xl border border-white/5 bg-black/30 p-4">
                <AnimatePresence mode="wait">
                  {isShuffling ? (
                    <motion.div
                      key="shuffle"
                      className="flex h-full items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="relative h-44 w-32">
                        {[...Array(4)].map((_, index) => (
                          <motion.div
                            key={index}
                            className="absolute inset-0 rounded-3xl border border-white/20 bg-slate-800/80 shadow-lg shadow-black/70"
                            style={{ rotate: (index - 1.5) * 8 }}
                            animate={{
                              y: [-6, 6, -6],
                              opacity: [0.3, 0.7, 0.3],
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 1.3 + index * 0.1,
                              ease: "easeInOut",
                              delay: index * 0.12,
                            }}
                          />
                        ))}
                        <motion.div
                          className="absolute inset-0 rounded-3xl border border-white/10 bg-white/10 backdrop-blur"
                          animate={{ rotate: [0, 6, -6, 0] }}
                          transition={{ repeat: Infinity, duration: 1.8 }}
                        />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.ul
                      key="spread"
                      className="grid gap-3 md:grid-cols-5"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 16 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    >
                      {spread.map((item, index) => (
                        <motion.li
                          key={`${item.card.id}-${index}`}
                          className="relative flex flex-col items-center gap-3 rounded-2xl bg-white/5 p-3 text-center"
                          initial={{ opacity: 0, y: 30, rotate: -8 }}
                          animate={{ opacity: 1, y: 0, rotate: 0 }}
                          transition={{ delay: index * 0.08, type: "spring", stiffness: 220, damping: 18 }}
                        >
                          <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-lg shadow-black/60">
                            <motion.div
                              className="absolute inset-0"
                              initial={{ rotateY: 180 }}
                              animate={{ rotateY: 0 }}
                              transition={{ duration: 0.6, delay: 0.1 + index * 0.05 }}
                              style={{ transformStyle: "preserve-3d" }}
                            >
                              <div className="absolute inset-0 flex h-full flex-col justify-between rounded-2xl p-4">
                                <span className="text-xs uppercase tracking-[0.2em] text-white/50">
                                  {item.card.arcana.toUpperCase()}
                                </span>
                                <div>
                                  <p className="text-sm font-semibold text-white">
                                    {item.card.name}
                                  </p>
                                  <p className="mt-1 text-[11px] text-white/70">
                                    {item.isReversed ? "Reversed" : "Upright"}
                                  </p>
                                </div>
                              </div>
                              <div
                                className="absolute inset-0 rounded-2xl opacity-30 mix-blend-screen"
                                style={{
                                  backgroundImage:
                                    "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.6), transparent 60%)",
                                }}
                              />
                            </motion.div>
                            <div
                              className="absolute inset-0 origin-center rounded-2xl"
                              style={{
                                transform: `rotate(${item.isReversed ? 180 : 0}deg)`,
                              }}
                            >
                              <img
                                alt="Tarot card back"
                                src={CARD_BACK_IMAGE}
                                className="absolute inset-0 h-full w-full rounded-2xl object-cover opacity-15"
                                data-card-back
                              />
                            </div>
                          </div>
                          <div className="text-xs uppercase tracking-wide text-white/60">
                            {item.position}
                          </div>
                        </motion.li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/50 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl md:p-8">
            <header className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold text-white">
                Keeper&apos;s Narrative
              </h3>
              <p className="text-sm text-white/70">
                Text and voiceover summoned through the GPT keeper aligned to the
                KKRT deck.
              </p>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto pr-1">
              {loadingReading && (
                <div className="flex items-center gap-3 text-sm text-white/70">
                  <motion.span
                    className="h-2 w-2 rounded-full bg-white"
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ repeat: Infinity, duration: 0.9 }}
                  />
                  Weaving your message...
                </div>
              )}
              {!loadingReading && reading && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xl font-semibold text-white">
                      {reading.headline}
                    </h4>
                    <p className="mt-2 text-sm text-white/75">
                      {reading.overview}
                    </p>
                  </div>
                  <div className="space-y-4">
                    {reading.cardInsights.map((insight) => (
                      <div
                        key={`${insight.position}-${insight.card}`}
                        className="rounded-2xl border border-white/5 bg-white/5 p-4"
                      >
                        <p className="text-xs uppercase tracking-[0.25em] text-white/50">
                          {insight.position}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {insight.card}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-white/80">
                          {insight.insight}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
                    <h5 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">
                      Integration
                    </h5>
                    <p className="mt-2 text-sm leading-relaxed text-white/80">
                      {reading.integration}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/20 p-5 text-slate-900 shadow-inner">
                    <h5 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-700">
                      Affirmation
                    </h5>
                    <p className="mt-2 text-base font-semibold text-slate-900">
                      {reading.affirmation}
                    </p>
                  </div>
                </div>
              )}
              {!loadingReading && !reading && !error && (
                <p className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/60">
                  Choose a spread and press &ldquo;Reveal spread&rdquo; to receive
                  your bespoke KKRT reading.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

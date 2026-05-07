import React, { useState, useMemo } from 'react';
import { Account, JournalEntry, Entity } from '../types';
import { GoogleGenAI, Type } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Play, ChevronLeft, ChevronRight, Presentation, Download } from 'lucide-react';

interface SlideGeneratorProps {
  accounts: Account[];
  entries: JournalEntry[];
  entity: Entity;
}

interface Slide {
  title: string;
  content: string[];
  speakerNotes?: string;
  keyMetric?: {
    label: string;
    value: string;
  };
}

export const SlideGenerator: React.FC<SlideGeneratorProps> = ({ accounts, entries, entity }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const tbData = useMemo(() => {
    const balances: Record<string, { debit: number; credit: number }> = {};
    accounts.forEach(acc => {
      balances[acc.id] = { debit: 0, credit: 0 };
    });
    entries.forEach(entry => {
      entry.lines.forEach(line => {
        if (balances[line.accountId]) {
          balances[line.accountId].debit += Number(line.debit) || 0;
          balances[line.accountId].credit += Number(line.credit) || 0;
        }
      });
    });
    return accounts.map(acc => {
      const { debit, credit } = balances[acc.id];
      let balance = 0;
      if (['Asset', 'Expense'].includes(acc.type)) {
        balance = debit - credit;
      } else {
        balance = credit - debit;
      }
      return { account: acc, debit, credit, balance };
    }).filter(row => row.debit !== 0 || row.credit !== 0);
  }, [entries]);

  const generateSlides = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      // @ts-ignore
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const financialSummary = tbData.map(row => 
        `${row.account.code} - ${row.account.name} (${row.account.type}): $${row.balance.toFixed(2)}`
      ).join('\n');

      const prompt = `
        You are an expert financial analyst. Generate a professional presentation summarizing the financial state of the entity.
        Entity Name: ${entity.name}
        Entity Type: ${entity.type}
        Registration: ${entity.registrationNumber || 'N/A'}
        Address: ${entity.businessAddress || 'N/A'}
        Contact: ${entity.contactPerson || 'N/A'}

        Here is the trial balance data:
        ${financialSummary}

        Create a 5-7 slide presentation covering:
        1. Title Slide
        2. Executive Summary
        3. Revenue & Profitability
        4. Asset & Liability Overview
        5. Key Takeaways / Recommendations

        For each slide, provide a title, 3-5 bullet points of content, speaker notes, and optionally a key metric to highlight.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                speakerNotes: { type: Type.STRING },
                keyMetric: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    value: { type: Type.STRING }
                  }
                }
              },
              required: ["title", "content"]
            }
          }
        }
      });

      const generatedSlides = JSON.parse(response.text || '[]');
      setSlides(generatedSlides);
      setCurrentSlideIndex(0);
    } catch (err: any) {
      console.error('Failed to generate slides:', err);
      setError(err.message || 'Failed to generate presentation');
    } finally {
      setIsGenerating(false);
    }
  };

  const nextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  if (slides.length === 0) {
    return (
      <div className="bg-white p-8 border border-[var(--line-strong)] shadow-sm text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Presentation className="text-blue-600" size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">NotebookLM Slide Generator</h2>
        <p className="text-gray-500 max-w-md mx-auto mb-8">
          Transform your trial balance and financial data into a professional, ready-to-present slide deck using AI.
        </p>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6 max-w-md mx-auto text-sm">
            {error}
          </div>
        )}

        <button
          onClick={generateSlides}
          disabled={isGenerating || tbData.length === 0}
          className="bg-[var(--ink)] text-white px-6 py-3 rounded-md font-medium flex items-center gap-2 mx-auto hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Generating Presentation...
            </>
          ) : (
            <>
              <Play size={20} />
              Generate Slides
            </>
          )}
        </button>

        {tbData.length === 0 && (
          <p className="text-xs text-gray-400 mt-4">
            Add journal entries to generate a presentation.
          </p>
        )}
      </div>
    );
  }

  const currentSlide = slides[currentSlideIndex];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Presentation className="text-blue-600" />
          Financial Presentation
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setSlides([])}
            className="px-4 py-2 text-sm font-medium border border-[var(--line-strong)] hover:bg-gray-50 rounded-md"
          >
            Discard
          </button>
          <button className="px-4 py-2 text-sm font-medium bg-[var(--ink)] text-white flex items-center gap-2 rounded-md hover:opacity-90">
            <Download size={16} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Slide Viewer */}
      <div className="bg-gray-100 p-4 md:p-8 rounded-xl border border-[var(--line-strong)] flex flex-col items-center">
        <div className="w-full max-w-4xl aspect-[16/9] bg-white shadow-lg border border-gray-200 flex flex-col relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlideIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 p-10 md:p-16 flex flex-col"
            >
              <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-8 font-serif">
                {currentSlide.title}
              </h1>
              
              <div className="flex-1 flex flex-col md:flex-row gap-8">
                <div className="flex-1">
                  <ul className="space-y-4 md:space-y-6">
                    {currentSlide.content.map((point, i) => (
                      <li key={i} className="flex items-start gap-3 text-lg md:text-xl text-gray-700">
                        <span className="w-2 h-2 mt-2.5 rounded-full bg-blue-600 shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {currentSlide.keyMetric && currentSlide.keyMetric.value && (
                  <div className="w-full md:w-1/3 flex flex-col justify-center items-center bg-gray-50 p-8 rounded-2xl border border-gray-100">
                    <span className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-2 text-center">
                      {currentSlide.keyMetric.label}
                    </span>
                    <span className="text-4xl md:text-5xl font-bold text-blue-600 data-value text-center">
                      {currentSlide.keyMetric.value}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-8 flex justify-between items-center text-sm text-gray-400 font-medium tracking-wider uppercase">
                <span>{entity.name}</span>
                <span>{currentSlideIndex + 1} / {slides.length}</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6 mt-6">
          <button
            onClick={prevSlide}
            disabled={currentSlideIndex === 0}
            className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlideIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentSlideIndex ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          <button
            onClick={nextSlide}
            disabled={currentSlideIndex === slides.length - 1}
            className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {/* Speaker Notes */}
      {currentSlide.speakerNotes && (
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
          <h3 className="text-sm font-bold uppercase tracking-wider text-yellow-800 mb-2">Speaker Notes</h3>
          <p className="text-yellow-900 leading-relaxed">
            {currentSlide.speakerNotes}
          </p>
        </div>
      )}
    </div>
  );
};

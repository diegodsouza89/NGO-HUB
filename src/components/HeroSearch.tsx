import React from 'react';
import { Sparkles } from 'lucide-react';
import { Article, Category, Language } from '../types';

interface HeroSearchProps {
  currentLanguage: Language;
  articles: Article[];
  categories: Category[];
  onSelectArticle: (article: Article) => void;
  onSelectCategory: (category: Category) => void;
  tagline: string;
  selectedResourceType: string;
  onSelectResourceType: (type: string) => void;
}

export const HeroSearch: React.FC<HeroSearchProps> = ({
  tagline,
}) => {
  return (
    <div className="relative bg-gradient-to-b from-sky-50 via-blue-50/50 to-slate-50 text-slate-900 py-12 sm:py-16 px-4 sm:px-6 border-b border-slate-200 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-sky-200/50 blur-3xl pointer-events-none rounded-full"></div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 bg-sky-100/80 border border-sky-300 text-sky-950 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide mb-5 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-sky-700 animate-pulse" />
          <span>Central Knowledge, Tools & Compliance Portal for Non-Profits</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-3 leading-tight">
          NGO Knowledge Hub
        </h1>
        <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto mb-6 font-normal leading-relaxed">
          {tagline}
        </p>
      </div>
    </div>
  );
};

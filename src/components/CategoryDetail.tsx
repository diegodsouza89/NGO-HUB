import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Search, 
  FileText, 
  Eye, 
  Clock, 
  ChevronRight,
  BookOpen,
  Download
} from 'lucide-react';
import { Article, Category, Language } from '../types';

interface CategoryDetailProps {
  category: Category;
  articles: Article[];
  currentLanguage: Language;
  onSelectArticle: (article: Article) => void;
  onBackToHome: () => void;
}

export const CategoryDetail: React.FC<CategoryDetailProps> = ({
  category,
  articles,
  currentLanguage,
  onSelectArticle,
  onBackToHome,
}) => {
  const [catSearch, setCatSearch] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'articles'>('overview');

  const catName = category.names[currentLanguage] || category.names.en;
  const catDesc = category.descriptions[currentLanguage] || category.descriptions.en;

  const publishedArticles = articles.filter(a => a.categoryId === category.id && a.published);

  const filteredArticles = catSearch.trim()
    ? publishedArticles.filter(a => {
        const q = catSearch.toLowerCase();
        const titleEn = (a.titles.en || '').toLowerCase();
        const titleLang = (a.titles[currentLanguage] || '').toLowerCase();
        const bodyEn = (a.bodies.en || '').toLowerCase();
        const tags = (a.tags || []).join(' ').toLowerCase();
        return titleEn.includes(q) || titleLang.includes(q) || bodyEn.includes(q) || tags.includes(q);
      })
    : publishedArticles;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb & Back */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-6">
        <button 
          onClick={onBackToHome}
          className="hover:text-sky-800 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Knowledge Hub Home</span>
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-sky-900 font-bold">{catName}</span>
      </div>

      {/* Category Banner */}
      <div className="bg-gradient-to-r from-sky-50 via-blue-50/60 to-sky-100/50 border border-sky-200/80 text-slate-900 rounded-3xl p-6 sm:p-10 mb-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-sky-100/90 text-sky-950 px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-sky-200">
              <BookOpen className="w-3.5 h-3.5 text-sky-700" />
              <span>{publishedArticles.length} Knowledge Resources</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mb-3 leading-tight">
              {catName}
            </h1>
            <p className="text-slate-600 text-sm sm:text-base max-w-2xl leading-relaxed">
              {catDesc}
            </p>
          </div>

        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6 bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeSubTab === 'overview'
              ? 'bg-white text-sky-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveSubTab('articles')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeSubTab === 'articles'
              ? 'bg-white text-sky-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Knowledge Articles
        </button>
      </div>

      {activeSubTab === 'overview' ? (
        <div className="mb-6 bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-700 mb-3">
            <BookOpen className="w-4 h-4" />
            <span>{catName}</span>
          </div>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-4">
            {catDesc}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-sky-50 border border-sky-100 rounded-xl p-3">
              <div className="text-sky-900 font-bold">{publishedArticles.length}</div>
              <div className="text-slate-600">Resources</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
              <div className="text-emerald-900 font-bold">{filteredArticles.filter(a => a.fileType).length}</div>
              <div className="text-slate-600">Downloads</div>
            </div>
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
              <div className="text-violet-900 font-bold">{publishedArticles.reduce((sum, article) => sum + (article.views || 0), 0)}</div>
              <div className="text-slate-600">Views</div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Filter / Search within Category */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={catSearch}
            onChange={(e) => setCatSearch(e.target.value)}
            placeholder={`Filter ${catName}...`}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500 font-medium"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing {filteredArticles.length} of {publishedArticles.length} resources
        </div>
      </div>

      {/* Articles List */}
      {activeSubTab === 'articles' && (
        filteredArticles.length > 0 ? (
          <div className="space-y-4">
            {filteredArticles.map(article => {
            const title = article.titles[currentLanguage] || article.titles.en || "Untitled";
            const body = article.bodies[currentLanguage] || article.bodies.en || "";
            const snippet = body.replace(/[#*`]/g, '').slice(0, 160);

            return (
              <div
                key={article.id}
                onClick={() => onSelectArticle(article)}
                className="group bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-sky-500 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-100 text-sky-900">
                        {article.resourceType ? article.resourceType.replace('_', ' ') : 'Resource'}
                      </span>
                      {article.fileType && (
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                          <Download className="w-3 h-3 text-slate-400" /> {article.fileType}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectArticle(article);
                      }}
                      className="text-left text-base font-bold text-slate-900 group-hover:text-sky-900 transition-colors mb-1 underline decoration-sky-200 underline-offset-4 hover:text-sky-800 cursor-pointer"
                    >
                      {title}
                    </button>
                    <p className="text-slate-600 text-xs leading-relaxed line-clamp-2 mb-3">
                      {snippet}...
                    </p>

                    {article.tags && article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {article.tags.map((tag, idx) => (
                          <span 
                            key={idx}
                            className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-medium"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 shrink-0 text-xs text-slate-500 gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      {article.views || 0}
                    </span>
                    <span className="flex items-center gap-1 text-sky-700 font-medium">
                      <Download className="w-3.5 h-3.5 text-sky-600" />
                      {article.downloadsCount || 0}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectArticle(article);
                    }}
                    className="inline-flex items-center gap-1 text-sky-700 font-semibold hover:text-sky-800 cursor-pointer underline decoration-sky-200 underline-offset-4"
                  >
                    <span>Open Resource</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-slate-600 font-medium mb-4">
              No resources found matching "{catSearch}".
            </p>
            <button
              onClick={() => setCatSearch('')}
              className="text-xs text-emerald-800 font-bold underline cursor-pointer"
            >
              Clear Filter
            </button>
          </div>
        )
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  Award,
  ShieldCheck,
  Users,
  FileBarChart,
  FolderArchive,
  Laptop,
  Database,
  Smartphone,
  Lock,
  Sparkles,
  HelpCircle,
  ArrowRight,
  BookOpen,
  Layers
} from 'lucide-react';
import { Article, Category, Language } from '../types';

interface CategoryListProps {
  categories: Category[];
  articles: Article[];
  currentLanguage: Language;
  onSelectCategory: (category: Category) => void;
  onSelectArticle: (article: Article) => void;
  selectedResourceType: string;
}

export const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  articles,
  currentLanguage,
  onSelectCategory,
  onSelectArticle,
  selectedResourceType,
}) => {
  const [activeDomainFilter, setActiveDomainFilter] = useState<'all' | 'compliance' | 'tech'>('all');
  const [activeSubTab, setActiveSubTab] = useState<'knowledge-hub' | 'articles'>('knowledge-hub');
  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Award':
        return <Award className="w-6 h-6 text-amber-600" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-6 h-6 text-sky-600" />;
      case 'Users':
        return <Users className="w-6 h-6 text-blue-600" />;
      case 'FileBarChart':
        return <FileBarChart className="w-6 h-6 text-indigo-600" />;
      case 'FolderArchive':
        return <FolderArchive className="w-6 h-6 text-cyan-600" />;
      case 'Laptop':
        return <Laptop className="w-6 h-6 text-purple-600" />;
      case 'Database':
        return <Database className="w-6 h-6 text-teal-600" />;
      case 'Smartphone':
        return <Smartphone className="w-6 h-6 text-emerald-600" />;
      case 'Lock':
        return <Lock className="w-6 h-6 text-rose-600" />;
      case 'Sparkles':
        return <Sparkles className="w-6 h-6 text-amber-500" />;
      default:
        return <HelpCircle className="w-6 h-6 text-sky-600" />;
    }
  };

  const isTechCategory = (catId: string) => {
    return ['cat-tech-grants', 'cat-crm-fundraising', 'cat-field-tech', 'cat-cybersecurity', 'cat-ai-tech'].includes(catId);
  };

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  const filteredCategories = sortedCategories.filter(cat => {
    if (activeDomainFilter === 'tech') return isTechCategory(cat.id);
    if (activeDomainFilter === 'compliance') return !isTechCategory(cat.id);
    return true;
  });

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col xl:flex-row gap-6 xl:items-start">
        <div className="xl:flex-1">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-slate-200 gap-4">
            <div>
              <span className="text-xs font-bold text-sky-700 uppercase tracking-widest block mb-1">
                NGO Knowledge Domains
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Resource, Compliance & Tech Categories
              </h2>
            </div>
            <p className="text-slate-500 text-sm max-w-md">
              Explore statutory compliance, grant writing toolkits, M&E frameworks, and technology tools built specifically for non-profits.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-6 bg-slate-100 p-1.5 rounded-2xl w-fit">
            <button
              onClick={() => setActiveSubTab('knowledge-hub')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeSubTab === 'knowledge-hub'
                  ? 'bg-white text-sky-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Knowledge Library
            </button>
            <button
              onClick={() => setActiveSubTab('articles')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeSubTab === 'articles'
                  ? 'bg-white text-sky-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Articles
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-8 bg-slate-100 p-1.5 rounded-2xl w-fit">
            <button
              onClick={() => setActiveDomainFilter('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeDomainFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4 text-sky-600" />
              <span>All Categories ({categories.length})</span>
            </button>

            <button
              onClick={() => setActiveDomainFilter('compliance')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeDomainFilter === 'compliance'
                  ? 'bg-white text-sky-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-sky-600" />
              <span>Resource & Compliance ({categories.filter(c => !isTechCategory(c.id)).length})</span>
            </button>

            <button
              onClick={() => setActiveDomainFilter('tech')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeDomainFilter === 'tech'
                  ? 'bg-white text-purple-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Laptop className="w-4 h-4 text-purple-600" />
              <span>NGO Tech Stack & Automation ({categories.filter(c => isTechCategory(c.id)).length})</span>
            </button>
          </div>

          {activeSubTab === 'knowledge-hub' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCategories.map(cat => {
                let catArticles = articles.filter(a => a.categoryId === cat.id && a.published);
                if (selectedResourceType && selectedResourceType !== 'all') {
                  catArticles = catArticles.filter(a => a.resourceType === selectedResourceType);
                }

                const name = cat.names[currentLanguage] || cat.names.en || "Category";
                const description = cat.descriptions[currentLanguage] || cat.descriptions.en || "";
                const isTech = isTechCategory(cat.id);

                return (
                  <div
                    key={cat.id}
                    onClick={() => onSelectCategory(cat)}
                    className="group bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:border-sky-500 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${isTech ? 'from-purple-500 to-indigo-600' : 'from-sky-500 to-blue-600'} opacity-0 group-hover:opacity-100 transition-opacity`}></div>

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-sky-50 flex items-center justify-center transition-colors">
                          {getCategoryIcon(cat.icon)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            isTech ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-sky-50 text-sky-700 border border-sky-200'
                          }`}>
                            {isTech ? 'NGO Tech Tool' : 'Compliance & Resource'}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 group-hover:bg-sky-100 group-hover:text-sky-950 transition-colors">
                            <BookOpen className="w-3 h-3 text-sky-700" />
                            {catArticles.length}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-sky-900 transition-colors mb-2">
                        {name}
                      </h3>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6 line-clamp-2">
                        {description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-sky-700 group-hover:text-sky-800">
                      <span>Browse {name}</span>
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {articles
                .filter(article => article.published)
                .slice(0, 8)
                .map(article => {
                  const title = article.titles[currentLanguage] || article.titles.en || 'Untitled article';
                  const body = article.bodies[currentLanguage] || article.bodies.en || '';
                  const snippet = body.replace(/[#*`]/g, '').slice(0, 160);
                  const category = categories.find(cat => cat.id === article.categoryId);

                  return (
                    <div
                      key={article.id}
                      className="group bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-sky-500 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-900 px-2 py-0.5 rounded">
                            {article.resourceType ? article.resourceType.replace('_', ' ') : 'Resource'}
                          </span>
                          {category && (
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {category.names[currentLanguage] || category.names.en}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">{article.updatedAt || 'Recently updated'}</span>
                      </div>

                      <div
                        onClick={() => {
                          const categoryMatch = categories.find(cat => cat.id === article.categoryId);
                          if (categoryMatch) {
                            onSelectCategory(categoryMatch);
                          }
                        }}
                        className="cursor-pointer"
                      >
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-sky-900 transition-colors mb-2 underline decoration-sky-200 underline-offset-4 hover:text-sky-800">
                          {title}
                        </h3>
                        <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">
                          {snippet}{snippet ? '...' : ''}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => onSelectArticle(article)}
                          className="inline-flex items-center gap-2 text-xs font-semibold text-sky-700 hover:text-sky-800 cursor-pointer underline decoration-sky-200 underline-offset-4"
                        >
                          <span>Open Article</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

      </div>

    </section>
  );
};

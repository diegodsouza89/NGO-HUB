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
  Compass,
  Receipt,
  PhoneCall,
  Cloud,
  Palette,
  Megaphone,
  Globe,
  Code2,
  BrainCircuit,
  BadgeCheck,
  HeartHandshake,
  BarChart3,
  Server,
  Wrench,
  Bot
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
      // Icons the tech categories use. Without these the card falls back to a
      // question mark, which is what several categories were showing.
      case 'Compass':
        return <Compass className="w-6 h-6 text-sky-600" />;
      case 'BadgeCheck':
        return <BadgeCheck className="w-6 h-6 text-emerald-600" />;
      case 'Receipt':
        return <Receipt className="w-6 h-6 text-blue-600" />;
      case 'HeartHandshake':
        return <HeartHandshake className="w-6 h-6 text-rose-600" />;
      case 'PhoneCall':
        return <PhoneCall className="w-6 h-6 text-teal-600" />;
      case 'Megaphone':
        return <Megaphone className="w-6 h-6 text-orange-600" />;
      case 'Cloud':
        return <Cloud className="w-6 h-6 text-sky-500" />;
      case 'Server':
        return <Server className="w-6 h-6 text-slate-600" />;
      case 'Palette':
        return <Palette className="w-6 h-6 text-fuchsia-600" />;
      case 'Globe':
        return <Globe className="w-6 h-6 text-indigo-600" />;
      case 'Code2':
        return <Code2 className="w-6 h-6 text-violet-600" />;
      case 'Wrench':
        return <Wrench className="w-6 h-6 text-amber-700" />;
      case 'BrainCircuit':
        return <BrainCircuit className="w-6 h-6 text-purple-600" />;
      case 'Bot':
        return <Bot className="w-6 h-6 text-purple-500" />;
      case 'BarChart3':
        return <BarChart3 className="w-6 h-6 text-indigo-600" />;
      default:
        return <HelpCircle className="w-6 h-6 text-sky-600" />;
    }
  };

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col xl:flex-row gap-6 xl:items-start">
        <div className="xl:flex-1">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-slate-200 gap-4">
            <div>
              <span className="text-xs font-bold text-sky-700 uppercase tracking-widest block mb-1">
                NGO Technology Domains
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                NGO Technology Categories
              </h2>
            </div>
            <p className="text-slate-500 text-sm max-w-md">
              Explore the software, cloud services and digital tools that non-profits can get free or heavily discounted — with the eligibility steps for each.
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

          {activeSubTab === 'knowledge-hub' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedCategories.map(cat => {
                let catArticles = articles.filter(a => a.categoryId === cat.id && a.published);
                if (selectedResourceType && selectedResourceType !== 'all') {
                  catArticles = catArticles.filter(a => a.resourceType === selectedResourceType);
                }

                const name = cat.names[currentLanguage] || cat.names.en || "Category";
                const description = cat.descriptions[currentLanguage] || cat.descriptions.en || "";

                return (
                  <div
                    key={cat.id}
                    onClick={() => onSelectCategory(cat)}
                    className="group bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:border-sky-500 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-sky-50 flex items-center justify-center transition-colors">
                          {getCategoryIcon(cat.icon)}
                        </div>
                        <div className="flex items-center gap-1.5">
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

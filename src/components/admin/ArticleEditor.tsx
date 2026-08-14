import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Check, 
  Sparkles, 
  Eye, 
  Globe, 
  Search,
  ArrowLeft
} from 'lucide-react';
import { Article, Category, Language, SUPPORTED_LANGUAGES } from '../../types';
import { saveArticles } from '../../lib/storage';

interface ArticleEditorProps {
  articles: Article[];
  categories: Category[];
  editingArticle: Article | null;
  onArticlesUpdated: (articles: Article[]) => void;
  onCloseEditor: () => void;
  onCreateNew: () => void;
}

export const ArticleEditor: React.FC<ArticleEditorProps> = ({
  articles,
  categories,
  editingArticle,
  onArticlesUpdated,
  onCloseEditor,
  onCreateNew,
}) => {
  const [activeArticle, setActiveArticle] = useState<Article | null>(editingArticle);
  const [activeLangTab, setActiveLangTab] = useState<Language>('en');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationMessage, setTranslationMessage] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Open editor for a specific article
  const handleStartEdit = (article: Article) => {
    setActiveArticle(JSON.parse(JSON.stringify(article)));
    setActiveLangTab('en');
    setIsPreviewMode(false);
  };

  // Open editor for brand new article
  const handleStartNew = () => {
    const newArt: Article = {
      id: `art-${Date.now().toString().slice(-5)}`,
      slug: `article-${Date.now().toString().slice(-4)}`,
      categoryId: categories[0]?.id || 'cat-1',
      published: true,
      resourceType: 'toolkit',
      sector: 'General NGO',
      downloadsCount: 0,
      bookmarkCount: 0,
      views: 0,
      helpfulYes: 0,
      helpfulNo: 0,
      updatedAt: new Date().toISOString().split('T')[0],
      tags: ['ngo-resource'],
      titles: { en: '' },
      bodies: { en: '' },
    };
    setActiveArticle(newArt);
    setActiveLangTab('en');
    setIsPreviewMode(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this article?')) {
      const updated = articles.filter(a => a.id !== id);
      saveArticles(updated);
      onArticlesUpdated(updated);
      if (activeArticle?.id === id) {
        setActiveArticle(null);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeArticle || !activeArticle.titles.en) {
      alert('English title is required');
      return;
    }

    const exists = articles.some(a => a.id === activeArticle.id);
    let updated: Article[];
    if (exists) {
      updated = articles.map(a => (a.id === activeArticle.id ? activeArticle : a));
    } else {
      updated = [activeArticle, ...articles];
    }

    saveArticles(updated);
    onArticlesUpdated(updated);
    setActiveArticle(null);
    onCloseEditor();
  };

  // AI Auto-Translate Feature
  const handleAiTranslate = async () => {
    if (!activeArticle || !activeArticle.titles.en || !activeArticle.bodies.en) {
      alert('Please fill in the English Title and Body first before auto-translating.');
      return;
    }

    if (activeLangTab === 'en') {
      alert('Target language must be a non-English language tab.');
      return;
    }

    setIsTranslating(true);
    setTranslationMessage(`Asking Gemini AI to translate article into ${SUPPORTED_LANGUAGES.find(l => l.code === activeLangTab)?.name}...`);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activeArticle.titles.en,
          body: activeArticle.bodies.en,
          targetLanguage: activeLangTab,
        }),
      });

      const data = await response.json();
      if (data.translatedTitle && data.translatedBody) {
        setActiveArticle(prev => {
          if (!prev) return null;
          return {
            ...prev,
            titles: { ...prev.titles, [activeLangTab]: data.translatedTitle },
            bodies: { ...prev.bodies, [activeLangTab]: data.translatedBody },
          };
        });
        setTranslationMessage(`Successfully translated into ${SUPPORTED_LANGUAGES.find(l => l.code === activeLangTab)?.name}!`);
      } else {
        alert(data.error || 'Translation failed.');
      }
    } catch (err: any) {
      console.error('Translation error:', err);
      alert('Failed to translate via AI server.');
    } finally {
      setIsTranslating(false);
      setTimeout(() => setTranslationMessage(null), 3000);
    }
  };

  const filteredArticles = searchFilter.trim()
    ? articles.filter(a => {
        const q = searchFilter.toLowerCase();
        const title = (a.titles.en || a.titles.hi || '').toLowerCase();
        return title.includes(q) || a.tags.join(' ').toLowerCase().includes(q);
      })
    : articles;

  return (
    <div className="space-y-6">
      {/* Editor Form Modal or Full View */}
      {activeArticle ? (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-xl p-6 sm:p-8 space-y-6">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-stone-200 pb-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveArticle(null)}
                className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-stone-900 font-serif">
                  {articles.some(a => a.id === activeArticle.id) ? 'Edit Help Center Article' : 'New Article'}
                </h2>
                <p className="text-stone-500 text-xs">
                  Write content in English and manage multi-language translations.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>{isPreviewMode ? 'Edit Mode' : 'Markdown Preview'}</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-medium px-5 py-2 rounded-xl text-xs shadow-md transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Article</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Category, Status, Tags Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Category *
                </label>
                <select
                  value={activeArticle.categoryId}
                  onChange={(e) => setActiveArticle({ ...activeArticle, categoryId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl font-medium bg-white"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.names.en}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Publication Status
                </label>
                <select
                  value={activeArticle.published ? 'true' : 'false'}
                  onChange={(e) => setActiveArticle({ ...activeArticle, published: e.target.value === 'true' })}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl font-medium bg-white"
                >
                  <option value="true">Published (Visible to Visitors)</option>
                  <option value="false">Draft (Hidden)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Search Tags (Comma-separated)
                </label>
                <input
                  type="text"
                  value={(activeArticle.tags || []).join(', ')}
                  onChange={(e) => setActiveArticle({ ...activeArticle, tags: e.target.value.split(',').map(t => t.trim()) })}
                  placeholder="80G, tax, receipt"
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl font-medium bg-white"
                />
              </div>
            </div>

            {/* Language Editor Tabs */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-b border-stone-200 pb-2">
                <div className="flex gap-1 overflow-x-auto">
                  {SUPPORTED_LANGUAGES.map(lang => {
                    const hasTranslation = Boolean(activeArticle.titles[lang.code] && activeArticle.bodies[lang.code]);
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setActiveLangTab(lang.code)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                          activeLangTab === lang.code
                            ? 'bg-emerald-800 text-white'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.nativeName}</span>
                        {hasTranslation && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* AI Auto-Translate Button */}
                {activeLangTab !== 'en' && (
                  <button
                    type="button"
                    onClick={handleAiTranslate}
                    disabled={isTranslating}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white hover:from-emerald-900 hover:to-teal-900 text-xs font-medium px-3.5 py-1.5 rounded-lg shadow-xs cursor-pointer transition-all shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isTranslating ? 'Translating...' : `Auto-Translate to ${SUPPORTED_LANGUAGES.find(l => l.code === activeLangTab)?.name} with AI`}</span>
                  </button>
                )}
              </div>

              {translationMessage && (
                <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs p-2.5 rounded-xl mb-3 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{translationMessage}</span>
                </div>
              )}

              {/* Title & Body Inputs */}
              {!isPreviewMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Article Title in {SUPPORTED_LANGUAGES.find(l => l.code === activeLangTab)?.name} ({activeLangTab.toUpperCase()})
                    </label>
                    <input
                      type="text"
                      required={activeLangTab === 'en'}
                      value={activeArticle.titles[activeLangTab] || ''}
                      onChange={(e) => {
                        const titles = { ...activeArticle.titles, [activeLangTab]: e.target.value };
                        setActiveArticle({ ...activeArticle, titles });
                      }}
                      placeholder={`Enter article title in ${SUPPORTED_LANGUAGES.find(l => l.code === activeLangTab)?.name}`}
                      className="w-full px-4 py-2.5 text-sm border border-stone-200 rounded-xl font-bold text-stone-900 focus:outline-hidden focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Article Content (Markdown supported) in {SUPPORTED_LANGUAGES.find(l => l.code === activeLangTab)?.name}
                    </label>
                    <textarea
                      rows={12}
                      value={activeArticle.bodies[activeLangTab] || ''}
                      onChange={(e) => {
                        const bodies = { ...activeArticle.bodies, [activeLangTab]: e.target.value };
                        setActiveArticle({ ...activeArticle, bodies });
                      }}
                      placeholder={`### Section Heading\n\nWrite article content here using markdown (lists, bold text, bullet points)...`}
                      className="w-full p-4 text-sm font-mono border border-stone-200 rounded-xl focus:outline-hidden focus:border-emerald-600 leading-relaxed"
                    />
                  </div>
                </div>
              ) : (
                /* Live Preview Mode */
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6">
                  <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
                    Preview ({activeLangTab.toUpperCase()})
                  </div>
                  <h1 className="text-2xl font-bold text-stone-900 font-serif mb-4">
                    {activeArticle.titles[activeLangTab] || "Untitled Preview"}
                  </h1>
                  <div className="text-stone-800 text-sm whitespace-pre-line leading-relaxed font-sans">
                    {activeArticle.bodies[activeLangTab] || "No content entered for this language."}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      ) : (
        /* Articles List Table View */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200/80 shadow-2xs">
            <div>
              <h1 className="text-2xl font-bold text-stone-900 font-serif flex items-center gap-2">
                <FileText className="w-6 h-6 text-emerald-800" />
                Articles Directory ({articles.length})
              </h1>
              <p className="text-stone-500 text-xs mt-1">
                Create, edit, and translate help center articles.
              </p>
            </div>

            <button
              onClick={handleStartNew}
              className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white font-medium px-4 py-2.5 rounded-xl text-xs shadow-md transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Article</span>
            </button>
          </div>

          {/* Search Filter */}
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search articles by title or tag..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-stone-200 rounded-xl font-medium"
          />
        </div>

          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                    <th className="p-4">Status</th>
                    <th className="p-4">Title (English)</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-center">Views</th>
                    <th className="p-4 text-center">Translations</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {filteredArticles.map((art) => {
                    const cat = categories.find(c => c.id === art.categoryId);
                    const title = art.titles.en || art.titles.hi || "Untitled";
                    const translatedLangs = Object.keys(art.titles).filter(k => Boolean(art.titles[k as Language]));

                    return (
                      <tr key={art.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="p-4">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            art.published ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                          }`}>
                            {art.published ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-stone-900 max-w-xs truncate">
                          {title}
                        </td>
                        <td className="p-4 text-xs text-stone-600">
                          {cat ? cat.names.en : 'General'}
                        </td>
                        <td className="p-4 text-center font-mono text-xs font-bold text-stone-800">
                          {art.views || 0}
                        </td>
                        <td className="p-4 text-center text-xs">
                          <span className="font-semibold text-stone-600">
                            {translatedLangs.length} / 8 langs
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => handleStartEdit(art)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(art.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
   );
};

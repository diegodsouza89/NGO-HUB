import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Eye, 
  Clock, 
  ThumbsUp, 
  ThumbsDown, 
  Share2, 
  Check, 
  ChevronRight,
  BookOpen,
  Calendar,
  AlertCircle,
  Download,
  Bookmark,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { Article, Category, Language, SUPPORTED_LANGUAGES, User as UserType } from '../types';
import { 
  incrementArticleView, 
  voteArticleHelpful, 
  incrementResourceDownload, 
  toggleBookmarkResource, 
  getCurrentUser 
} from '../lib/storage';

interface ArticleViewProps {
  article: Article;
  category?: Category;
  relatedArticles: Article[];
  currentLanguage: Language;
  currentUser: UserType | null;
  onBackToHome: () => void;
  onSelectCategory?: (category: Category) => void;
  onSelectArticle: (article: Article) => void;
  onOpenUserAuth: () => void;
}

export const ArticleView: React.FC<ArticleViewProps> = ({
  article,
  category,
  relatedArticles,
  currentLanguage,
  currentUser,
  onBackToHome,
  onSelectCategory,
  onSelectArticle,
  onOpenUserAuth,
}) => {
  const [copied, setCopied] = useState(false);
  const [voted, setVoted] = useState<'yes' | 'no' | null>(null);
  const [helpfulCounts, setHelpfulCounts] = useState({
    yes: article.helpfulYes || 0,
    no: article.helpfulNo || 0,
  });
  const [downloadCount, setDownloadCount] = useState(article.downloadsCount || 0);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    incrementArticleView(article.id, currentLanguage);
  }, [article.id, currentLanguage]);

  useEffect(() => {
    const user = getCurrentUser();
    if (user && user.savedResourceIds?.includes(article.id)) {
      setIsBookmarked(true);
    } else {
      setIsBookmarked(false);
    }
  }, [article.id, currentUser]);

  const isLanguageAvailable = Boolean(article.titles[currentLanguage] && article.bodies[currentLanguage]);
  const title = article.titles[currentLanguage] || article.titles.en || "Untitled Article";
  const body = article.bodies[currentLanguage] || article.bodies.en || "";

  const activeLangInfo = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  const wordCount = body.trim().split(/\s+/).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 180));

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleVote = (helpful: boolean) => {
    if (voted) return;
    const res = voteArticleHelpful(article.id, helpful);
    setHelpfulCounts(res);
    setVoted(helpful ? 'yes' : 'no');
  };

  const handleDownload = () => {
    incrementResourceDownload(article.id);
    setDownloadCount(prev => prev + 1);

    // Trigger fake downloadable file blob if downloadUrl not present
    const content = `# ${title}\n\nDownloaded from NGO Knowledge Hub\n\n${body}`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${article.slug || 'ngo_resource'}_Toolkit.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBookmarkToggle = () => {
    const user = getCurrentUser();
    if (!user) {
      onOpenUserAuth();
      return;
    }
    const updatedBookmarks = toggleBookmarkResource(article.id);
    setIsBookmarked(updatedBookmarks.includes(article.id));
  };

  const renderMarkdownContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-xl font-bold text-slate-900 mt-6 mb-3 border-b border-slate-100 pb-2">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-2xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-200 pb-2">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-3xl font-bold text-slate-900 mt-8 mb-4">{line.replace('# ', '')}</h1>;
      }
      if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ') || line.startsWith('4. ')) {
        const itemText = line.replace(/^\d+\.\s*/, '');
        return (
          <div key={idx} className="flex items-start gap-2 text-slate-700 my-1.5 pl-2">
            <span className="font-bold text-sky-800 text-sm mt-0.5">•</span>
            <span className="text-sm sm:text-base leading-relaxed">{formatInlineMarkdown(itemText)}</span>
          </div>
        );
      }
      if (line.startsWith('- ')) {
        return (
          <div key={idx} className="flex items-start gap-2 text-slate-700 my-1.5 pl-2">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-700 mt-2 shrink-0"></span>
            <span className="text-sm sm:text-base leading-relaxed">{formatInlineMarkdown(line.replace('- ', ''))}</span>
          </div>
        );
      }
      if (line.startsWith('---')) {
        return <hr key={idx} className="my-6 border-slate-200" />;
      }
      if (!line.trim()) {
        return <div key={idx} className="h-2"></div>;
      }
      return (
        <p key={idx} className="text-slate-700 text-sm sm:text-base leading-relaxed mb-3">
          {formatInlineMarkdown(line)}
        </p>
      );
    });
  };

  const formatInlineMarkdown = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Navigation Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 mb-6">
        <button 
          onClick={onBackToHome}
          className="hover:text-sky-800 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Knowledge Hub</span>
        </button>
        {category && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <button 
              onClick={() => onSelectCategory && onSelectCategory(category)}
              className="hover:text-sky-800 cursor-pointer transition-colors"
            >
              {category.names[currentLanguage] || category.names.en}
            </button>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-sky-900 font-bold truncate max-w-xs">{title}</span>
      </nav>

      {/* Language Warning Banner */}
      {!isLanguageAvailable && currentLanguage !== 'en' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 mb-6 flex items-start gap-3 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">
              Translation Pending for {activeLangInfo.nativeName} ({activeLangInfo.name})
            </p>
            <p className="text-amber-700 mt-0.5">
              This resource is currently displayed in English.
            </p>
          </div>
        </div>
      )}

      {/* Resource Header */}
      <header className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-xs mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-sky-100 text-sky-900 border border-sky-200">
            {article.resourceType ? article.resourceType.replace('_', ' ') : 'Article'}
          </span>

          {article.sector && (
            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-500" /> {article.sector}
            </span>
          )}

          {category && (
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-sky-700" />
              {category.names[currentLanguage] || category.names.en}
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 leading-tight mb-4">
          {title}
        </h1>

        {/* Action & Download Banner */}
        <div className="my-6 p-4 bg-sky-50/80 border border-sky-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-sky-950 uppercase tracking-wider">
              <Download className="w-4 h-4 text-sky-700" />
              <span>Downloadable Resource Package</span>
            </div>
            <p className="text-xs text-sky-800 mt-0.5">
              {article.fileType || 'PDF & Excel Templates'} • {article.fileSize || 'Standard NGO Format'} • {downloadCount} total downloads
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleDownload}
              className="flex-1 sm:flex-initial py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-sky-200" />
              Download Toolkit ({downloadCount})
            </button>

            <button
              onClick={handleBookmarkToggle}
              className={`py-2.5 px-3.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 border ${
                isBookmarked
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-600 text-amber-600' : ''}`} />
              <span>{isBookmarked ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4 text-sky-700" />
              <strong>{(article.views || 0) + 1}</strong> views
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-slate-400" />
              ~{readingTime} min read
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-slate-400" />
              Updated {article.updatedAt || 'Recently'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-sky-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Share'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-xs mb-8">
        <div className="prose max-w-none">
          {renderMarkdownContent(body)}
        </div>

        {/* Helpful Voting Box */}
        <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/80 p-6 rounded-2xl border-slate-200">
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-1">
              Was this knowledge resource helpful for your NGO?
            </h4>
            <p className="text-slate-500 text-xs">
              Your feedback helps us keep these technology guides accurate and useful.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleVote(true)}
              disabled={voted !== null}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                voted === 'yes'
                  ? 'bg-sky-700 text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:border-sky-500 hover:bg-sky-50'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span>Yes ({helpfulCounts.yes})</span>
            </button>

            <button
              onClick={() => handleVote(false)}
              disabled={voted !== null}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                voted === 'no'
                  ? 'bg-rose-700 text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:border-rose-500 hover:bg-rose-50'
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
              <span>No ({helpfulCounts.no})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Related Resources Section */}
      {relatedArticles.length > 0 && (
        <section className="mt-10">
          <h3 className="text-xl font-bold text-slate-900 mb-4">
            Related Resources in this Knowledge Topic
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {relatedArticles.map(rel => {
              const relTitle = rel.titles[currentLanguage] || rel.titles.en || "Untitled";
              return (
                <div
                  key={rel.id}
                  onClick={() => onSelectArticle(rel)}
                  className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-sky-500 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-900 bg-sky-50 px-2 py-0.5 rounded">
                      {rel.resourceType ? rel.resourceType.replace('_', ' ') : 'Resource'}
                    </span>
                    <h4 className="font-semibold text-slate-900 text-sm group-hover:text-sky-900 transition-colors line-clamp-1 mt-1">
                      {relTitle}
                    </h4>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-700 group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </article>
  );
};

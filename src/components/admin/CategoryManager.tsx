import React, { useState } from 'react';
import { 
  FolderTree, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Check, 
  ArrowUp, 
  ArrowDown 
} from 'lucide-react';
import { Category, Language, SUPPORTED_LANGUAGES } from '../../types';
import { saveCategories } from '../../lib/storage';

interface CategoryManagerProps {
  categories: Category[];
  onCategoriesUpdated: (categories: Category[]) => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  onCategoriesUpdated,
}) => {
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeLangTab, setActiveLangTab] = useState<Language>('en');

  const ICON_OPTIONS = ['Compass', 'Award', 'Receipt', 'Users', 'FileBarChart', 'PhoneCall'];

  const handleOpenAdd = () => {
    setEditingCategory({
      id: `cat-${Date.now().toString().slice(-4)}`,
      slug: `category-${Date.now().toString().slice(-4)}`,
      icon: 'Compass',
      order: categories.length + 1,
      names: {
        en: '',
        hi: '',
        mr: '',
        ta: '',
        te: '',
        bn: '',
        gu: '',
        kn: '',
      },
      descriptions: {
        en: '',
        hi: '',
        mr: '',
        ta: '',
        te: '',
        bn: '',
        gu: '',
        kn: '',
      },
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(JSON.parse(JSON.stringify(cat)));
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this category? Articles under it will remain unassigned.')) {
      const updated = categories.filter(c => c.id !== id);
      saveCategories(updated);
      onCategoriesUpdated(updated);
    }
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.names?.en) return;

    const fullCat = editingCategory as Category;
    const exists = categories.some(c => c.id === fullCat.id);

    let updatedList: Category[];
    if (exists) {
      updatedList = categories.map(c => (c.id === fullCat.id ? fullCat : c));
    } else {
      updatedList = [...categories, fullCat];
    }

    saveCategories(updatedList);
    onCategoriesUpdated(updatedList);
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200/80 shadow-2xs">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-serif flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-emerald-800" />
            Category Management
          </h1>
          <p className="text-stone-500 text-xs mt-1">
            Organize Help Center topics and multi-language titles for easy browsing.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white font-medium px-4 py-2.5 rounded-xl text-xs shadow-md transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Category</span>
        </button>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                <th className="p-4 w-16 text-center">Order</th>
                <th className="p-4">Icon & Slug</th>
                <th className="p-4">Category Name (EN)</th>
                <th className="p-4">Hindi Name (HI)</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-stone-50/80 transition-colors">
                  <td className="p-4 text-center font-bold text-stone-700">
                    {cat.order}
                  </td>
                  <td className="p-4 font-mono text-xs text-stone-600">
                    <span className="font-sans bg-stone-100 px-2 py-1 rounded text-stone-800 font-semibold mr-2">
                      {cat.icon}
                    </span>
                    {cat.slug}
                  </td>
                  <td className="p-4 font-bold text-stone-900">
                    {cat.names.en || "Untitled"}
                  </td>
                  <td className="p-4 text-stone-700 font-medium">
                    {cat.names.hi || <span className="text-stone-300 italic">Not set</span>}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Add / Edit Category */}
      {isModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-2xl overflow-hidden">
            <div className="bg-stone-900 text-white p-6 flex items-center justify-between">
              <h3 className="font-bold text-lg font-serif">
                {categories.some(c => c.id === editingCategory.id) ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Icon
                  </label>
                  <select
                    value={editingCategory.icon || 'Compass'}
                    onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl font-medium bg-white"
                  >
                    {ICON_OPTIONS.map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Slug
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCategory.slug || ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editingCategory.order || 1}
                    onChange={(e) => setEditingCategory({ ...editingCategory, order: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              {/* Language Tabs for Multi-Language Category Names */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-stone-700 mb-2">
                  Category Translations
                </label>

                <div className="flex gap-1 overflow-x-auto pb-2 border-b border-stone-200">
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setActiveLangTab(lang.code)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap transition-colors ${
                        activeLangTab === lang.code
                          ? 'bg-emerald-800 text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {lang.flag} {lang.nativeName}
                    </button>
                  ))}
                </div>

                <div className="pt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1">
                      Category Name ({SUPPORTED_LANGUAGES.find(l => l.code === activeLangTab)?.name})
                    </label>
                    <input
                      type="text"
                      required={activeLangTab === 'en'}
                      value={editingCategory.names?.[activeLangTab] || ''}
                      onChange={(e) => {
                        const names = { ...editingCategory.names, [activeLangTab]: e.target.value };
                        setEditingCategory({ ...editingCategory, names: names as any });
                      }}
                      placeholder={`Category name in ${activeLangTab}`}
                      className="w-full px-3.5 py-2 text-sm border border-stone-200 rounded-xl font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Short Description ({SUPPORTED_LANGUAGES.find(l => l.code === activeLangTab)?.name})
                    </label>
                    <textarea
                      rows={2}
                      value={editingCategory.descriptions?.[activeLangTab] || ''}
                      onChange={(e) => {
                        const descs = { ...editingCategory.descriptions, [activeLangTab]: e.target.value };
                        setEditingCategory({ ...editingCategory, descriptions: descs as any });
                      }}
                      placeholder={`Brief summary of this category in ${activeLangTab}`}
                      className="w-full px-3.5 py-2 text-sm border border-stone-200 rounded-xl font-medium resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium px-5 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

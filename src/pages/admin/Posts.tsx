import { useState, useEffect, useRef } from 'react';
import { api } from '../../utils/api';
import {
  Plus, Trash2, Pencil, Pin, PinOff, Loader2, Image as ImageIcon,
  Video, X, Eye, Calendar, Save, ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from '../../utils/utils';

interface PostMedia {
  url: string;
  type: 'image' | 'video';
  alt?: string;
  publicId?: string;
}

interface Post {
  id: string;
  title: string;
  excerpt?: string;
  body?: string;
  media: PostMedia[];
  tags: string[];
  pinned: boolean;
  visibility: 'public' | 'company';
  companyId?: string | null;
  publishedAt: string;
  author?: { id: string; name: string; email: string };
}

const EMPTY_POST = {
  title: '',
  excerpt: '',
  body: '',
  media: [] as PostMedia[],
  tags: [] as string[],
  pinned: false,
  visibility: 'public' as const,
  companyId: null as string | null,
  publishedAt: new Date().toISOString(),
};

export default function AdminPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<Partial<Post> & typeof EMPTY_POST>(EMPTY_POST);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [showPreview, setShowPreview] = useState(false);
  const [toast, setToast] = useState('');

  const wysiwygRef = useRef<HTMLDivElement>(null);
  const wysiwygInitRef = useRef<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Fetch all posts
  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<{ items: Post[] }>('/api/posts?limit=100');
        setPosts(data.items || []);
      } catch (err) {
        console.error('Error loading posts:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openNewPost = () => {
    setEditingId(null);
    setEditingPost({ ...EMPTY_POST, publishedAt: new Date().toISOString() });
    wysiwygInitRef.current = null;
    setShowEditor(true);
    setShowPreview(false);
  };

  const openEditPost = (post: Post) => {
    setEditingId(post.id);
    setEditingPost({
      title: post.title || '',
      excerpt: post.excerpt || '',
      body: post.body || '',
      media: post.media || [],
      tags: post.tags || [],
      pinned: post.pinned || false,
      visibility: post.visibility || 'public',
      companyId: post.companyId || null,
      publishedAt: post.publishedAt || new Date().toISOString(),
    });
    wysiwygInitRef.current = null;
    setShowEditor(true);
    setShowPreview(false);
  };

  // Initialize WYSIWYG content only once when editor opens
  useEffect(() => {
    if (showEditor && wysiwygRef.current && wysiwygInitRef.current === null) {
      wysiwygRef.current.innerHTML = editingPost.body || '';
      wysiwygInitRef.current = editingPost.body || '';
    }
  }, [showEditor]);

  const handleSave = async () => {
    if (!editingPost.title.trim()) {
      showToast('O título é obrigatório.');
      return;
    }

    // Sync WYSIWYG
    if (wysiwygRef.current) {
      editingPost.body = wysiwygRef.current.innerHTML;
    }

    setSaving(true);
    try {
      const payload = {
        title: editingPost.title,
        body: editingPost.body,
        excerpt: editingPost.excerpt,
        media: editingPost.media,
        tags: editingPost.tags,
        pinned: editingPost.pinned,
        visibility: editingPost.visibility,
        companyId: editingPost.companyId,
        publishedAt: editingPost.publishedAt,
      };

      if (editingId) {
        const updated = await api.put<Post>(`/api/admin/posts/${editingId}`, payload);
        setPosts(prev => prev.map(p => p.id === editingId ? { ...p, ...updated } : p));
        showToast('Post atualizado com sucesso!');
      } else {
        const created = await api.post<Post>('/api/admin/posts', payload);
        setPosts(prev => [created, ...prev]);
        showToast('Post publicado com sucesso!');
      }
      setShowEditor(false);
    } catch (err: any) {
      showToast(err?.message || 'Erro ao salvar post.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este post?')) return;
    try {
      await api.delete(`/api/admin/posts/${postId}`);
      setPosts(prev => prev.filter(p => p.id !== postId));
      showToast('Post excluído.');
    } catch (err: any) {
      showToast(err?.message || 'Erro ao excluir post.');
    }
  };

  const togglePin = async (post: Post) => {
    try {
      await api.put(`/api/admin/posts/${post.id}`, { ...post, pinned: !post.pinned });
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, pinned: !p.pinned } : p));
      showToast(post.pinned ? 'Post desafixado.' : 'Post fixado no topo!');
    } catch (err: any) {
      showToast('Erro ao atualizar pin.');
    }
  };

  const addMedia = () => {
    if (!mediaUrl.trim()) return;
    setEditingPost(prev => ({
      ...prev,
      media: [...prev.media, { url: mediaUrl, type: mediaType, alt: '' }]
    }));
    setMediaUrl('');
  };

  const removeMedia = (idx: number) => {
    setEditingPost(prev => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== idx)
    }));
  };

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (!tag || editingPost.tags.includes(tag)) return;
    setEditingPost(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    setNewTag('');
  };

  const removeTag = (tag: string) => {
    setEditingPost(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
  };

  const execCommand = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    wysiwygRef.current?.focus();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin text-faktory-blue" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[200] bg-slate-800 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gerenciar Posts</h1>
          <p className="text-slate-500 text-sm mt-1">Crie e gerencie conteúdos para o feed dos alunos.</p>
        </div>
        <button
          onClick={openNewPost}
          className="flex items-center gap-2 bg-faktory-blue text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-faktory-blue/90 transition-colors shadow-sm"
        >
          <Plus size={16} /> Novo Post
        </button>
      </div>

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <ImageIcon size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-bold text-slate-600">Nenhum post publicado</h3>
          <p className="text-sm text-slate-400 mt-1">Clique em "Novo Post" para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <div
              key={post.id}
              className={cn(
                "bg-white border rounded-xl p-4 flex items-center gap-4 transition-all hover:shadow-sm",
                post.pinned ? "border-amber-200 bg-amber-50/30" : "border-slate-200"
              )}
            >
              {/* Thumbnail */}
              {post.media?.[0]?.type === 'image' ? (
                <img src={post.media[0].url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  {post.media?.[0]?.type === 'video'
                    ? <Video size={20} className="text-slate-400" />
                    : <ImageIcon size={20} className="text-slate-300" />
                  }
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {post.pinned && <Pin size={12} className="text-amber-500" />}
                  <h3 className="font-bold text-sm text-slate-800 truncate">{post.title}</h3>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(post.publishedAt)}</span>
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-medium">{post.visibility}</span>
                  {post.tags?.slice(0, 3).map(t => (
                    <span key={t} className="text-slate-400">#{t}</span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => togglePin(post)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-amber-500" title={post.pinned ? 'Desafixar' : 'Fixar'}>
                  {post.pinned ? <PinOff size={16} /> : <Pin size={16} />}
                </button>
                <button onClick={() => openEditPost(post)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-faktory-blue" title="Editar">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(post.id)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500" title="Excluir">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-start justify-center overflow-y-auto p-4 pt-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ maxHeight: '90vh' }}>
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Editar Post' : 'Novo Post'}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={cn("p-2 rounded-lg text-sm", showPreview ? "bg-faktory-blue text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
                  title="Preview"
                >
                  <Eye size={16} />
                </button>
                <button onClick={() => setShowEditor(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {showPreview ? (
                /* Preview Mode */
                <div className="prose prose-slate max-w-none">
                  <h1>{editingPost.title || 'Sem título'}</h1>
                  {editingPost.excerpt && <p className="text-slate-500 italic">{editingPost.excerpt}</p>}
                  {editingPost.media?.map((m, i) => (
                    <div key={i} className="rounded-xl overflow-hidden my-4">
                      {m.type === 'image' ? <img src={m.url} alt={m.alt || ''} /> : (
                        <div className="aspect-video bg-slate-900 flex items-center justify-center text-white">Vídeo: {m.url}</div>
                      )}
                    </div>
                  ))}
                  <div dangerouslySetInnerHTML={{ __html: wysiwygRef.current?.innerHTML || editingPost.body || '' }} />
                </div>
              ) : (
                /* Edit Mode */
                <>
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Título *</label>
                    <input
                      value={editingPost.title}
                      onChange={e => setEditingPost(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full p-3 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-faktory-blue/30"
                      placeholder="Título do post"
                    />
                  </div>

                  {/* Excerpt */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Resumo</label>
                    <textarea
                      value={editingPost.excerpt}
                      onChange={e => setEditingPost(prev => ({ ...prev, excerpt: e.target.value }))}
                      className="w-full p-3 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-faktory-blue/30 resize-none"
                      rows={2}
                      placeholder="Breve descrição que aparece no card do feed"
                    />
                  </div>

                  {/* Body (WYSIWYG) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Conteúdo</label>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="flex items-center gap-1 px-3 py-2 bg-slate-50 border-b border-slate-200 flex-wrap">
                        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => execCommand('bold')} className="h-7 w-7 flex items-center justify-center border border-slate-200 rounded bg-white font-bold text-sm hover:bg-slate-100">B</button>
                        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => execCommand('italic')} className="h-7 w-7 flex items-center justify-center border border-slate-200 rounded bg-white italic text-sm hover:bg-slate-100">I</button>
                        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => execCommand('underline')} className="h-7 w-7 flex items-center justify-center border border-slate-200 rounded bg-white underline text-sm hover:bg-slate-100">U</button>
                        <div className="w-px h-5 bg-slate-200 mx-1" />
                        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => execCommand('formatBlock', 'h2')} className="h-7 px-2 flex items-center justify-center border border-slate-200 rounded bg-white text-xs hover:bg-slate-100 font-bold">H2</button>
                        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => execCommand('formatBlock', 'h3')} className="h-7 px-2 flex items-center justify-center border border-slate-200 rounded bg-white text-xs hover:bg-slate-100 font-bold">H3</button>
                        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => execCommand('formatBlock', 'p')} className="h-7 px-2 flex items-center justify-center border border-slate-200 rounded bg-white text-xs hover:bg-slate-100">P</button>
                        <div className="w-px h-5 bg-slate-200 mx-1" />
                        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => execCommand('insertUnorderedList')} className="h-7 px-2 flex items-center justify-center border border-slate-200 rounded bg-white text-xs hover:bg-slate-100">• Lista</button>
                        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => execCommand('insertOrderedList')} className="h-7 px-2 flex items-center justify-center border border-slate-200 rounded bg-white text-xs hover:bg-slate-100">1. Lista</button>
                        <div className="w-px h-5 bg-slate-200 mx-1" />
                        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { const url = window.prompt('URL do link:'); if (url) execCommand('createLink', url); }} className="h-7 px-2 flex items-center justify-center border border-slate-200 rounded bg-white text-xs hover:bg-slate-100">🔗 Link</button>
                      </div>
                      <div
                        ref={wysiwygRef}
                        contentEditable
                        suppressContentEditableWarning
                        className="w-full p-4 text-sm outline-none bg-white min-h-[200px] prose prose-sm max-w-none"
                      />
                    </div>
                  </div>

                  {/* Media */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Mídia</label>
                    <div className="flex gap-2 mb-3">
                      <select value={mediaType} onChange={e => setMediaType(e.target.value as any)} className="p-2 border border-slate-200 rounded-lg text-sm bg-white">
                        <option value="image">Imagem</option>
                        <option value="video">Vídeo</option>
                      </select>
                      <input
                        value={mediaUrl}
                        onChange={e => setMediaUrl(e.target.value)}
                        className="flex-1 p-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-faktory-blue/30"
                        placeholder="https://..."
                      />
                      <button onClick={addMedia} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg text-sm font-bold transition-colors">
                        <Plus size={16} />
                      </button>
                    </div>
                    {editingPost.media.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {editingPost.media.map((m, i) => (
                          <div key={i} className="relative group w-24 h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                            {m.type === 'image' ? (
                              <img src={m.url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-900"><Video size={20} className="text-white/60" /></div>
                            )}
                            <button
                              onClick={() => removeMedia(i)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tags</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        value={newTag}
                        onChange={e => setNewTag(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                        className="flex-1 p-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-faktory-blue/30"
                        placeholder="ex: anuncio, update"
                      />
                      <button onClick={addTag} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg text-sm font-bold transition-colors">
                        <Plus size={16} />
                      </button>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {editingPost.tags.map(tag => (
                        <span key={tag} className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                          #{tag}
                          <button onClick={() => removeTag(tag)} className="text-slate-400 hover:text-red-500"><X size={10} /></button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Options Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Visibilidade</label>
                      <select
                        value={editingPost.visibility}
                        onChange={e => setEditingPost(prev => ({ ...prev, visibility: e.target.value as any }))}
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
                      >
                        <option value="public">Público (todos os alunos)</option>
                        <option value="company">Empresa específica</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editingPost.pinned}
                          onChange={e => setEditingPost(prev => ({ ...prev, pinned: e.target.checked }))}
                          className="w-4 h-4 rounded border-slate-300 text-faktory-blue focus:ring-faktory-blue"
                        />
                        <span className="text-sm text-slate-600 font-medium">📌 Fixar no topo do feed</span>
                      </label>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 rounded-b-2xl">
              <button onClick={() => setShowEditor(false)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-faktory-blue text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-faktory-blue/90 transition-colors disabled:opacity-50 shadow-sm"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingId ? 'Atualizar' : 'Publicar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

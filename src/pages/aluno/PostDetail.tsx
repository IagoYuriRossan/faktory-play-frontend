import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { Loader2, ArrowLeft, Calendar, User as UserIcon, Pin, Play } from 'lucide-react';

interface PostMedia {
  url: string;
  type: 'image' | 'video';
  alt?: string;
}

interface Post {
  id: string;
  title: string;
  excerpt?: string;
  body?: string;
  media: PostMedia[];
  tags: string[];
  pinned: boolean;
  publishedAt: string;
  author?: { id: string; name: string; email: string };
}

export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!postId) return;
    (async () => {
      try {
        const data = await api.get<Post>(`/api/posts/${postId}`);
        setPost(data);
      } catch (err: any) {
        setError('Post não encontrado.');
      } finally {
        setLoading(false);
      }
    })();
  }, [postId]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric'
      });
    } catch { return iso; }
  };

  const getEmbedUrl = (url: string) => {
    const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/)([0-9]+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return url;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-faktory-blue" size={40} />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-slate-700">{error || 'Post não encontrado'}</h2>
        <button onClick={() => navigate('/app')} className="mt-4 text-faktory-blue font-bold text-sm">
          ← Voltar ao início
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Back button */}
      <Link to="/app" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-faktory-blue font-medium mb-6 transition-colors">
        <ArrowLeft size={16} /> Voltar ao Feed
      </Link>

      {/* Article */}
      <article>
        {/* Tags + Date */}
        <div className="flex items-center gap-3 mb-4">
          {post.pinned && (
            <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              <Pin size={10} /> Destaque
            </span>
          )}
          {post.tags?.map(tag => (
            <span key={tag} className="bg-slate-100 text-slate-500 text-[10px] font-semibold px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight mb-4">{post.title}</h1>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-slate-400 mb-8 pb-6 border-b border-slate-100">
          <span className="flex items-center gap-1.5">
            <Calendar size={14} />
            {formatDate(post.publishedAt)}
          </span>
          {post.author && (
            <span className="flex items-center gap-1.5">
              <UserIcon size={14} />
              {post.author.name}
            </span>
          )}
        </div>

        {/* Media */}
        {post.media?.map((m, idx) => (
          <div key={idx} className="mb-8 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            {m.type === 'image' ? (
              <img src={m.url} alt={m.alt || post.title} className="w-full" />
            ) : (
              <div className="aspect-video">
                <iframe
                  src={getEmbedUrl(m.url)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        ))}

        {/* Body */}
        {post.body && (
          <div
            className="prose prose-slate max-w-none prose-img:rounded-xl prose-headings:text-slate-800 prose-p:text-slate-600 prose-p:leading-relaxed"
            dangerouslySetInnerHTML={{ __html: post.body }}
          />
        )}
      </article>
    </div>
  );
}

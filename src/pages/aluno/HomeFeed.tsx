import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import { useAuthStore } from '../../hooks/store/useAuthStore';
import {
  Loader2, MessageCircle, Eye, Heart, ThumbsUp, Share2,
  BookOpen, ChevronRight, Pin, Play, Bookmark
} from 'lucide-react';
import { cn } from '../../utils/utils';

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

interface FeedResponse {
  items: Post[];
  nextCursor?: string | null;
}

export default function HomeFeed() {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());

  const fetchPosts = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams({ limit: '10' });
    if (cursor) params.set('cursor', cursor);
    return await api.get<FeedResponse>(`/api/posts?${params.toString()}`);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchPosts();
        setPosts(data.items || []);
        setNextCursor(data.nextCursor || null);
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchPosts]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchPosts(nextCursor);
      setPosts(prev => [...prev, ...(data.items || [])]);
      setNextCursor(data.nextCursor || null);
    } catch { /* ignore */ } finally {
      setLoadingMore(false);
    }
  };

  const toggleLike = (postId: string) => {
    setLikedPosts(prev => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  };

  const toggleSave = (postId: string) => {
    setSavedPosts(prev => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Agora mesmo';
      if (diffMins < 60) return `${diffMins}min atrás`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h atrás`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d atrás`;
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
  };

  const getEmbedUrl = (url: string) => {
    const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/)([0-9]+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return url;
  };

  const getAuthorInitials = (name?: string) => {
    if (!name) return 'F';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-faktory-blue" size={36} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">

      {/* Feed */}
      {posts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle size={28} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700">Nenhuma novidade ainda</h3>
          <p className="text-slate-400 text-sm mt-1">As novidades da Faktory aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => {
            const isLiked = likedPosts.has(post.id);
            const isSaved = savedPosts.has(post.id);
            const bodyText = post.body ? stripHtml(post.body) : '';
            const showReadMore = bodyText.length > 280;

            return (
              <article
                key={post.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Post Header */}
                <div className="px-5 pt-4 pb-2">
                  <div className="flex items-start gap-3">
                    {/* Author Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-faktory-blue to-blue-400 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
                      {getAuthorInitials(post.author?.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-800">
                          {post.author?.name || 'Faktory'}
                        </span>
                        {post.tags?.[0] && (
                          <>
                            <span className="text-slate-400 text-xs">em</span>
                            <span className="text-faktory-blue text-xs font-semibold">
                              {post.tags[0]}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-slate-400">{formatDate(post.publishedAt)}</span>
                        {post.pinned && (
                          <span className="flex items-center gap-0.5 bg-amber-100 text-amber-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            <Pin size={9} /> Fixado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bookmark */}
                    <button
                      onClick={() => toggleSave(post.id)}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors shrink-0",
                        isSaved ? "text-faktory-blue bg-blue-50" : "text-slate-300 hover:text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>

                {/* Post Title + Body */}
                <div className="px-5 pb-3">
                  <Link to={`/app/post/${post.id}`}>
                    <h2 className="font-bold text-base text-slate-800 mb-1 hover:text-faktory-blue transition-colors leading-snug">
                      {post.title}
                    </h2>
                  </Link>

                  {bodyText && (
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                      {showReadMore ? bodyText.slice(0, 280) + '...' : bodyText}
                      {showReadMore && (
                        <Link to={`/app/post/${post.id}`} className="text-faktory-blue font-semibold ml-1 hover:underline">
                          ler mais
                        </Link>
                      )}
                    </p>
                  )}

                  {!bodyText && post.excerpt && (
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {post.excerpt}
                    </p>
                  )}
                </div>

                {/* Media */}
                {post.media?.length > 0 && (
                  <div className="relative">
                    {post.media[0].type === 'image' ? (
                      <Link to={`/app/post/${post.id}`}>
                        <img
                          src={post.media[0].url}
                          alt={post.media[0].alt || post.title}
                          className="w-full max-h-[420px] object-cover"
                        />
                      </Link>
                    ) : (
                      <div className="aspect-video">
                        <iframe
                          src={getEmbedUrl(post.media[0].url)}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}
                    {post.media.length > 1 && (
                      <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        +{post.media.length - 1} mídia{post.media.length > 2 ? 's' : ''}
                      </div>
                    )}
                  </div>
                )}

                {/* Reactions Bar */}
                <div className="px-5 py-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {/* Like */}
                      <button
                        onClick={() => toggleLike(post.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                          isLiked
                            ? "text-red-500 bg-red-50 hover:bg-red-100"
                            : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        <Heart size={15} fill={isLiked ? 'currentColor' : 'none'} />
                        <span>{isLiked ? 'Curtiu' : 'Curtir'}</span>
                      </button>

                      {/* Comment */}
                      <Link
                        to={`/app/post/${post.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                      >
                        <MessageCircle size={15} />
                        <span>Comentar</span>
                      </Link>

                      {/* Share */}
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(window.location.origin + `/app/post/${post.id}`);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                      >
                        <Share2 size={15} />
                        <span>Compartilhar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Load More */}
      {nextCursor && (
        <div className="flex justify-center mt-6">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="bg-white border border-slate-200 text-slate-500 px-6 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm"
          >
            {loadingMore ? (
              <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Carregando...</span>
            ) : 'Carregar mais publicações'}
          </button>
        </div>
      )}
    </div>
  );
}

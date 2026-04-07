import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../../hooks/store/useAuthStore';
import { api } from '../../utils/api';
import { Trail, Enrollment } from '../../@types';
import { BookOpen, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../../utils/utils';

import { MOCK_TRAILS } from '../../mocks/data';

export default function AlunoDashboard() {
  const navigate = useNavigate();
  const { user, token, login } = useAuthStore();
  const [trails, setTrails] = useState<Trail[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const isFetchingRef = useRef(false);
  const lastFetchMsRef = useRef(0);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      // avoid concurrent / rapid repeated calls
      if (isFetchingRef.current) return;
      const now = Date.now();
      if (now - lastFetchMsRef.current < 3000) return; // throttle 3s
      isFetchingRef.current = true;
      lastFetchMsRef.current = now;

      try {
        // Revalidate current user profile from API to pick up updated allowedTrails
        let currentUser = user;
        try {
          const refreshed = await api.get<any>('/api/auth/me');
          if (refreshed) {
            const currentAllowed = (user as any)?.allowedTrails || [];
            const refreshedAllowed = refreshed.allowedTrails || [];
            const a = [...currentAllowed].slice().sort();
            const b = [...refreshedAllowed].slice().sort();
            const same = JSON.stringify(a) === JSON.stringify(b);
            if (!same && login) {
              try { login(refreshed, token || ''); } catch {}
            }
            currentUser = refreshed;
          }
        } catch (err) {
          // ignore revalidation error; proceed with existing user
        }

        const [projects, allTrails, enrollmentsData] = await Promise.all([
          api.get<any[]>('/api/projects'),
          api.get<Trail[]>('/api/trails'),
          api.get<Enrollment[]>(`/api/users/${currentUser.id}/progress`),
        ]);

        const projectTrailIds = projects.map((p: any) => p.trailId);
        const dbTrails = allTrails.filter(t => projectTrailIds.includes(t.id));

        // Also include trails explicitly allowed for the user (union, de-duplicated)
        const userAllowed: string[] = (currentUser as any)?.allowedTrails || [];
        const allowedTrailsFromAll = allTrails.filter(t => userAllowed.includes(t.id));
        const combinedMap = new Map<string, typeof allTrails[0]>();
        [...dbTrails, ...allowedTrailsFromAll].forEach(t => combinedMap.set(t.id, t));
        const visibleTrails = Array.from(combinedMap.values());
        setTrails(visibleTrails);
        setEnrollments(enrollmentsData);
      } catch (error: any) {
        // Avoid noisy logs on expected rate-limit responses
        if (error?.response?.status === 429) {
          // no-op (backoff is enforced by throttling)
        } else {
          console.debug('Error fetching dashboard data:', error);
        }
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-faktory-blue" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-800">Consultoria online</h1>
        <p className="text-slate-500 mt-2">Olá, {user?.name}! Continue seu treinamento e domine o ERP Faktory.</p>
      </div>

      {trails.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
          <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700">Nenhuma trilha disponível</h3>
          <p className="text-slate-500">Sua empresa ainda não possui trilhas liberadas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {trails.map((trail) => {
            const enrollment = enrollments.find(e => e.trailId === trail.id);
            const progress = enrollment?.progress || 0;
            const isFaktoryOne = trail.id === 'faktory-one';

            return (
              <div
                key={trail.id}
                role="link"
                tabIndex={0}
                onClick={() => navigate(`/app/aula/${trail.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/app/aula/${trail.id}`); }}
                className="group block cursor-pointer"
              >
                <div className={cn(
                  "rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 md:aspect-[16/10] min-h-[220px] flex flex-col",
                  isFaktoryOne 
                    ? "bg-white border-slate-200" 
                    : "bg-faktory-blue border-faktory-blue text-white"
                )}>
                        <div className="flex-1 relative p-6 md:p-8 pb-12 flex flex-col justify-center items-center text-center">
                    {isFaktoryOne ? (
                      <>
                        {/* Graphic Elements like in the image */}
                        <div className="absolute top-0 left-0 w-32 h-32 bg-faktory-blue rounded-br-full opacity-10"></div>
                        <div className="absolute bottom-0 right-0 w-24 h-24 bg-faktory-yellow rounded-tl-full opacity-10"></div>
                        
                        <div className="z-10">
                          <div className="flex items-center gap-2 mb-4 justify-center">
                            <div className="w-8 h-8 bg-faktory-blue rounded flex items-center justify-center text-white font-bold text-xs">F</div>
                            <span className="text-sm font-bold text-slate-400">Faktory</span>
                          </div>
                          <h3 className="text-2xl md:text-3xl font-bold text-faktory-blue mb-1">Fase 1:</h3>
                          <p className="text-slate-500 font-medium mt-2 mb-2 text-sm md:text-base">Trilha - Boas Vindas</p>
                        </div>
                      </>
                    ) : (
                      <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-wider">{trail.title}</h3>
                    )}
                  </div>
                  
                    <div className={cn(
                    "px-8 py-4 flex items-center justify-between border-t",
                    isFaktoryOne ? "bg-slate-50 border-slate-100" : "bg-black/10 border-white/10"
                  )}>
                    <div className="flex items-center gap-2">
                      <div className="w-24 md:w-32 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-faktory-blue transition-all duration-500" 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <span className={cn(
                        "text-sm md:text-base font-bold",
                        isFaktoryOne ? "text-slate-400" : "text-white/60"
                      )}>{progress}%</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/app/aula/${trail.id}`); }}
                      className={cn(
                        "text-sm md:text-base font-bold uppercase tracking-widest px-3 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1",
                        isFaktoryOne ? "text-faktory-blue bg-white/0 hover:bg-slate-50/50 focus:ring-faktory-blue" : "text-white bg-black/10 hover:bg-black/20 focus:ring-white"
                      )}
                    >
                      {progress > 0 ? 'Continuar' : 'Iniciar'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

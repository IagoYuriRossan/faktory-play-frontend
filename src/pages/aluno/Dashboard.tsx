import { useEffect, useState } from 'react';
import { useAuthStore } from '../../hooks/store/useAuthStore';
import { api } from '../../utils/api';
import { Trail, Enrollment } from '../../@types';
import { BookOpen, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/utils';

import { MOCK_TRAILS } from '../../mocks/data';

export default function AlunoDashboard() {
  const { user } = useAuthStore();
  const [trails, setTrails] = useState<Trail[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      try {
        const [projects, allTrails, enrollmentsData] = await Promise.all([
          api.get<any[]>('/api/projects'),
          api.get<Trail[]>('/api/trails'),
          api.get<Enrollment[]>(`/api/users/${user.id}/progress`),
        ]);

        const projectTrailIds = projects.map((p: any) => p.trailId);
        const dbTrails = allTrails.filter(t => projectTrailIds.includes(t.id));
        setTrails(dbTrails);
        setEnrollments(enrollmentsData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
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
              <Link 
                key={trail.id} 
                to={`/app/aula/${trail.id}`}
                className="group block"
              >
                <div className={cn(
                  "rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 aspect-[16/10] flex flex-col",
                  isFaktoryOne 
                    ? "bg-white border-slate-200" 
                    : "bg-faktory-blue border-faktory-blue text-white"
                )}>
                  <div className="flex-1 relative p-8 flex flex-col justify-center items-center text-center">
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
                          <h3 className="text-2xl font-bold text-faktory-blue mb-1">Fase 1:</h3>
                          <p className="text-slate-500 font-medium">Trilha - Boas Vindas</p>
                        </div>
                      </>
                    ) : (
                      <h3 className="text-3xl font-bold uppercase tracking-wider">{trail.title}</h3>
                    )}
                  </div>
                  
                  <div className={cn(
                    "px-8 py-4 flex items-center justify-between border-t",
                    isFaktoryOne ? "bg-slate-50 border-slate-100" : "bg-black/10 border-white/10"
                  )}>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-faktory-blue transition-all duration-500" 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold",
                        isFaktoryOne ? "text-slate-400" : "text-white/60"
                      )}>{progress}%</span>
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      isFaktoryOne ? "text-faktory-blue" : "text-white"
                    )}>
                      {progress > 0 ? 'Continuar' : 'Iniciar'}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

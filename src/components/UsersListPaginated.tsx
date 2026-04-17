import React, { useState } from 'react';

export default function UsersListPaginated({ users, onSelect }: { users: any[]; onSelect: (u:any)=>void }) {
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(0);
  const start = page * PAGE_SIZE;
  const slice = users.slice(start, start + PAGE_SIZE);

  return (
    <div>
      <div className="grid gap-2">
        {slice.map(u => (
          <button key={u.userId} onClick={() => onSelect(u)} className="text-left p-2 rounded hover:bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">{(u.name && u.name[0]) || 'U'}</div>
              <div>
                <div className="text-sm font-medium">{u.name || u.userId}</div>
                <div className="text-xs text-slate-400">{Math.round((u.completionRate ?? 0) * 100)}% • {u.completedQuestionnaires}/{u.totalQuestionnaires}</div>
              </div>
            </div>
            <div className="text-xs text-slate-500">Ver</div>
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p-1))} className="px-3 py-1 border rounded">Anterior</button>
        <div className="text-sm text-slate-500">Página {page+1} de {Math.ceil(users.length / PAGE_SIZE)}</div>
        <button disabled={(start + PAGE_SIZE) >= users.length} onClick={() => setPage(p => p+1)} className="px-3 py-1 border rounded">Carregar mais</button>
      </div>
    </div>
  );
}

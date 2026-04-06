import { Construction } from 'lucide-react';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-10">
      <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-faktory-blue mb-6">
        <Construction size={40} />
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">{title}</h1>
      <p className="text-slate-500 max-w-md">
        Esta página está em desenvolvimento e estará disponível em breve como parte do ecossistema Faktory Play.
      </p>
    </div>
  );
}

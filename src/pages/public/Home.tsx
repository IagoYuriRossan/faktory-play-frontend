import { Link } from 'react-router-dom';
import { CheckCircle2, Monitor, Users, ShieldCheck } from 'lucide-react';
import { cn } from '../../utils/utils';

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-white py-24 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-faktory-blue/5 -skew-x-12 translate-x-1/2"></div>
        <div className="container mx-auto px-6 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-faktory-blue text-xs font-bold mb-6 border border-blue-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-faktory-blue opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-faktory-blue"></span>
              </span>
              NOVO: Faktory Play MVP
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-slate-800 leading-tight mb-6">
              Treine sua equipe com o <span className="text-faktory-blue">Faktory Play</span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 leading-relaxed">
              A plataforma definitiva de treinamento para o ecossistema EG Faktory. 
              Reduza o tempo de implantação e maximize a produtividade dos seus colaboradores.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/register"
                className="px-8 py-4 bg-faktory-blue text-white rounded-xl font-bold text-lg hover:bg-[#2c6a9a] transition-all shadow-lg shadow-blue-200 text-center"
              >
                Começar Agora
              </Link>
              <Link
                to="/login"
                className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all text-center"
              >
                Acessar Plataforma
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Versions Section */}
      <section className="py-24 bg-[#f4f7f9]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Trilhas para cada necessidade</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Escolha a trilha de aprendizado ideal baseada na versão do seu ERP Faktory.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                title: 'Faktory ONE', 
                desc: 'O essencial para pequenas empresas de esquadrias.', 
                color: 'border-blue-400',
                features: ['Vendas', 'Faturamento', 'Estoque Base']
              },
              { 
                title: 'Faktory Smart', 
                desc: 'Gestão inteligente e integrada para o seu negócio.', 
                color: 'border-faktory-yellow',
                features: ['Produção', 'Financeiro Avançado', 'Compras']
              },
              { 
                title: 'Faktory PRO', 
                desc: 'A solução completa para indústrias de grande porte.', 
                color: 'border-faktory-blue',
                features: ['PCP Completo', 'BI & Relatórios', 'Multi-unidades']
              },
            ].map((product) => (
              <div key={product.title} className={cn("bg-white p-8 rounded-2xl shadow-sm border-t-4 transition-transform hover:-translate-y-1", product.color)}>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">{product.title}</h3>
                <p className="text-slate-500 mb-8 text-sm">{product.desc}</p>
                <ul className="space-y-4 mb-8">
                  {product.features.map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-slate-600">
                      <CheckCircle2 size={18} className="text-green-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="block text-center py-3 rounded-lg border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                  Saiba Mais
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

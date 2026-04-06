import { useState } from 'react';
import { Save, Loader2, Shield, Bell, Globe, Palette } from 'lucide-react';

export default function AdminConfiguracoes() {
  const [saving, setSaving] = useState(false);
  
  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1000);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configurações do Sistema</h1>
        <p className="text-slate-500">Gerencie as preferências globais da plataforma Faktory Play.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Branding Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <Palette className="text-faktory-blue" size={20} />
            <h2 className="font-bold text-slate-800">Identidade Visual</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Nome da Plataforma</label>
              <input
                type="text"
                defaultValue="Faktory Play"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-faktory-blue outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Cor Primária</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  defaultValue="#3482B9"
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-faktory-blue outline-none transition-all"
                />
                <div className="w-10 h-10 rounded-lg bg-faktory-blue border border-slate-200"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <Shield className="text-faktory-blue" size={20} />
            <h2 className="font-bold text-slate-800">Segurança e Acesso</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" defaultChecked className="w-5 h-5 text-faktory-blue rounded focus:ring-faktory-blue" />
              <span className="text-slate-700 group-hover:text-slate-900 transition-colors">Permitir auto-cadastro de novas empresas</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" defaultChecked className="w-5 h-5 text-faktory-blue rounded focus:ring-faktory-blue" />
              <span className="text-slate-700 group-hover:text-slate-900 transition-colors">Exigir verificação de e-mail para novos usuários</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" className="w-5 h-5 text-faktory-blue rounded focus:ring-faktory-blue" />
              <span className="text-slate-700 group-hover:text-slate-900 transition-colors">Bloquear acesso simultâneo (mesma conta)</span>
            </label>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <Bell className="text-faktory-blue" size={20} />
            <h2 className="font-bold text-slate-800">Notificações</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" defaultChecked className="w-5 h-5 text-faktory-blue rounded focus:ring-faktory-blue" />
              <span className="text-slate-700 group-hover:text-slate-900 transition-colors">Notificar admin sobre novas conclusões de trilha</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" defaultChecked className="w-5 h-5 text-faktory-blue rounded focus:ring-faktory-blue" />
              <span className="text-slate-700 group-hover:text-slate-900 transition-colors">Enviar e-mail de boas-vindas para novos alunos</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-faktory-blue text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-100 flex items-center gap-2 hover:bg-[#2c6a9a] transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          Salvar Configurações
        </button>
      </div>
    </div>
  );
}

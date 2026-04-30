import { useState, useEffect } from 'react';
import { Plus, Trash2, HelpCircle, Save, Loader2 } from 'lucide-react';
import { getQuestionnaire, updateQuestionnaire, getTrailQuestionnaire, updateTrailQuestionnaire } from '../../../../services/questionnaireService';

interface QuestionnaireBlockEditorProps {
  questionnaireId: string;
  showToast: (msg: string) => void;
  projectId?: string;
}

export function QuestionnaireBlockEditor({ questionnaireId, showToast, projectId }: QuestionnaireBlockEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  console.log('[QE] Component Render. questionnaireId:', questionnaireId, 'projectId:', projectId);

  const [error, setError] = useState<string | null>(null);

  const transformToInternal = (questionnaire: any) => {
    if (!questionnaire.questions) return questionnaire;
    const questions = questionnaire.questions.map((q: any) => {
      if (q.type === 'open') return q;
      if (Array.isArray(q.options) && q.options.length > 0 && typeof q.options[0] === 'object') {
        const options = q.options.map((o: any) => o.text || '');
        const correctIndex = q.options.findIndex((o: any) => o.isCorrect === true);
        return { 
          ...q, 
          type: q.type === 'single_choice' ? 'multiple_choice' : q.type,
          options, 
          correctIndex: correctIndex === -1 ? 0 : correctIndex 
        };
      }
      return { ...q, correctIndex: q.correctIndex || 0 };
    });
    return { ...questionnaire, questions };
  };

  const load = async () => {
    if (!questionnaireId || questionnaireId.startsWith('local-')) {
      setData({
        title: 'Novo Questionário',
        questions: [
          { type: 'multiple_choice', text: 'Pergunta 1', options: ['Opção 1', 'Opção 2'], correctIndex: 0 }
        ]
      });
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Try trail endpoint first if projectId is present
      let res;
      if (projectId) {
        try {
          res = await getTrailQuestionnaire(projectId, questionnaireId);
        } catch (trailErr) {
          console.warn('Falha ao buscar via trail endpoint, tentando universal:', trailErr);
          res = await getQuestionnaire(questionnaireId);
        }
      } else {
        res = await getQuestionnaire(questionnaireId);
      }

      console.log('[QE] load response raw:', res);

      // Unwrap common response shapes
      let questionnaireObj = res;
      if (res && typeof res === 'object') {
        if (res.questionnaire) questionnaireObj = res.questionnaire;
        else if (res.data) questionnaireObj = res.data;
        else if (res.doc) questionnaireObj = res.doc;
      }

      console.log('[QE] load using questionnaire object:', questionnaireObj);

      // If the trail-specific endpoint returned no questions, try the universal endpoint
      if (!questionnaireObj || !questionnaireObj.questions || questionnaireObj.questions.length === 0) {
        console.warn('[QE] trail response missing questions, trying universal endpoint');
        try {
          const res2 = await getQuestionnaire(questionnaireId);
          console.log('[QE] universal load raw:', res2);
          let q2 = res2;
          if (res2 && typeof res2 === 'object') {
            if (res2.questionnaire) q2 = res2.questionnaire;
            else if (res2.data) q2 = res2.data;
            else if (res2.doc) q2 = res2.doc;
          }
          console.log('[QE] universal load object:', q2);
          if (q2 && q2.questions && q2.questions.length > 0) {
            console.log('[QE] universal load has questions, using it');
            setData(transformToInternal(q2));
            return;
          } else {
            console.warn('[QE] universal also missing questions, falling back to trail object');
          }
        } catch (e) {
          console.warn('[QE] universal endpoint failed', e);
        }
      }

      setData(transformToInternal(questionnaireObj));
    } catch (err: any) {
      console.error('Erro ao buscar questionário:', err);
      const msg = err.response?.data?.error || err.message || 'Erro desconhecido';
      setError(msg);
      showToast('Erro ao carregar dados do questionário');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [questionnaireId]);

  // (Moved below) placeholder for handleSave registration

  const validate = () => {
    console.log('[QE] validate start, questions:', data?.questions);
    if (!data.questions || data.questions.length === 0) {
      showToast('Adicione pelo menos uma pergunta');
      return false;
    }
    for (let i = 0; i < data.questions.length; i++) {
      const q = data.questions[i];
      // Normalize question shape to be more tolerant to payloads
      if (q.type !== 'open') {
        // If options are objects (from backend), map to strings and set correctIndex
        if (Array.isArray(q.options) && q.options.length > 0 && typeof q.options[0] === 'object') {
          const correctIdx = q.options.findIndex((o: any) => o && o.isCorrect === true);
          q.correctIndex = correctIdx === -1 ? 0 : correctIdx;
          q.options = q.options.map((o: any) => (o && (o.text || o.label)) || '');
          console.log(`[QE] normalize question ${i}: options were objects, set correctIndex=${q.correctIndex}`);
        }
        // Coerce string indices to number
        if (typeof q.correctIndex === 'string') {
          const parsed = parseInt(q.correctIndex as any, 10);
          q.correctIndex = Number.isNaN(parsed) ? 0 : parsed;
          console.log(`[QE] normalize question ${i}: coerced correctIndex to`, q.correctIndex);
        }
        // Ensure a default correctIndex when missing
        if (q.correctIndex === undefined || q.correctIndex === null) {
          q.correctIndex = 0;
          console.log(`[QE] normalize question ${i}: defaulted missing correctIndex to 0`);
        }
      }

      if (!q.text || !String(q.text).trim()) {
        console.log(`[QE] validate failed: empty text at question ${i}`);
        showToast(`Pergunta ${i + 1} está sem enunciado`);
        return false;
      }
      if (q.type !== 'open') {
        if (!q.options || q.options.length < 2) {
          console.log(`[QE] validate failed: not enough options at question ${i}`, q.options);
          showToast(`Pergunta ${i + 1} deve ter pelo menos 2 alternativas`);
          return false;
        }
        if (q.correctIndex === undefined || q.correctIndex === null || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
          console.log(`[QE] validate failed: invalid correctIndex at question ${i}`, q.correctIndex);
          showToast(`Selecione a resposta correta para a pergunta ${i + 1}`);
          return false;
        }
      }
    }
    console.log('[QE] validate passed');
    return true;
  };

  const handleSave = async () => {
    console.log('[QE] handleSave called. questionnaireId:', questionnaireId, 'projectId:', projectId);
    
    if (!validate()) {
      console.log('[QE] Validation failed');
      return;
    }
    console.log('[QE] Validation passed');

    if (questionnaireId.startsWith('local-')) {
      showToast('Este questionario e local. Salve a trilha para persistir.');
      return;
    }

    try {
      setSaving(true);
      
      // Transform for backend: options as {text, isCorrect} objects
      const payload = {
        ...data,
        questions: data.questions.map((q: any) => {
          if (q.type === 'open') {
            const { correctIndex, ...rest } = q;
            return { ...rest, options: [] };
          }
          const type = q.type === 'multiple_choice' ? 'single_choice' : q.type;
          const options = (q.options || []).map((text: string, idx: number) => ({
            text: text || `Opcao ${idx + 1}`,
            isCorrect: idx === q.correctIndex
          }));
          const { correctIndex, ...rest } = q;
          return { ...rest, type, options };
        })
      };

      console.log('[QE] Payload montado:', JSON.stringify(payload, null, 2));

      let savedDoc;
      if (projectId) {
        const url = `/api/trails/${projectId}/questionnaires/${questionnaireId}`;
        console.log('[QE] Tentando salvar via trail: PUT', url);
        try {
          savedDoc = await updateTrailQuestionnaire(projectId, questionnaireId, payload);
          console.log('[QE] Trail save OK:', savedDoc);
        } catch (trailErr: any) {
          console.warn('[QE] Trail save FALHOU:', trailErr.message || trailErr);
          const url2 = `/api/questionnaires/${questionnaireId}`;
          console.log('[QE] Tentando fallback universal: PUT', url2);
          savedDoc = await updateQuestionnaire(questionnaireId, payload);
          console.log('[QE] Universal save OK:', savedDoc);
        }
      } else {
        const url = `/api/questionnaires/${questionnaireId}`;
        console.log('[QE] Salvando via universal: PUT', url);
        savedDoc = await updateQuestionnaire(questionnaireId, payload);
        console.log('[QE] Universal save OK:', savedDoc);
      }

      showToast('Questionario salvo!');

      if (savedDoc) {
        console.log('[QE] Atualizando estado com documento recarregado');
        setData(transformToInternal(savedDoc));
      }

    } catch (err: any) {
      console.error('[QE] ERRO FINAL ao salvar:', err);
      const msg = err?.serverMessage || err?.message || String(err);
      alert('ERRO ao salvar questionario:\n\n' + msg);
      showToast('Erro: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  // Expose handleSave to the window so the modal can trigger it
  useEffect(() => {
    (window as any).__triggerQuestionnaireSave = handleSave;
    return () => {
      (window as any).__triggerQuestionnaireSave = null;
    };
  }, [handleSave]);

  const addQuestion = () => {
    const newQuestions = [...(data.questions || []), {
      type: 'multiple_choice',
      text: '',
      options: ['', ''],
      correctIndex: 0
    }];
    setData({ ...data, questions: newQuestions });
  };

  const removeQuestion = (idx: number) => {
    const newQuestions = data.questions.filter((_: any, i: number) => i !== idx);
    setData({ ...data, questions: newQuestions });
  };

  const updateQuestion = (idx: number, updates: any) => {
    const newQuestions = [...data.questions];
    newQuestions[idx] = { ...newQuestions[idx], ...updates };
    setData({ ...data, questions: newQuestions });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <Loader2 className="animate-spin mb-2" />
      <p>Carregando questionário...</p>
    </div>
  );

  if (error) return (
    <div className="p-8 text-center bg-red-50 border border-red-100 rounded-xl">
      <p className="text-red-500 font-bold mb-2">Erro ao carregar dados</p>
      <p className="text-xs text-red-400 mb-4 font-mono">{error}</p>
      <button 
        onClick={() => load()} 
        className="px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors"
      >
        Tentar Novamente
      </button>
    </div>
  );

  if (!data) return <div className="p-4 text-slate-500 text-center">Nenhum dado disponível.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h4 className="font-bold text-slate-800">Questões do Questionário</h4>
           <p className="text-xs text-slate-500">Edite as perguntas e alternativas abaixo.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-faktory-blue text-white rounded font-bold text-sm hover:bg-faktory-blue/90 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Salvar Alterações no Questionário
        </button>
      </div>

      <div className="space-y-8">
        {data.questions?.map((q: any, qIdx: number) => (
          <div key={qIdx} className="p-5 border border-slate-200 rounded-xl bg-white shadow-sm relative group">
            <button
              onClick={() => removeQuestion(qIdx)}
              className="absolute -top-3 -right-3 p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 size={14} />
            </button>

            <div className="grid grid-cols-12 gap-4 mb-4">
               <div className="col-span-10">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Pergunta {qIdx + 1}</label>
                  <input
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-faktory-blue"
                    value={q.text}
                    onChange={(e) => updateQuestion(qIdx, { text: e.target.value })}
                    placeholder="Enunciado da questão..."
                  />
               </div>
               <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Tipo</label>
                  <select
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-xs outline-none bg-slate-50"
                    value={q.type}
                    onChange={(e) => updateQuestion(qIdx, { type: e.target.value })}
                  >
                    <option value="multiple_choice">Múltipla Escolha</option>
                    <option value="open">Aberta</option>
                  </select>
               </div>
            </div>

            {q.type === 'multiple_choice' && (
              <div className="space-y-3 mt-4 pl-4 border-l-2 border-slate-100">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Alternativas</label>
                {q.options?.map((opt: string, oIdx: number) => (
                  <div key={oIdx} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name={`correct-${qIdx}`}
                      checked={q.correctIndex === oIdx}
                      onChange={() => updateQuestion(qIdx, { correctIndex: oIdx })}
                      className="text-faktory-blue focus:ring-faktory-blue"
                    />
                    <input
                      className="flex-1 p-2 border border-slate-100 rounded text-sm bg-slate-50 outline-none focus:bg-white focus:border-faktory-blue"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...q.options];
                        newOpts[oIdx] = e.target.value;
                        updateQuestion(qIdx, { options: newOpts });
                      }}
                      placeholder={`Opção ${oIdx + 1}`}
                    />
                    {q.options.length > 2 && (
                       <button
                         onClick={() => {
                           const newOpts = q.options.filter((_: any, i: number) => i !== oIdx);
                           updateQuestion(qIdx, { options: newOpts });
                         }}
                         className="p-1 text-slate-300 hover:text-red-500"
                       >
                         <Trash2 size={12} />
                       </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newOpts = [...(q.options || []), ''];
                    updateQuestion(qIdx, { options: newOpts });
                  }}
                  className="text-[11px] font-bold text-faktory-blue flex items-center gap-1 mt-1 hover:underline"
                >
                  <Plus size={12} /> Adicionar alternativa
                </button>
              </div>
            )}

            {q.type === 'open' && (
               <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center">
                  <p className="text-xs text-slate-500 italic">Questão aberta: o aluno responderá com texto livre.</p>
               </div>
            )}
          </div>
        ))}

        <button
          onClick={addQuestion}
          className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-faktory-blue hover:text-faktory-blue hover:bg-faktory-blue/5 transition-all flex flex-col items-center justify-center gap-2"
        >
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-white shadow-sm">
             <Plus size={20} />
          </div>
          <span className="text-sm font-bold">Adicionar nova pergunta</span>
        </button>
      </div>
    </div>
  );
}

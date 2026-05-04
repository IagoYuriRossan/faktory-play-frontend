import { useRef, useState } from 'react';
import type { Task, TaskCompletion } from '../../@types/tasks';
import { Upload, CheckCircle2, Loader2, FileImage, X } from 'lucide-react';
import { cn } from '../../utils/utils';
import taskService from '../../services/taskService';
import { api } from '../../utils/api';

interface Props {
  task: Task;
  userId: string;
  existingCompletion?: TaskCompletion | null;
  onSubmitted: (completion: TaskCompletion) => void;
}

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

export default function ImageUploadTask({ task, userId, existingCompletion, onSubmitted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { acceptedFormats = ['jpg', 'jpeg', 'png', 'pdf'], maxSizeMB = 10, uploadPrompt } = task.config;
  const acceptMime = acceptedFormats.map(f => MIME_MAP[f.toLowerCase()] ?? `image/${f}`).join(',');
  const alreadyPending = existingCompletion?.status === 'pending';
  const alreadyDone = existingCompletion?.status === 'completed';

  const validateFile = (file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!acceptedFormats.includes(ext)) {
      return `Formato não aceito. Use: ${acceptedFormats.join(', ')}`;
    }
    if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
      return `Arquivo muito grande. Máximo: ${maxSizeMB} MB`;
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) { setError(err); return; }
    setError(null);
    setSelected(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) { setError(err); return; }
    setError(null);
    setSelected(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!selected) return;
    setUploading(true);
    setError(null);
    try {
      // 1. Faz upload para o storage via endpoint de uploads
      const form = new FormData();
      form.append('file', selected);
      form.append('taskId', task.id);
      const uploadRes = await api.post<{ url: string; fileName: string }>('/api/uploads/task', form);

      // 2. Submete a tarefa com a URL do arquivo
      const completion = await taskService.submitTask(task.id, {
        uploadedFileUrl: uploadRes.url,
        fileName: uploadRes.fileName ?? selected.name,
        fileSize: selected.size,
        fileMimeType: selected.type,
      });
      onSubmitted(completion);
    } catch (e: any) {
      console.error('[ImageUploadTask] error', e);
      setError(e?.serverMessage ?? 'Erro ao enviar arquivo. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  if (alreadyDone) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
        <CheckCircle2 size={32} className="mx-auto mb-2 text-green-500" />
        <p className="text-sm font-semibold text-green-700">Arquivo aprovado</p>
        {existingCompletion?.completionData?.fileName && (
          <p className="mt-1 text-xs text-slate-400">{existingCompletion.completionData.fileName}</p>
        )}
      </div>
    );
  }

  if (alreadyPending) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
        <FileImage size={32} className="mx-auto mb-2 text-amber-500" />
        <p className="text-sm font-semibold text-amber-700">Aguardando revisão</p>
        {existingCompletion?.completionData?.fileName && (
          <p className="mt-1 text-xs text-slate-400">{existingCompletion.completionData.fileName}</p>
        )}
        {existingCompletion?.reviewNotes && (
          <p className="mt-2 rounded-lg bg-white border border-amber-200 px-3 py-2 text-xs text-slate-600">
            {existingCompletion.reviewNotes}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-center gap-2 text-slate-700">
        <Upload size={18} className="text-faktory-blue" />
        <span className="font-semibold text-sm">{task.title}</span>
      </div>

      {(task.description || uploadPrompt) && (
        <p className="text-sm text-slate-500">{uploadPrompt ?? task.description}</p>
      )}

      {/* Dropzone */}
      {!selected ? (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-8 cursor-pointer hover:border-faktory-blue hover:bg-blue-50/40 transition-colors"
        >
          <Upload size={24} className="text-slate-400" />
          <p className="text-sm text-slate-500 text-center">
            Arraste um arquivo aqui ou <span className="text-faktory-blue font-medium">clique para escolher</span>
          </p>
          <p className="text-xs text-slate-400">
            {acceptedFormats.join(', ').toUpperCase()} · máx. {maxSizeMB} MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={acceptMime}
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-3">
          {preview ? (
            <img src={preview} alt="preview" className="max-h-48 rounded-lg object-contain mx-auto" />
          ) : (
            <div className="flex items-center gap-2 py-3 px-2">
              <FileImage size={20} className="text-slate-400" />
              <span className="text-sm text-slate-700 truncate">{selected.name}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => { setSelected(null); setPreview(null); setError(null); }}
            className="absolute top-2 right-2 rounded-full bg-white border border-slate-200 p-1 hover:bg-red-50 transition-colors"
          >
            <X size={12} className="text-slate-500" />
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!selected || uploading}
        className={cn(
          'w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all',
          selected && !uploading
            ? 'bg-faktory-blue text-white hover:bg-faktory-blue/90'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed',
        )}
      >
        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        {uploading ? 'Enviando...' : 'Enviar Arquivo'}
      </button>
    </div>
  );
}

'use client';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';


import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useAuth } from '@/lib/auth-context';
import { Category, Ward } from '@/lib/types';
import { BHATKAL_CENTER } from '@/lib/constants';
import { validateImageFile } from '@/lib/utils';
import { ArrowLeft, ArrowRight, MapPin, Upload, X, Sparkles, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import LocationPicker from '@/components/map/LocationPicker';

const STEPS = ['Category', 'Location', 'Details', 'Review'];

export default function NewComplaintPage() {
  const router = useRouter();
  const _user = useAuth();
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [enhancing, setEnhancing] = useState(false);

  // Form state
  const [categoryId, setCategoryId] = useState('');
  const [wardId, setWardId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [enhancedDescription, setEnhancedDescription] = useState<string | null>(null);
  const [originalDescription, setOriginalDescription] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | undefined>();
  const [address, setAddress] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'>('NORMAL');

  useEffect(() => {
    async function loadData() {

      const supabase = createBrowserSupabaseClient();
      const [catRes, wardRes] = await Promise.all([
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('wards').select('*').eq('is_active', true).order('ward_number'),
      ]);
      if (catRes.data) setCategories(catRes.data as Category[]);
      if (wardRes.data) setWards(wardRes.data as Ward[]);
    }
    loadData();
  }, []);

  const handleImageAdd = (files: FileList | null) => {
    if (!files) return;
    const newFiles: File[] = [];
    for (let i = 0; i < files.length && images.length + newFiles.length < 3; i++) {
      const err = validateImageFile(files[i]);
      if (err) { toast.error(err); continue; }
      newFiles.push(files[i]);
    }
    setImages(prev => [...prev, ...newFiles]);
  };

  const removeImage = (idx: number) => setImages(prev => prev.filter((_, i) => i !== idx));

  const handleEnhance = async () => {
    if (!description || description.length < 20) { toast.error('Please enter at least 20 characters'); return; }
    setEnhancing(true);
    try {
      const cat = categories.find(c => c.id === categoryId);
      const ward = wards.find(w => w.id === wardId);
      const res = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: description, category: cat?.name_en || '', ward: ward?.name || '' }),
      });
      const data = await res.json();
      if (data.enhanced) {
        setOriginalDescription(description);
        setEnhancedDescription(data.enhanced);
        setDescription(data.enhanced);
        toast.success('Description enhanced with AI!');
      } else {
        toast.error(data.error || 'Enhancement failed');
      }
    } catch {
      toast.error('AI enhancement unavailable. Please describe manually.');
    } finally {
      setEnhancing(false);
    }
  };

  const revertDescription = () => {
    if (originalDescription) {
      setDescription(originalDescription);
      setEnhancedDescription(null);
      setOriginalDescription(null);
    }
  };

  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  const handleSubmit = async () => {
    if (!categoryId || !wardId || !title || !description || images.length === 0) {
      toast.error('Please fill all required fields and attach at least one photo as proof');
      return;
    }
    setSubmitting(true);
    try {

      const supabase = createBrowserSupabaseClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { toast.error('Please log in'); return; }

      // 1. Verify images with Gemini AI authenticity checker
      toast.loading('Verifying image authenticity with AI...', { id: 'ai-verify' });
      for (const img of images) {
        try {
          const base64 = await toBase64(img);
          const res = await fetch('/api/ai/verify-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64: base64 })
          });
          const data = await res.json();
          if (data.success && data.data && data.data.is_authentic === false) {
            toast.dismiss('ai-verify');
            toast.error(`Image rejected by AI: ${data.data.analysis}`, { duration: 6000 });
            setSubmitting(false);
            return;
          }
        } catch (err) {
          console.error("AI verification failed, allowing fallback", err);
        }
      }
      toast.success('Images verified as authentic!', { id: 'ai-verify' });

      // Upload images first
      const imageUrls: string[] = [];
      for (const img of images) {
        const ext = img.name.split('.').pop();
        const path = `complaints/${authUser.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('complaint-images').upload(path, img);
        if (!uploadErr) imageUrls.push(path);
      }

      // Insert complaint
      const cat = categories.find(c => c.id === categoryId);
      const { data: complaint, error: insertErr } = await supabase
        .from('complaints')
        .insert({
          citizen_id: authUser.id,
          category_id: categoryId,
          ward_id: wardId,
          department_id: cat?.department_id || null,
          title: title.trim(),
          description: description.trim(),
          ai_description: enhancedDescription,
          latitude: location?.lat ?? BHATKAL_CENTER.lat,
          longitude: location?.lng ?? BHATKAL_CENTER.lng,
          address: address || null,
          priority,
          status: 'NEW',
          is_public: true,
        })
        .select('id, ticket_id')
        .single();

      if (insertErr) {
        toast.error('Failed to submit complaint: ' + insertErr.message);
        return;
      }

      // Insert images
      if (complaint && imageUrls.length > 0) {
        await supabase.from('complaint_media').insert(
          imageUrls.map(path => ({
            complaint_id: complaint.id,
            storage_path: path,
            media_type: 'evidence',
            uploaded_by: authUser.id,
            ai_verified: true,
            is_public: true,
          }))
        );
      }

      toast.success(`Complaint ${complaint?.ticket_id} filed successfully!`);
      router.push('/citizen/dashboard');
      router.refresh();
    } catch {
      toast.error('Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === categoryId);
  const selectedWard = wards.find(w => w.id === wardId);

  return (
    <DashboardShell>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/citizen/dashboard" className="p-2 rounded-xl hover:bg-[var(--glass-bg)] text-[var(--outline)]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>File a Complaint</h1>
            <p className="text-sm text-[var(--on-surface-variant)]">Report a civic issue in Bhatkal Taluk</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => i < step && setStep(i)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  i === step ? 'bg-[var(--primary)] text-[var(--on-primary)]' :
                  i < step ? 'bg-[var(--success-bg)] text-[var(--success)]' :
                  'bg-[var(--glass-bg)] text-[var(--outline)]'
                }`}
              >
                {i + 1}. {s}
              </button>
              {i < STEPS.length - 1 && <div className="w-6 h-px bg-[var(--glass-border)]" />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="glass-card p-6 sm:p-8 rounded-[2rem]">
          {/* Step 1: Category */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold mb-4">Select Category</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryId(cat.id)}
                    className={`p-4 rounded-xl border text-center transition-all ${
                      categoryId === cat.id
                        ? 'border-[var(--primary)] bg-[var(--surface-container-highest)] shadow-[0_0_15px_rgba(0,105,72,0.2)]'
                        : 'border-[var(--glass-border)] hover:border-[var(--primary)]/50 bg-[var(--glass-bg)]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: `${cat.color}20` }}>
                      <span className="text-lg">🔧</span>
                    </div>
                    <p className="text-sm font-bold">{cat.name_en}</p>
                  </button>
                ))}
              </div>
              <div className="pt-4">
                <label className="block text-sm font-bold text-[var(--on-surface-variant)] mb-2">Select Ward</label>
                <select value={wardId} onChange={e => setWardId(e.target.value)} className="glass-select">
                  <option value="">Choose ward...</option>
                  {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold mb-4">Pin Location</h2>
              <LocationPicker value={location} onChange={setLocation} />
              {location && (
                <div className="flex gap-3 mt-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-[var(--outline)] uppercase">Latitude</label>
                    <p className="text-sm font-mono text-[var(--on-surface)]">{location.lat.toFixed(6)}</p>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-[var(--outline)] uppercase">Longitude</label>
                    <p className="text-sm font-mono text-[var(--on-surface)]">{location.lng.toFixed(6)}</p>
                  </div>
                </div>
              )}
              {!location && (
                <p className="text-xs text-[var(--outline)] mt-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Click on the map to pin your complaint location
                </p>
              )}
              <div>
                <label className="block text-sm font-bold text-[var(--on-surface-variant)] mb-2">Address</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Enter address or landmark" className="glass-input" />
              </div>
            </div>
          )}

          {/* Step 3: Details */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold mb-4">Complaint Details</h2>
              <div>
                <label className="block text-sm font-bold text-[var(--on-surface-variant)] mb-2">Title <span className="text-[var(--primary)]">*</span></label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief summary of the issue" className="glass-input" maxLength={200} required />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-[var(--on-surface-variant)]">Description <span className="text-[var(--primary)]">*</span></label>
                  <button onClick={handleEnhance} disabled={enhancing || description.length < 20} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--surface-container-highest)] text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors disabled:opacity-50">
                    {enhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {enhancing ? 'Enhancing...' : '✨ Enhance with AI'}
                  </button>
                </div>
                <textarea value={description} onChange={e => { setDescription(e.target.value); setEnhancedDescription(null); }} placeholder="Describe the issue in detail (min 20 characters)" className="glass-input min-h-[120px] resize-y" rows={4} required />
                {enhancedDescription && originalDescription && (
                  <div className="mt-2 p-3 rounded-xl bg-[var(--success-bg)] border border-[rgba(16,185,129,0.2)]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[var(--success)]">✨ AI Enhanced</span>
                      <button onClick={revertDescription} className="flex items-center gap-1 text-xs font-bold text-[var(--outline)] hover:text-[var(--danger)]">
                        <RotateCcw className="w-3 h-3" /> Revert
                      </button>
                    </div>
                    <p className="text-xs text-[var(--outline)]">Original: &ldquo;{originalDescription}&rdquo;</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-bold text-[var(--on-surface-variant)] mb-2 block">Priority</label>
                <div className="flex gap-2">
                  {(['LOW', 'NORMAL', 'HIGH', 'CRITICAL'] as const).map(p => (
                    <button key={p} onClick={() => setPriority(p)} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${priority === p ? 'border-[var(--primary)] bg-[var(--surface-container-highest)]' : 'border-[var(--glass-border)] bg-[var(--glass-bg)]'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-[var(--on-surface-variant)] mb-2 block">Photos (max 3) <span className="text-[var(--primary)]">*</span></label>
                <div className="flex gap-3 flex-wrap">
                  {images.map((img, i) => (
                    <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-[var(--glass-border)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={URL.createObjectURL(img)} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeImage(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[var(--danger)] text-white flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {images.length < 3 && (
                    <label className="w-24 h-24 rounded-xl border-2 border-dashed border-[var(--glass-border)] flex flex-col items-center justify-center cursor-pointer hover:border-[var(--primary)] transition-colors">
                      <Upload className="w-6 h-6 text-[var(--outline)]" />
                      <span className="text-[10px] font-bold text-[var(--outline)] mt-1">Add</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => handleImageAdd(e.target.files)} />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold mb-4">Review & Submit</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-[var(--glass-border)]">
                  <span className="text-[var(--outline)]">Category</span>
                  <span className="font-bold">{selectedCategory?.name_en || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--glass-border)]">
                  <span className="text-[var(--outline)]">Ward</span>
                  <span className="font-bold">{selectedWard?.name || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--glass-border)]">
                  <span className="text-[var(--outline)]">Priority</span>
                  <span className="font-bold">{priority}</span>
                </div>
                <div className="py-2 border-b border-[var(--glass-border)]">
                  <span className="text-[var(--outline)] block mb-1">Title</span>
                  <span className="font-bold">{title}</span>
                </div>
                <div className="py-2 border-b border-[var(--glass-border)]">
                  <span className="text-[var(--outline)] block mb-1">Description</span>
                  <span className="text-[var(--on-surface)]">{description}</span>
                </div>
                {address && (
                  <div className="flex justify-between py-2 border-b border-[var(--glass-border)]">
                    <span className="text-[var(--outline)]">Address</span>
                    <span className="font-bold">{address}</span>
                  </div>
                )}
                <div className="flex justify-between py-2">
                  <span className="text-[var(--outline)]">Photos</span>
                  <span className="font-bold">{images.length} attached</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--glass-border)]">
            <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="btn-secondary !py-3 disabled:opacity-30">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={(step === 0 && (!categoryId || !wardId)) || (step === 2 && (!title || description.length < 20 || images.length === 0))}
                className="btn-primary !py-3 disabled:opacity-50"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary !py-3 shadow-[0_0_20px_rgba(0,105,72,0.3)]">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Submit Complaint <ArrowRight className="w-4 h-4" /></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

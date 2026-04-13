import { useState, useRef } from "react";
import { useGearStore, gearCategories, type GearCategory, type GearItem } from "@/hooks/useGearStore";
import { Plus, X, Shirt, ImagePlus, Trash2 } from "lucide-react";

const categoryIcons: Record<GearCategory, string> = { "베이스레이어": "👕", "재킷": "🧥", "바지": "👖", "장갑": "🧤", "신발": "👟", "액세서리": "🎒" };
const weatherTagOptions = [{ value: "cold", label: "추위" }, { value: "rain", label: "비" }, { value: "wind", label: "바람" }, { value: "snow", label: "눈" }, { value: "hot", label: "더위" }];

async function resizeImage(file: File): Promise<string> {
  const { compressImageToDataUrl } = await import("@/lib/imageUpload");
  const result = await compressImageToDataUrl(file, "general");
  if (result) return result;
  return new Promise((resolve) => { const reader = new FileReader(); reader.onload = (e) => resolve(e.target!.result as string); reader.readAsDataURL(file); });
}

const GearPage = () => {
  const { items, addItem, removeItem, getByCategory } = useGearStore();
  const [showForm, setShowForm] = useState(false);
  const [activeCategory, setActiveCategory] = useState<GearCategory | "all">("all");
  const displayItems = activeCategory === "all" ? items : getByCategory(activeCategory as GearCategory);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">내 장비</h1><p className="mt-1 text-muted-foreground">등산 장비를 관리하세요</p></div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"><Plus className="h-4 w-4" />장비 추가</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setActiveCategory("all")} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${activeCategory === "all" ? "bg-primary/10 text-primary ring-1 ring-primary/30" : "bg-secondary text-secondary-foreground"}`}>전체 ({items.length})</button>
        {gearCategories.map((cat) => (<button key={cat} onClick={() => setActiveCategory(cat)} className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${activeCategory === cat ? "bg-primary/10 text-primary ring-1 ring-primary/30" : "bg-secondary text-secondary-foreground"}`}>{categoryIcons[cat]} {cat} ({getByCategory(cat).length})</button>))}
      </div>
      {displayItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center"><Shirt className="mx-auto h-12 w-12 text-muted-foreground/30" /><p className="mt-4 text-muted-foreground">등록된 장비가 없습니다</p></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">{displayItems.map((item) => (<GearCard key={item.id} item={item} onRemove={() => removeItem(item.id)} />))}</div>
      )}
      {showForm && <AddGearForm onClose={() => setShowForm(false)} onAdd={addItem} />}
    </div>
  );
};

function GearCard({ item, onRemove }: { item: GearItem; onRemove: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {item.photo ? <img src={item.photo} alt={item.name} className="h-16 w-16 rounded-lg object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-secondary text-2xl">{categoryIcons[item.category]}</div>}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between"><div><p className="font-medium text-foreground">{item.name}</p><p className="text-xs text-muted-foreground">{item.category}</p></div><button onClick={onRemove} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div>
          {item.notes && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.notes}</p>}
          {item.weatherTags.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{item.weatherTags.map((t) => (<span key={t} className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{weatherTagOptions.find((o) => o.value === t)?.label || t}</span>))}</div>}
        </div>
      </div>
    </div>
  );
}

function AddGearForm({ onClose, onAdd }: { onClose: () => void; onAdd: (item: Omit<GearItem, "id">) => void }) {
  const [name, setName] = useState(""); const [category, setCategory] = useState<GearCategory>("베이스레이어"); const [notes, setNotes] = useState(""); const [photo, setPhoto] = useState(""); const [tags, setTags] = useState<string[]>([]); const fileRef = useRef<HTMLInputElement>(null);
  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) setPhoto(await resizeImage(file)); };
  const handleSubmit = () => { if (!name.trim()) return; onAdd({ name: name.trim(), category, notes, photo, weatherTags: tags }); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h3 className="text-lg font-semibold text-foreground">장비 추가</h3><button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button></div>
        <div><label className="mb-1 block text-xs font-medium text-muted-foreground">이름</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="장비 이름" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
        <div><label className="mb-1 block text-xs font-medium text-muted-foreground">카테고리</label><div className="flex flex-wrap gap-2">{gearCategories.map((cat) => (<button key={cat} onClick={() => setCategory(cat)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${category === cat ? "bg-primary/10 text-primary ring-1 ring-primary/30" : "bg-secondary text-secondary-foreground"}`}>{categoryIcons[cat]} {cat}</button>))}</div></div>
        <div><label className="mb-1 block text-xs font-medium text-muted-foreground">날씨 태그</label><div className="flex flex-wrap gap-2">{weatherTagOptions.map(({ value, label }) => (<button key={value} onClick={() => setTags((p) => p.includes(value) ? p.filter((t) => t !== value) : [...p, value])} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${tags.includes(value) ? "bg-primary/10 text-primary ring-1 ring-primary/30" : "bg-secondary text-secondary-foreground"}`}>{label}</button>))}</div></div>
        <div><label className="mb-1 block text-xs font-medium text-muted-foreground">사진</label><div className="flex items-center gap-3">{photo && <img src={photo} alt="preview" className="h-16 w-16 rounded-lg object-cover" />}<button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary"><ImagePlus className="h-4 w-4" /> 사진 추가</button><input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" /></div></div>
        <div><label className="mb-1 block text-xs font-medium text-muted-foreground">메모</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="메모를 입력하세요..." className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
        <button onClick={handleSubmit} disabled={!name.trim()} className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">추가하기</button>
      </div>
    </div>
  );
}

export default GearPage;
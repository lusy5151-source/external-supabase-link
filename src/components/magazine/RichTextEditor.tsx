import { useEditor, EditorContent } from "@tiptap/react";
import { Mark, Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { useEffect, useRef, useState } from "react";
import { Bold, ImagePlus, Link2, Mountain as MountainIcon, Type, List as ListIcon, Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MountainPickerModal from "./MountainPickerModal";

// Inline mark for font-size: <span style="font-size:18px">…</span>
const FontSize = Mark.create({
  name: "fontSize",
  addOptions() { return {}; },
  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).style?.fontSize || null,
        renderHTML: (attrs) => (attrs.size ? { style: `font-size:${attrs.size}` } : {}),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span", getAttrs: (el) => ((el as HTMLElement).style?.fontSize ? {} : false) }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },
});

// Inline node representing a mountain reference chip
const MountainRefNode = Node.create({
  name: "mountainRef",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      mountainId: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-mountain-id"),
        renderHTML: (attrs) => (attrs.mountainId ? { "data-mountain-id": String(attrs.mountainId) } : {}),
      },
      name: {
        default: "",
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-name") || "",
        renderHTML: (attrs) => ({ "data-name": attrs.name || "" }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-mountain-id]" }];
  },
  renderHTML({ HTMLAttributes }) {
    const name = HTMLAttributes["data-name"] || "산";
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: "mountain-ref-inline",
        style:
          "display:inline-block;padding:2px 8px;border-radius:12px;background:#EAF3DE;color:#3B6D11;font-weight:500;font-size:12px;margin:0 2px;",
      }),
      `⛰ ${name}`,
    ];
  },
});

async function uploadImageFile(file: File): Promise<string | null> {
  try {
    const { compressImage } = await import("@/lib/imageUpload");
    const compressed = await compressImage(file, "general");
    if (!compressed) return null;
    const path = `inline/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const { error } = await supabase.storage.from("magazine-images").upload(path, compressed, { contentType: "image/jpeg" });
    if (error) throw error;
    return supabase.storage.from("magazine-images").getPublicUrl(path).data.publicUrl;
  } catch (e: any) {
    toast.error(e?.message || "이미지 업로드 실패");
    return null;
  }
}

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const TB_BTN: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 28,
  minWidth: 28,
  padding: "0 6px",
  fontSize: 12,
  fontWeight: 600,
  background: "transparent",
  border: "0.5px solid #EAE7DD",
  borderRadius: 6,
  color: "hsl(var(--foreground))",
  cursor: "pointer",
};
const TB_BTN_ACTIVE: React.CSSProperties = { ...TB_BTN, background: "#EAF3DE", color: "#3B6D11", borderColor: "#639922" };

const RichTextEditor = ({ value, onChange, placeholder, minHeight = 160 }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Image.configure({ inline: false, allowBase64: false, HTMLAttributes: { style: "max-width:100%;border-radius:8px;margin:8px 0;" } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      FontSize,
      MountainRefNode,
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "tiptap-content",
        style: `min-height:${minHeight}px;padding:10px 12px;outline:none;font-size:14px;line-height:1.7;color:hsl(var(--foreground));`,
      },
    },
  });

  // Sync external value changes (e.g. when loading existing post)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value && value !== current) {
      try {
        (editor.commands as any).setContent(value, false);
      } catch {
        editor.commands.setContent(value);
      }
    }
  }, [value, editor]);

  if (!editor) return null;

  const setFontSize = (size: string | null) => {
    if (!size) {
      (editor.chain().focus() as any).unsetMark("fontSize").run();
    } else {
      (editor.chain().focus() as any).setMark("fontSize", { size }).run();
    }
  };

  const onPickImage = async (file: File) => {
    const url = await uploadImageFile(file);
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div style={{ border: "0.5px solid #EAE7DD", borderRadius: 8, background: "hsl(var(--background))" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: 6, borderBottom: "0.5px solid #EAE7DD" }}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          style={editor.isActive("bold") ? TB_BTN_ACTIVE : TB_BTN}
          title="굵게"
        >
          <Bold style={{ width: 12, height: 12 }} />
        </button>

        <select
          onChange={(e) => setFontSize(e.target.value || null)}
          value={editor.getAttributes("fontSize").size || ""}
          style={{ ...TB_BTN, paddingRight: 4 }}
          title="글자 크기"
        >
          <option value="">기본</option>
          <option value="12px">작게</option>
          <option value="14px">보통</option>
          <option value="18px">크게</option>
          <option value="22px">아주 크게</option>
        </select>

        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} style={editor.isActive("heading", { level: 2 }) ? TB_BTN_ACTIVE : TB_BTN} title="소제목">H2</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} style={editor.isActive("heading", { level: 3 }) ? TB_BTN_ACTIVE : TB_BTN} title="소제목 작게">H3</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} style={editor.isActive("bulletList") ? TB_BTN_ACTIVE : TB_BTN} title="목록"><ListIcon style={{ width: 12, height: 12 }} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} style={editor.isActive("blockquote") ? TB_BTN_ACTIVE : TB_BTN} title="인용"><Quote style={{ width: 12, height: 12 }} /></button>

        <button
          type="button"
          onClick={() => {
            const url = window.prompt("링크 URL", "https://");
            if (!url) return;
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }}
          style={editor.isActive("link") ? TB_BTN_ACTIVE : TB_BTN}
          title="링크"
        >
          <Link2 style={{ width: 12, height: 12 }} />
        </button>

        <button type="button" onClick={() => fileRef.current?.click()} style={TB_BTN} title="사진 삽입">
          <ImagePlus style={{ width: 12, height: 12 }} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPickImage(f);
            e.target.value = "";
          }}
        />

        <button type="button" onClick={() => setPickerOpen(true)} style={TB_BTN} title="산 정보 삽입">
          <MountainIcon style={{ width: 12, height: 12 }} />
          <span style={{ marginLeft: 4 }}>산</span>
        </button>
      </div>

      <EditorContent editor={editor} />

      {!value && placeholder && (
        <div style={{ marginTop: -minHeight - 12, paddingLeft: 12, color: "#aaa", fontSize: 14, pointerEvents: "none", height: 20 }}>
          {/* simple placeholder hint */}
        </div>
      )}

      <MountainPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(m) => {
          editor
            .chain()
            .focus()
            .insertContent({ type: "mountainRef", attrs: { mountainId: m.id, name: m.name } })
            .insertContent(" ")
            .run();
        }}
      />
    </div>
  );
};

export default RichTextEditor;

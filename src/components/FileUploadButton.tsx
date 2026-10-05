import { Paperclip, Check } from "lucide-react";

interface Props {
  file: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  label?: string;
  id: string;
}

// Native <input type="file"> renders an OS-styled "Choose File" button that
// can't be restyled directly -- this hides it (not display:none, so it's
// still keyboard/screen-reader reachable) behind a normal styled label.
export default function FileUploadButton({ file, onChange, accept, label = "Upload PDF", id }: Props) {
  return (
    <label htmlFor={id} className={`file-upload-btn${file ? " file-upload-btn-filled" : ""}`}>
      {file ? <Check size={14} /> : <Paperclip size={14} />}
      <span>{file ? file.name : label}</span>
      <input
        id={id}
        type="file"
        accept={accept}
        className="file-upload-btn-input"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}

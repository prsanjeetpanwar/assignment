"use client";
import { useRef } from "react";

// shadcn/ui
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// lucide-react
import { Paperclip } from "lucide-react";

interface Props {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export default function FileUploadButton({ onFileSelect, disabled }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <TooltipProvider>
      <input
  ref={ref}
  type="file"
  aria-hidden="true"
  tabIndex={-1}
  accept="image/*,.pdf,.doc,.docx,.txt,.zip"
  className="hidden"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      e.target.value = "";
    }
  }}
/>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            onClick={() => ref.current?.click()}
            className="w-9 h-9 rounded-xl flex-shrink-0 bg-secondary border-border text-muted-foreground hover:bg-[#5B4FD4]/10 hover:text-[#5B4FD4] hover:border-[#5B4FD4]/20 transition-all duration-150"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Attach file</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
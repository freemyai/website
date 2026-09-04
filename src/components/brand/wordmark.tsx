import { LogoMark } from "./logo";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight">
        freemy
        <span className="text-muted-foreground ml-1.5 align-middle font-mono text-[10px] font-medium tracking-[0.2em]">
          AI
        </span>
      </span>
    </span>
  );
}

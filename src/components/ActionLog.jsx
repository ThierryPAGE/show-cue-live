import React from "react";

export default function ActionLog({ logs }) {
  return (
    <div className="bg-zinc-900/80 border border-zinc-700/50 rounded-lg p-3 mt-4">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2">Log</div>
      <div className="space-y-1 font-mono text-xs max-h-24 overflow-y-auto">
        {logs.length === 0 && <div className="text-zinc-600">No actions yet</div>}
        {logs.map((log, i) => (
          <div key={i} className={`flex items-center gap-2 ${
            log.level === "error" ? "text-red-400" :
            log.level === "warn" ? "text-amber-400" :
            "text-zinc-400"
          }`}>
            <span className="text-zinc-600">{log.time}</span>
            <span>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
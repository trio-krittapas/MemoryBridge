import { Loader2, Heart } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#fcf9f2] flex flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center shadow">
          <Heart className="h-5 w-5 text-white fill-white" />
        </div>
        <span className="text-2xl font-bold text-amber-900">MemoryBridge</span>
      </div>
      <Loader2 className="h-10 w-10 text-amber-400 animate-spin" />
    </div>
  );
}

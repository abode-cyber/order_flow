import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { MapPin, ArrowRight, X, Map } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'wouter';

type BranchType = 'taif_okaz' | 'taif_east_ring';

const BRANCH_LINKS = {
  taif_okaz: 'https://maps.app.goo.gl/tDuWBrnBc27WJgiSA?g_st=ipc',
  taif_east_ring: 'https://maps.app.goo.gl/eWtxLwmejQPABrAt5?g_st=ipc'
};

export default function BranchSelection() {
  const setBranch = useStore((state) => state.setBranch);
  const [, setLocation] = useLocation();
  const [selectedBranchForModal, setSelectedBranchForModal] = useState<BranchType | null>(null);

  const handleBranchClick = (branch: BranchType) => {
    setSelectedBranchForModal(branch);
  };

  const handleConfirmLocation = () => {
    if (selectedBranchForModal) {
      setBranch(selectedBranchForModal);
      setLocation('/menu');
    }
  };

  const handleOpenMap = () => {
    if (selectedBranchForModal) {
      window.open(BRANCH_LINKS[selectedBranchForModal], '_blank');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* خلفية زخرفية */}
      <div className="absolute inset-0 bg-[url('/images/bg-pattern.png')] opacity-10 pointer-events-none" />
      
      <div className="z-10 w-full max-w-md flex flex-col gap-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black text-primary tracking-tighter text-glow">THE HAT</h1>
          <p className="text-muted-foreground text-lg">اختر الفرع الأقرب إليك</p>
        </div>

        <div className="grid gap-4">
          <button
            onClick={() => handleBranchClick('taif_okaz')}
            className="group relative overflow-hidden bg-card border border-border p-6 text-left hover:border-primary transition-all duration-300"
          >
            <div className="absolute inset-0 bg-primary/5 translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-secondary p-3 rounded-none group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xl">فرع شارع عكاظ</h3>
                  <p className="text-sm text-muted-foreground">الطائف - حي عكاظ</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </div>
          </button>

          <button
            onClick={() => handleBranchClick('taif_east_ring')}
            className="group relative overflow-hidden bg-card border border-border p-6 text-left hover:border-primary transition-all duration-300"
          >
            <div className="absolute inset-0 bg-primary/5 translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-secondary p-3 rounded-none group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xl">فرع الحلقة الشرقية</h3>
                  <p className="text-sm text-muted-foreground">الطائف - الحلقة الشرقية</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </div>
          </button>
        </div>

        <div className="text-center text-xs text-muted-foreground/50 mt-8">
          © 2025 THE HAT RESTAURANT
        </div>
      </div>

      {/* Modal */}
      {selectedBranchForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-primary/20 w-full max-w-sm p-6 relative shadow-2xl shadow-primary/10 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedBranchForModal(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center space-y-6">
              <div className="mx-auto bg-primary/10 w-16 h-16 flex items-center justify-center rounded-full">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold">تأكيد الموقع</h3>
                <p className="text-muted-foreground text-sm">
                  هل تعرف موقع الفرع أم تريد فتح الخريطة؟
                </p>
              </div>

              <div className="grid gap-3">
                <button
                  onClick={handleOpenMap}
                  className="w-full flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground p-3 font-bold transition-colors border border-border"
                >
                  <Map className="w-4 h-4" />
                  خذني للموقع (Google Maps)
                </button>
                
                <button
                  onClick={handleConfirmLocation}
                  className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground p-3 font-bold transition-colors clip-diagonal"
                >
                  أعرف الموقع، كمل الطلب
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

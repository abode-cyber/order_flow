import { db } from '@/lib/firebase';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ArrowRight, CheckCircle2, Minus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

export default function CheckoutPage() {
  const { cart, updateQuantity, removeFromCart, userInfo, setUserInfo, clearCart, selectedBranch } = useStore();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    carType: '',
    carColor: ''
  });

  // Load saved user info
  useEffect(() => {
    if (userInfo) {
      setFormData(userInfo);
    }
  }, [userInfo]);

  // Redirect if cart is empty
  useEffect(() => {
    if (cart.length === 0) {
      setLocation('/menu');
    }
  }, [cart, setLocation]);

  const totalPrice = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    
    setIsSubmitting(true);

    try {
      // Save user info locally
      setUserInfo(formData);

      // Create Order Object
      const orderData = {
        customerName: formData.name,
        customerPhone: formData.phone,
        carType: formData.carType,
        carColor: formData.carColor,
        branch: selectedBranch,
        items: cart,
        totalPrice: totalPrice,
        status: 'pending', // pending -> preparing -> ready -> completed
        createdAt: serverTimestamp(),
        orderNumber: Math.floor(1000 + Math.random() * 9000) // Simple random order number
      };

      // Send to Firestore
      const docRef = await addDoc(collection(db, 'orders'), orderData);

      // Clear cart and redirect to invoice
      clearCart();
      setLocation(`/invoice/${docRef.id}`);
      
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <header className="bg-card border-b border-border p-4 sticky top-0 z-40">
        <div className="container flex items-center gap-4">
          <button 
            onClick={() => setLocation('/menu')}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">مراجعة الطلب</h1>
        </div>
      </header>

      <main className="container py-6 grid gap-8 lg:grid-cols-2">
        {/* Order Summary */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <span className="bg-primary/20 p-1 rounded text-xs">1</span>
            محتويات السلة
          </h2>
          
          <div className="space-y-4">
            {cart.map((item) => (
              <div key={item.id} className="flex gap-4 bg-card p-4 border border-border">
                {item.image && (
                  <img src={item.image} alt={item.name} className="w-20 h-20 object-cover bg-secondary" />
                )}
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold">{item.name}</h3>
                    <span className="font-mono text-primary">{item.price * item.quantity} ر.س</span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3 bg-secondary p-1">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 hover:text-destructive transition-colors"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-mono font-bold w-4 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 hover:text-primary transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card p-4 border border-border space-y-2">
            <div className="flex justify-between text-lg font-bold">
              <span>المجموع الكلي</span>
              <span className="text-primary font-mono">{totalPrice} ر.س</span>
            </div>
            <p className="text-xs text-muted-foreground">الأسعار شاملة ضريبة القيمة المضافة</p>
          </div>
        </div>

        {/* Customer Info Form */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <span className="bg-primary/20 p-1 rounded text-xs">2</span>
            بيانات الاستلام
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">الاسم</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-input border-transparent focus:border-primary p-3 outline-none transition-colors"
                placeholder="الاسم الكريم"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">رقم الجوال</label>
              <input
                required
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full bg-input border-transparent focus:border-primary p-3 outline-none transition-colors text-right"
                placeholder="05xxxxxxxx"
                dir="ltr"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">نوع السيارة</label>
                <input
                  required
                  type="text"
                  value={formData.carType}
                  onChange={(e) => setFormData({...formData, carType: e.target.value})}
                  className="w-full bg-input border-transparent focus:border-primary p-3 outline-none transition-colors"
                  placeholder="مثال: كامري"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">لون السيارة</label>
                <input
                  required
                  type="text"
                  value={formData.carColor}
                  onChange={(e) => setFormData({...formData, carColor: e.target.value})}
                  className="w-full bg-input border-transparent focus:border-primary p-3 outline-none transition-colors"
                  placeholder="مثال: أبيض"
                />
              </div>
            </div>

            <div className="bg-secondary/50 p-4 border border-primary/20 mt-6">
              <h3 className="font-bold mb-2">طريقة الدفع</h3>
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="w-5 h-5" />
                <span>الدفع عند الاستلام (كاش / شبكة)</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full bg-primary text-primary-foreground font-bold text-xl p-4 mt-8 clip-diagonal",
                "hover:brightness-110 active:scale-95 transition-all",
                isSubmitting && "opacity-50 cursor-not-allowed"
              )}
            >
              {isSubmitting ? 'جاري الإرسال...' : `تأكيد الطلب (${totalPrice} ر.س)`}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

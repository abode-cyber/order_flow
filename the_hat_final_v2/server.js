const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// يا هلا والله، هنا بداية السيرفر
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // عشان ما يسوي مشاكل مع أي دومين
        methods: ["GET", "POST"]
    }
});

// هنا نقول للسيرفر وين يلقى ملفات الموقع (html, css, صور)
app.use(express.static(path.join(__dirname, 'public')));

// ✅ حل مشكلة التحديث (Page Not Found): أي رابط يطلبه المستخدم نرجعه للصفحة الرئيسية
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// نخزن الطلبات هنا مؤقتاً
let orders = [];
// الطلبات المؤرشفة (عشان ما تضيع بس ما تزحم الشاشة)
let archivedOrders = [];
// الطلبات المكتملة (تم التسليم للعميل)
let completedOrders = [];
// الطلبات غير المسلمة (العميل ما استلم)
let undeliveredOrders = [];

// عداد للطلبات عشان نحل مشكلة رقم الطلب المكرر
let orderCounter = 1000; // نبدأ من 1000 عشان الأرقام تكون واضحة

// أول ما يشبك واحد جديد (سواء زبون أو كاشير)
io.on('connection', (socket) => {
    console.log('واحد شبك معنا: ' + socket.id);

    // أول ما يدخل، نعطيه كل الطلبات النشطة عشان يحدث القائمة عنده
    socket.emit('initial-orders', orders);
    
    // نرسل الطلبات المكتملة وغير المسلمة للمطبخ
    socket.emit('completed-orders', completedOrders);
    socket.emit('undelivered-orders', undeliveredOrders);

    // إذا الزبون أرسل طلب جديد
    socket.on('new-order', (orderData) => {
        console.log('🔔 جانا طلب جديد!', orderData.customerName);
        
        // نضيف الوقت وتاريخ الطلب
        const currentCounter = orderCounter++;
        const newOrder = {
            ...orderData,
            id: 'ORD-' + currentCounter, // رقم طلب بسيط وواضح (ORD-1000, ORD-1001, ...)
            orderNumber: currentCounter, // رقم الطلب للعرض
            status: 'pending', // الحالة المبدئية: جاري الانتظار
            timestamp: new Date().toISOString(),
            orderTime: Date.now() // وقت الطلب عشان نحسب الـ 3 دقايق
        };

        orders.push(newOrder);

        // نرسل الطلب الجديد لكل المتصلين (عشان يطلع عند الكاشير والزبون)
        io.emit('order-update', orders);
        
        // نرسل تأكيد خاص للزبون اللي طلب عشان نوقف اللودينق عنده
        socket.emit('order-confirmed', newOrder.id);
    });

    // إذا الكاشير غير حالة الطلب (مثلاً خلاه "جاهز")
    socket.on('update-status', (data) => {
        const { orderId, status } = data;
        console.log(`تحديث حالة الطلب ${orderId} إلى ${status}`);

        // ندور الطلب ونحدث حالته
        const orderIndex = orders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            
            if (status === 'archived') {
                // ننقله للأرشيف
                archivedOrders.push(orders[orderIndex]);
                // نحذفه من القائمة النشطة
                orders.splice(orderIndex, 1);
            } else if (status === 'completed') {
                // ننقله للطلبات المكتملة
                const completedOrder = { ...orders[orderIndex], status: 'completed' };
                completedOrders.push(completedOrder);
                // نحذفه من القائمة النشطة
                orders.splice(orderIndex, 1);
                // نبلغ الكل بالتحديث
                io.emit('order-update', orders);
                io.emit('completed-orders', completedOrders);
                // نبلغ الزبون بالتسليم
                io.emit('order-status-update', completedOrder);
            } else if (status === 'undelivered') {
                // ننقله للطلبات غير المسلمة
                const undeliveredOrder = { ...orders[orderIndex], status: 'undelivered' };
                undeliveredOrders.push(undeliveredOrder);
                // نحذفه من القائمة النشطة
                orders.splice(orderIndex, 1);
                // نبلغ الكل بالتحديث
                io.emit('order-update', orders);
                io.emit('undelivered-orders', undeliveredOrders);
                // نبلغ الزبون
                io.emit('order-status-update', undeliveredOrder);
            } else {
                orders[orderIndex].status = status;
                // نبلغ الكل بالتحديث (القائمة الجديدة)
                io.emit('order-update', orders);
                // نبلغ الزبون صاحب الطلب
                io.emit('order-status-update', orders[orderIndex]);
            }
        }
    });

    // تصفية الطلبات المكتملة
    socket.on('clear-completed', () => {
        console.log('تصفية الطلبات المكتملة');
        completedOrders = [];
        io.emit('completed-orders', completedOrders);
    });

    // تصفية الطلبات غير المسلمة
    socket.on('clear-undelivered', () => {
        console.log('تصفية الطلبات غير المسلمة');
        undeliveredOrders = [];
        io.emit('undelivered-orders', undeliveredOrders);
    });

    // طلب حالة خاصة لطلب معين (عشان لو الزبون حدث الصفحة)
    socket.on('request-order-status', (orderId) => {
        const order = orders.find(o => o.id === orderId);
        if (order) {
            socket.emit('order-status-update', order);
        } else {
            // يمكن يكون مؤرشف؟
            const archived = archivedOrders.find(o => o.id === orderId);
            if (archived) {
                socket.emit('order-status-update', archived);
            } else {
                // يمكن يكون في الطلبات المكتملة؟
                const completed = completedOrders.find(o => o.id === orderId);
                if (completed) {
                    socket.emit('order-status-update', completed);
                } else {
                    // يمكن يكون في الطلبات غير المسلمة؟
                    const undelivered = undeliveredOrders.find(o => o.id === orderId);
                    if (undelivered) {
                        socket.emit('order-status-update', undelivered);
                    }
                }
            }
        }
    });

    // حذف نهائي (لو بالغلط)
    socket.on('delete-order', (orderId) => {
        console.log(`حذف الطلب ${orderId}`);
        orders = orders.filter(o => o.id !== orderId);
        io.emit('order-update', orders);
    });

    // حذف/تعديل الطلب من قبل الزبون (خلال 3 دقايق)
    socket.on('cancel-order', (orderId) => {
        console.log(`الزبون ألغى الطلب ${orderId}`);
        orders = orders.filter(o => o.id !== orderId);
        completedOrders = completedOrders.filter(o => o.id !== orderId);
        undeliveredOrders = undeliveredOrders.filter(o => o.id !== orderId);
        io.emit('order-update', orders);
        io.emit('completed-orders', completedOrders);
        io.emit('undelivered-orders', undeliveredOrders);
    });

    socket.on('disconnect', () => {
        console.log('واحد طلع: ' + socket.id);
    });
});

// المنفذ اللي بيشتغل عليه السيرفر
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`السيرفر شغال يا وحش على البورت ${PORT}`);
});

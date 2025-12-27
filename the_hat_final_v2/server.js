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

// نخزن الطلبات هنا مؤقتاً
let orders = [];
// الطلبات المؤرشفة (عشان ما تضيع بس ما تزحم الشاشة)
let archivedOrders = [];

// أول ما يشبك واحد جديد (سواء زبون أو كاشير)
io.on('connection', (socket) => {
    console.log('واحد شبك معنا: ' + socket.id);

    // أول ما يدخل، نعطيه كل الطلبات النشطة عشان يحدث القائمة عنده
    socket.emit('initial-orders', orders);

    // إذا الزبون أرسل طلب جديد
    socket.on('new-order', (orderData) => {
        console.log('🔔 جانا طلب جديد!', orderData.customerName);
        
        // نضيف الوقت وتاريخ الطلب
        const newOrder = {
            ...orderData,
            id: Date.now().toString(), // رقم طلب مميز بناءً على الوقت
            status: 'pending', // الحالة المبدئية: جاري الانتظار
            timestamp: new Date().toISOString()
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
            orders[orderIndex].status = status;
            // نبلغ الكل بالتحديث
            io.emit('order-update', orders);
        }
    });

    // أرشفة الطلب (إخفاؤه من القائمة الرئيسية للكاشير)
    socket.on('archive-order', (orderId) => {
        console.log(`أرشفة الطلب ${orderId}`);
        const orderIndex = orders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            // ننقله للأرشيف
            archivedOrders.push(orders[orderIndex]);
            // نحذفه من القائمة النشطة
            orders.splice(orderIndex, 1);
            // نحدث القائمة عند الكل
            io.emit('order-update', orders);
        }
    });

    // حذف نهائي (لو بالغلط)
    socket.on('delete-order', (orderId) => {
        console.log(`حذف الطلب ${orderId}`);
        orders = orders.filter(o => o.id !== orderId);
        io.emit('order-update', orders);
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

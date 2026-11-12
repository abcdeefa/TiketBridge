require('dotenv').config();

const express = require('express');
const cors = require('cors');
const db = require('./config/db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const eventRoutes = require('./routes/events');
const seatRoutes = require('./routes/seats');
const eventGroupRoutes = require('./routes/eventGroups');
const reservationRoutes = require('./routes/reservations');
const practiceSessionRoutes = require('./routes/practiceSessions');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/seats', seatRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/event-groups', eventGroupRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/practice-sessions', practiceSessionRoutes);

app.get('/', (req, res) => {
    res.send('TiketBridge Server 실행 중!');
});



const authMiddleware = require('./middleware/authMiddleware');

app.get('/api/auth/me', authMiddleware, (req, res) => {
    res.json({
        message: '인증 성공!',
        user: req.user
    });
});
app.listen(process.env.PORT, () => {
    console.log(`서버 실행 중: http://localhost:${process.env.PORT}`);
});
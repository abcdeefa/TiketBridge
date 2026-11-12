
const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// 기본 좌석 설정
const seatRows = [4, 6, 8, 10, 12];
const seatPrice = 50000;

// 게임 행사 기본 설정
const groupNames = ['A', 'B', 'C', 'D', 'E', 'F'];
const groupPrice = 50000;
const groupQuantity = 100;

// 업로드 이미지 삭제
const deletePoster = (poster) => {
    if (poster && poster.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '..', poster);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
};

// 행사 전체 조회
router.get('/', (req, res) => {
    const sql = `
        SELECT event_id, title, category, description, poster,
               location, event_date, booking_start, creator_id
        FROM events
        ORDER BY event_date ASC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({
                message: '행사 조회에 실패했습니다.'
            });
        }

        res.json({
            message: '행사 조회 성공!',
            events: results
        });
    });
});

// 행사 등록 및 기본 좌석 / 그룹 생성
router.post('/', authMiddleware, upload.single('poster'), async (req, res) => {
    const {
        title,
        category,
        description,
        location,
        event_date,
        booking_start
    } = req.body;

    const poster = req.file
        ? '/uploads/' + req.file.filename
        : null;

    if (!title || !category || !location || !event_date) {
        deletePoster(poster);

        return res.status(400).json({
            message: '필수 항목을 입력해주세요.'
        });
    }

    const connection = db.promise();

    try {
        await connection.beginTransaction();

        // 행사 등록
        const [result] = await connection.query(`
            INSERT INTO events
            (title, category, description, poster, location,
             event_date, booking_start, creator_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            title,
            category,
            description || null,
            poster,
            location,
            event_date,
            booking_start || null,
            req.user.user_id
        ]);

        const eventId = result.insertId;

        // 게임 행사는 A~F 입장 그룹 생성
        if (category === 'game') {
            const groups = groupNames.map((name) => [
                eventId,
                name,
                groupPrice,
                groupQuantity,
                groupQuantity
            ]);

            await connection.query(`
                INSERT INTO event_groups
                (event_id, group_name, price,
                 total_quantity, remaining_quantity)
                VALUES ?
            `, [groups]);

        } else {
            // 일반 행사는 A~E열 좌석 40석 생성
            const seats = [];

            seatRows.forEach((count, rowIndex) => {
                const row = String.fromCharCode(65 + rowIndex);

                for (let i = 1; i <= count; i++) {
                    seats.push([
                        eventId,
                        '일반석',
                        row,
                        i,
                        seatPrice,
                        'available'
                    ]);
                }
            });

            await connection.query(`
                INSERT INTO seats
                (event_id, section, seat_row, seat_number,
                 price, status)
                VALUES ?
            `, [seats]);
        }

        await connection.commit();

        res.status(201).json({
            message: '행사 및 기본 좌석/그룹 등록 성공!',
            event_id: eventId
        });

    } catch (err) {
        await connection.rollback();

        deletePoster(poster);

        console.log(err);

        res.status(500).json({
            message: '행사 등록에 실패했습니다.'
        });
    }
});

// 행사 수정
router.put('/:id', authMiddleware, upload.single('poster'), (req, res) => {
    const eventId = req.params.id;
    const userId = req.user.user_id;

    const {
        title,
        category,
        description,
        location,
        event_date,
        booking_start
    } = req.body;

    if (!title || !category || !location || !event_date) {
        if (req.file) {
            deletePoster('/uploads/' + req.file.filename);
        }

        return res.status(400).json({
            message: '필수 항목을 입력해주세요.'
        });
    }

    db.query(
        'SELECT poster FROM events WHERE event_id = ? AND creator_id = ?',
        [eventId, userId],
        (err, results) => {
            if (err) {
                if (req.file) {
                    deletePoster('/uploads/' + req.file.filename);
                }

                return res.status(500).json({
                    message: '행사 확인에 실패했습니다.'
                });
            }

            if (results.length === 0) {
                if (req.file) {
                    deletePoster('/uploads/' + req.file.filename);
                }

                return res.status(403).json({
                    message: '수정 권한이 없습니다.'
                });
            }

            const oldPoster = results[0].poster;

            const poster = req.file
                ? '/uploads/' + req.file.filename
                : oldPoster;

            const sql = `
                UPDATE events
                SET title = ?, category = ?, description = ?,
                    poster = ?, location = ?, event_date = ?,
                    booking_start = ?
                WHERE event_id = ? AND creator_id = ?
            `;

            db.query(sql, [
                title,
                category,
                description || null,
                poster,
                location,
                event_date,
                booking_start || null,
                eventId,
                userId
            ], (err) => {
                if (err) {
                    if (req.file) {
                        deletePoster(poster);
                    }

                    return res.status(500).json({
                        message: '행사 수정에 실패했습니다.'
                    });
                }

                if (req.file) {
                    deletePoster(oldPoster);
                }

                res.json({
                    message: '행사 수정 성공!'
                });
            });
        }
    );
});

// 행사 삭제
router.delete('/:id', authMiddleware, async (req, res) => {
    const eventId = req.params.id;
    const userId = req.user.user_id;
    const connection = db.promise();

    try {
        const [events] = await connection.query(
            'SELECT poster FROM events WHERE event_id = ? AND creator_id = ?',
            [eventId, userId]
        );

        if (events.length === 0) {
            return res.status(403).json({
                message: '삭제 권한이 없습니다.'
            });
        }

        await connection.beginTransaction();

        await connection.query(`
            DELETE FROM reservation_seats
            WHERE reservation_id IN (
                SELECT reservation_id
                FROM reservations
                WHERE event_id = ?
            )
        `, [eventId]);

        await connection.query(
            'DELETE FROM reservations WHERE event_id = ?',
            [eventId]
        );

        await connection.query(
            'DELETE FROM practice_sessions WHERE event_id = ?',
            [eventId]
        );

        await connection.query(
            'DELETE FROM seats WHERE event_id = ?',
            [eventId]
        );

        await connection.query(
            'DELETE FROM event_groups WHERE event_id = ?',
            [eventId]
        );

        await connection.query(
            'DELETE FROM events WHERE event_id = ? AND creator_id = ?',
            [eventId, userId]
        );

        await connection.commit();

        deletePoster(events[0].poster);

        res.json({
            message: '행사 삭제 성공!'
        });

    } catch (err) {
        await connection.rollback();

        console.log(err);

        res.status(500).json({
            message: '행사 삭제에 실패했습니다.'
        });
    }
});

// 내가 등록한 행사 조회 (users와 events JOIN)
router.get('/my', authMiddleware, (req, res) => {
    const userId = req.user.user_id;

    const sql = `
        SELECT
            events.event_id,
            events.title,
            events.category,
            events.description,
            events.poster,
            events.location,
            events.event_date,
            events.booking_start,
            events.creator_id
        FROM events
        INNER JOIN users
        ON events.creator_id = users.user_id
        WHERE users.user_id = ?
        ORDER BY events.event_date ASC
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.log(err);

            return res.status(500).json({
                message: '내 행사 조회에 실패했습니다.'
            });
        }

        res.json({
            message: '내 행사 조회 성공!',
            events: results
        });
    });
});

module.exports = router;

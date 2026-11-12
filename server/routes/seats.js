
const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// 행사별 좌석 조회
router.get('/event/:eventId', (req, res) => {
    const eventId = req.params.eventId;

    const sql = `
        SELECT seat_id, event_id, section, seat_row,
               seat_number, price, status
        FROM seats
        WHERE event_id = ?
        ORDER BY section, seat_row, seat_number
    `;

    db.query(sql, [eventId], (err, results) => {
        if (err) {
            console.log('좌석 조회 오류:', err);

            return res.status(500).json({
                message: '좌석 조회에 실패했습니다.'
            });
        }

        res.json({
            message: '좌석 조회 성공!',
            seats: results
        });
    });
});

// 좌석 등록
router.post('/event/:eventId', authMiddleware, (req, res) => {
    const eventId = req.params.eventId;
    const userId = req.user.user_id;

    const { section, seat_row, seat_number, price } = req.body;

    if (!section || !seat_row || !seat_number || price == null) {
        return res.status(400).json({
            message: '필수 항목을 입력해주세요.'
        });
    }

    // 행사 소유자 확인
    db.query(
        'SELECT event_id FROM events WHERE event_id = ? AND creator_id = ?',
        [eventId, userId],
        (err, results) => {
            if (err) {
                return res.status(500).json({
                    message: '행사 확인에 실패했습니다.'
                });
            }

            if (results.length === 0) {
                return res.status(403).json({
                    message: '좌석 등록 권한이 없습니다.'
                });
            }

            const sql = `
                INSERT INTO seats
                (event_id, section, seat_row, seat_number, price, status)
                VALUES (?, ?, ?, ?, ?, 'available')
            `;

            db.query(sql, [
                eventId,
                section,
                seat_row,
                seat_number,
                price
            ], (err, result) => {
                if (err) {
                    return res.status(500).json({
                        message: '좌석 등록에 실패했습니다.'
                    });
                }

                res.status(201).json({
                    message: '좌석 등록 성공!',
                    seat_id: result.insertId
                });
            });
        }
    );
});

// 좌석 수정
router.put('/:id', authMiddleware, (req, res) => {
    const seatId = req.params.id;
    const userId = req.user.user_id;

    const { section, seat_row, seat_number, price, status } = req.body;

    if (!section || !seat_row || !seat_number || price == null || !status) {
        return res.status(400).json({
            message: '필수 항목을 입력해주세요.'
        });
    }

    const sql = `
        UPDATE seats s
        JOIN events e ON s.event_id = e.event_id
        SET s.section = ?, s.seat_row = ?,
            s.seat_number = ?, s.price = ?, s.status = ?
        WHERE s.seat_id = ? AND e.creator_id = ?
    `;

    db.query(sql, [
        section,
        seat_row,
        seat_number,
        price,
        status,
        seatId,
        userId
    ], (err, result) => {
        if (err) {
            return res.status(500).json({
                message: '좌석 수정에 실패했습니다.'
            });
        }

        if (result.affectedRows === 0) {
            return res.status(403).json({
                message: '좌석 수정 권한이 없습니다.'
            });
        }

        res.json({
            message: '좌석 수정 성공!'
        });
    });
});

// 좌석 삭제
router.delete('/:id', authMiddleware, (req, res) => {
    const seatId = req.params.id;
    const userId = req.user.user_id;

    const sql = `
        DELETE s FROM seats s
        JOIN events e ON s.event_id = e.event_id
        WHERE s.seat_id = ? AND e.creator_id = ?
    `;

    db.query(sql, [seatId, userId], (err, result) => {
        if (err) {
            return res.status(500).json({
                message: '좌석 삭제에 실패했습니다.'
            });
        }

        if (result.affectedRows === 0) {
            return res.status(403).json({
                message: '좌석 삭제 권한이 없습니다.'
            });
        }

        res.json({
            message: '좌석 삭제 성공!'
        });
    });
});

module.exports = router;

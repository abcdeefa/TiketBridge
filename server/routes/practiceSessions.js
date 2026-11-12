
const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// 내 연습 기록 조회
router.get('/my', authMiddleware, (req, res) => {
    const userId = req.user.user_id;

    const sql = `
        SELECT p.session_id, p.event_id, e.title,
               p.queue_time, p.seat_time,
               p.total_time, p.result,
               p.selected_seat, p.selected_group,
               p.failure_reason
        FROM practice_sessions p
        JOIN events e ON p.event_id = e.event_id
        WHERE p.user_id = ?
        ORDER BY p.session_id DESC
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({
                message: '연습 기록 조회에 실패했습니다.'
            });
        }

        res.json({
            message: '연습 기록 조회 성공!',
            sessions: results
        });
    });
});

// 연습 기록 저장
router.post('/', authMiddleware, (req, res) => {
    const userId = req.user.user_id;

    const {
        event_id,
        queue_time,
        seat_time,
        total_time,
        result,
        selected_seat,
        selected_group,
        failure_reason
    } = req.body;

    if (
        !Number.isInteger(event_id) ||
        !['success', 'fail'].includes(result) ||
        !Number.isFinite(queue_time) ||
        !Number.isFinite(seat_time) ||
        !Number.isFinite(total_time) ||
        queue_time < 0 ||
        seat_time < 0 ||
        total_time < 0 ||
        (result === 'success' && failure_reason) ||
        (result === 'fail' && !failure_reason)
    ) {
        return res.status(400).json({
            message: '연습 기록 정보를 확인해주세요.'
        });
    }

    const sql = `
        INSERT INTO practice_sessions
        (user_id, event_id, queue_time,
         seat_time, total_time, result,
         selected_seat, selected_group, failure_reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [
        userId,
        event_id,
        queue_time,
        seat_time,
        total_time,
        result,
        selected_seat || null,
        selected_group || null,
        failure_reason || null
    ], (err, result) => {
        if (err) {
            console.log(err);

            return res.status(500).json({
                message: '연습 기록 저장에 실패했습니다.'
            });
        }

        res.status(201).json({
            message: '연습 기록 저장 성공!',
            session_id: result.insertId
        });
    });
});

module.exports = router;

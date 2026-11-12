
const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// 게임 행사 그룹 조회
router.get('/event/:eventId', (req, res) => {
    const eventId = req.params.eventId;

    const sql = `
        SELECT group_id, event_id, group_name,
               price, total_quantity, remaining_quantity
        FROM event_groups
        WHERE event_id = ?
        ORDER BY group_name ASC
    `;

    db.query(sql, [eventId], (err, results) => {
        if (err) {
            return res.status(500).json({
                message: '입장 그룹 조회에 실패했습니다.'
            });
        }

        res.json({
            message: '입장 그룹 조회 성공!',
            groups: results
        });
    });
});

// 입장 그룹 등록
router.post('/event/:eventId', authMiddleware, (req, res) => {
    const eventId = req.params.eventId;
    const userId = req.user.user_id;

    const {
        group_name,
        price,
        total_quantity,
        remaining_quantity
    } = req.body;

    const groupNames = ['A', 'B', 'C', 'D', 'E', 'F'];

    if (
        !groupNames.includes(group_name) ||
        !Number.isInteger(price) ||
        price < 0 ||
        !Number.isInteger(total_quantity) ||
        total_quantity < 1 ||
        !Number.isInteger(remaining_quantity) ||
        remaining_quantity < 0 ||
        remaining_quantity > total_quantity
    ) {
        return res.status(400).json({
            message: '입력 정보를 확인해주세요.'
        });
    }

    // 행사 소유자 및 게임 행사 여부 확인
    db.query(
        `SELECT event_id FROM events
         WHERE event_id = ? AND creator_id = ? AND category = 'game'`,
        [eventId, userId],
        (err, results) => {
            if (err) {
                return res.status(500).json({
                    message: '행사 확인에 실패했습니다.'
                });
            }

            if (results.length === 0) {
                return res.status(403).json({
                    message: '그룹 등록 권한이 없습니다.'
                });
            }

            const sql = `
                INSERT INTO event_groups
                (event_id, group_name, price,
                 total_quantity, remaining_quantity)
                VALUES (?, ?, ?, ?, ?)
            `;

            db.query(sql, [
                eventId,
                group_name,
                price,
                total_quantity,
                remaining_quantity
            ], (err, result) => {
                if (err) {
                    return res.status(500).json({
                        message: '입장 그룹 등록에 실패했습니다.'
                    });
                }

                res.status(201).json({
                    message: '입장 그룹 등록 성공!',
                    group_id: result.insertId
                });
            });
        }
    );
});

// 입장 그룹 수정
router.put('/:id', authMiddleware, (req, res) => {
    const groupId = req.params.id;
    const userId = req.user.user_id;

    const {
        group_name,
        price,
        total_quantity,
        remaining_quantity
    } = req.body;

    const groupNames = ['A', 'B', 'C', 'D', 'E', 'F'];

    if (
        !groupNames.includes(group_name) ||
        !Number.isInteger(price) ||
        price < 0 ||
        !Number.isInteger(total_quantity) ||
        total_quantity < 1 ||
        !Number.isInteger(remaining_quantity) ||
        remaining_quantity < 0 ||
        remaining_quantity > total_quantity
    ) {
        return res.status(400).json({
            message: '입력 정보를 확인해주세요.'
        });
    }

    const sql = `
        UPDATE event_groups g
        JOIN events e ON g.event_id = e.event_id
        SET g.group_name = ?, g.price = ?,
            g.total_quantity = ?, g.remaining_quantity = ?
        WHERE g.group_id = ?
          AND e.creator_id = ?
          AND e.category = 'game'
    `;

    db.query(sql, [
        group_name,
        price,
        total_quantity,
        remaining_quantity,
        groupId,
        userId
    ], (err, result) => {
        if (err) {
            return res.status(500).json({
                message: '입장 그룹 수정에 실패했습니다.'
            });
        }

        if (result.affectedRows === 0) {
            return res.status(403).json({
                message: '그룹 수정 권한이 없습니다.'
            });
        }

        res.json({
            message: '입장 그룹 수정 성공!'
        });
    });
});

// 입장 그룹 삭제
router.delete('/:id', authMiddleware, (req, res) => {
    const groupId = req.params.id;
    const userId = req.user.user_id;

    const sql = `
        DELETE g FROM event_groups g
        JOIN events e ON g.event_id = e.event_id
        WHERE g.group_id = ?
          AND e.creator_id = ?
          AND e.category = 'game'
    `;

    db.query(sql, [groupId, userId], (err, result) => {
        if (err) {
            return res.status(500).json({
                message: '입장 그룹 삭제에 실패했습니다.'
            });
        }

        if (result.affectedRows === 0) {
            return res.status(403).json({
                message: '그룹 삭제 권한이 없습니다.'
            });
        }

        res.json({
            message: '입장 그룹 삭제 성공!'
        });
    });
});

module.exports = router;


const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// 회원정보 조회
router.get('/me', authMiddleware, (req, res) => {
    const sql = `
        SELECT user_id, username, name, email, role, created_at
        FROM users
        WHERE user_id = ?
    `;

    db.query(sql, [req.user.user_id], (err, results) => {
        if (err) {
            return res.status(500).json({
                message: '회원정보 조회에 실패했습니다.'
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: '회원 정보를 찾을 수 없습니다.'
            });
        }

        res.json({
            message: '회원정보 조회 성공!',
            user: results[0]
        });
    });
});

// 마이페이지 통계 조회
router.get('/mypage', authMiddleware, (req, res) => {
    const sql = `
        SELECT
            COUNT(*) AS total_count,
            SUM(CASE WHEN result = 'success' THEN 1 ELSE 0 END) AS success_count,
            SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) AS fail_count,
            ROUND(
                SUM(CASE WHEN result = 'success' THEN 1 ELSE 0 END)
                / NULLIF(COUNT(*), 0) * 100,
                1
            ) AS success_rate
        FROM practice_sessions
        WHERE user_id = ?
    `;

    db.query(sql, [req.user.user_id], (err, results) => {
        if (err) {
            return res.status(500).json({
                message: '마이페이지 통계 조회에 실패했습니다.'
            });
        }

        const stats = results[0];

        res.json({
            message: '마이페이지 통계 조회 성공!',
            stats: {
                total_count: Number(stats.total_count),
                success_count: Number(stats.success_count),
                fail_count: Number(stats.fail_count),
                success_rate: Number(stats.success_rate || 0)
            }
        });
    });
});

// 회원정보 수정
router.put('/me', authMiddleware, (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({
            message: '이름과 이메일을 입력해주세요.'
        });
    }

    const sql = `
        UPDATE users
        SET name = ?, email = ?
        WHERE user_id = ?
    `;

    db.query(sql, [name, email, req.user.user_id], (err) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    message: '이미 사용 중인 이메일입니다.'
                });
            }

            return res.status(500).json({
                message: '회원정보 수정에 실패했습니다.'
            });
        }

        res.json({
            message: '회원정보 수정 성공!'
        });
    });
});

// 비밀번호 변경
router.put('/password', authMiddleware, (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            message: '기존 비밀번호와 새 비밀번호를 입력해주세요.'
        });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({
            message: '새 비밀번호는 8자 이상이어야 합니다.'
        });
    }

    const sql = 'SELECT password FROM users WHERE user_id = ?';

    db.query(sql, [req.user.user_id], async (err, results) => {
        if (err || results.length === 0) {
            return res.status(500).json({
                message: '회원정보를 확인할 수 없습니다.'
            });
        }

        try {
            const isMatch = await bcrypt.compare(
                currentPassword,
                results[0].password
            );

            if (!isMatch) {
                return res.status(401).json({
                    message: '기존 비밀번호가 올바르지 않습니다.'
                });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);

            db.query(
                'UPDATE users SET password = ? WHERE user_id = ?',
                [hashedPassword, req.user.user_id],
                (err) => {
                    if (err) {
                        return res.status(500).json({
                            message: '비밀번호 변경에 실패했습니다.'
                        });
                    }

                    res.json({
                        message: '비밀번호 변경 성공!'
                    });
                }
            );
        } catch (err) {
            res.status(500).json({
                message: '서버 오류가 발생했습니다.'
            });
        }
    });
});

// 회원탈퇴
router.delete('/me', authMiddleware, async (req, res) => {
    const { password } = req.body;
    const userId = req.user.user_id;
    const connection = db.promise();

    if (!password) {
        return res.status(400).json({
            message: '비밀번호를 입력해주세요.'
        });
    }

    let transactionStarted = false;

    try {
        // 기존 비밀번호 확인
        const [users] = await connection.query(
            'SELECT password FROM users WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: '회원 정보를 찾을 수 없습니다.'
            });
        }

        const isMatch = await bcrypt.compare(password, users[0].password);

        if (!isMatch) {
            return res.status(401).json({
                message: '비밀번호가 올바르지 않습니다.'
            });
        }

        // 트랜잭션 시작
        await connection.beginTransaction();
        transactionStarted = true;

        // 예매 좌석 정보 삭제
        await connection.query(`
            DELETE FROM reservation_seats
            WHERE reservation_id IN (
                SELECT reservation_id
                FROM reservations
                WHERE user_id IN (
                    SELECT user_id FROM users WHERE user_id = ?
                )
                OR event_id IN (
                    SELECT event_id FROM events WHERE creator_id = ?
                )
            )
        `, [userId, userId]);

        // 예매 내역 삭제
        await connection.query(`
            DELETE FROM reservations
            WHERE user_id = ?
            OR event_id IN (
                SELECT event_id FROM events WHERE creator_id = ?
            )
        `, [userId, userId]);

        // 연습 기록 삭제
        await connection.query(`
            DELETE FROM practice_sessions
            WHERE user_id = ?
            OR event_id IN (
                SELECT event_id FROM events WHERE creator_id = ?
            )
        `, [userId, userId]);

        // 본인이 등록한 행사 관련 좌석 삭제
        await connection.query(`
            DELETE FROM seats
            WHERE event_id IN (
                SELECT event_id FROM events WHERE creator_id = ?
            )
        `, [userId]);

        // 본인이 등록한 행사 관련 그룹 삭제
        await connection.query(`
            DELETE FROM event_groups
            WHERE event_id IN (
                SELECT event_id FROM events WHERE creator_id = ?
            )
        `, [userId]);

        // 본인이 등록한 행사 삭제
        await connection.query(
            'DELETE FROM events WHERE creator_id = ?',
            [userId]
        );

        // 회원 계정 삭제
        await connection.query(
            'DELETE FROM users WHERE user_id = ?',
            [userId]
        );

        await connection.commit();
        transactionStarted = false;

        res.json({
            message: '회원탈퇴가 완료되었습니다.'
        });

    } catch (err) {
        if (transactionStarted) {
            try {
                await connection.rollback();
            } catch (rollbackErr) {
                console.log(rollbackErr);
            }
        }

        console.log(err);

        res.status(500).json({
            message: '회원탈퇴에 실패했습니다.'
        });
    }
});

module.exports = router;

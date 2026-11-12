
const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const connection = db.promise();

// 내 예매 내역 조회
router.get('/my', authMiddleware, async (req, res) => {
    try {
        const [results] = await connection.query(`
            SELECT r.reservation_id, r.event_id,
                   e.title, r.group_id, g.group_name,
                   r.quantity, r.total_price,
                   r.status, r.reservation_date
            FROM reservations r
            JOIN events e ON r.event_id = e.event_id
            LEFT JOIN event_groups g ON r.group_id = g.group_id
            WHERE r.user_id = ?
            ORDER BY r.reservation_date DESC
        `, [req.user.user_id]);

        res.json({
            message: '예매 내역 조회 성공!',
            reservations: results
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: '예매 내역 조회에 실패했습니다.'
        });
    }
});

// 일반 행사 좌석 예매
router.post('/seats', authMiddleware, async (req, res) => {
    const userId = req.user.user_id;
    const { event_id, seat_ids } = req.body;

    if (
        !Number.isInteger(event_id) ||
        !Array.isArray(seat_ids) ||
        seat_ids.length === 0 ||
        !seat_ids.every(id => Number.isInteger(id)) ||
        new Set(seat_ids).size !== seat_ids.length
    ) {
        return res.status(400).json({
            message: '행사 ID와 좌석 정보를 확인해주세요.'
        });
    }

    try {
        await connection.beginTransaction();

        // 행사 확인
        const [events] = await connection.query(
            'SELECT category FROM events WHERE event_id = ?',
            [event_id]
        );

        if (events.length === 0 || events[0].category === 'game') {
            await connection.rollback();

            return res.status(400).json({
                message: '일반 행사만 좌석 예매가 가능합니다.'
            });
        }

        // 선택한 좌석 확인 및 잠금
        const [seats] = await connection.query(`
            SELECT seat_id, price, status
            FROM seats
            WHERE event_id = ? AND seat_id IN (?)
            FOR UPDATE
        `, [event_id, seat_ids]);

        if (
            seats.length !== seat_ids.length ||
            seats.some(seat => seat.status !== 'available')
        ) {
            await connection.rollback();

            return res.status(400).json({
                message: '선택한 좌석 중 예매할 수 없는 좌석이 있습니다.'
            });
        }

        const totalPrice = seats.reduce(
            (sum, seat) => sum + Number(seat.price), 0
        );

        // 예매 정보 저장
        const [reservation] = await connection.query(`
            INSERT INTO reservations
            (user_id, event_id, quantity, total_price, status)
            VALUES (?, ?, ?, ?, 'success')
        `, [userId, event_id, seats.length, totalPrice]);

        const reservationId = reservation.insertId;

        // 예매 좌석 연결
        for (const seat of seats) {
            await connection.query(`
                INSERT INTO reservation_seats
                (reservation_id, seat_id)
                VALUES (?, ?)
            `, [reservationId, seat.seat_id]);
        }

        // 좌석 상태 변경
        await connection.query(`
            UPDATE seats
            SET status = 'reserved'
            WHERE event_id = ? AND seat_id IN (?)
        `, [event_id, seat_ids]);

        await connection.commit();

        res.status(201).json({
            message: '좌석 예매 성공!',
            reservation_id: reservationId,
            quantity: seats.length,
            total_price: totalPrice
        });

    } catch (err) {
        await connection.rollback();
        console.log(err);

        res.status(500).json({
            message: '좌석 예매에 실패했습니다.'
        });
    }
});

// 게임 행사 그룹 예매
router.post('/groups', authMiddleware, async (req, res) => {
    const userId = req.user.user_id;
    const { event_id, group_id, quantity } = req.body;

    if (
        !Number.isInteger(event_id) ||
        !Number.isInteger(group_id) ||
        !Number.isInteger(quantity) ||
        quantity < 1
    ) {
        return res.status(400).json({
            message: '예매 정보를 확인해주세요.'
        });
    }

    try {
        await connection.beginTransaction();

        // 행사 및 그룹 확인
        const [groups] = await connection.query(`
            SELECT g.group_id, g.price, g.remaining_quantity
            FROM event_groups g
            JOIN events e ON g.event_id = e.event_id
            WHERE g.group_id = ?
              AND g.event_id = ?
              AND e.category = 'game'
            FOR UPDATE
        `, [group_id, event_id]);

        if (groups.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: '입장 그룹을 찾을 수 없습니다.'
            });
        }

        const group = groups[0];

        if (group.remaining_quantity < quantity) {
            await connection.rollback();

            return res.status(400).json({
                message: '잔여 수량이 부족합니다.'
            });
        }

        const totalPrice = Number(group.price) * quantity;

        // 예매 정보 저장
        const [reservation] = await connection.query(`
            INSERT INTO reservations
            (user_id, event_id, group_id, quantity, total_price, status)
            VALUES (?, ?, ?, ?, ?, 'success')
        `, [userId, event_id, group_id, quantity, totalPrice]);

        // 잔여 수량 차감
        await connection.query(`
            UPDATE event_groups
            SET remaining_quantity = remaining_quantity - ?
            WHERE group_id = ?
        `, [quantity, group_id]);

        await connection.commit();

        res.status(201).json({
            message: '입장 그룹 예매 성공!',
            reservation_id: reservation.insertId,
            group_id: group_id,
            quantity: quantity,
            total_price: totalPrice
        });

    } catch (err) {
        await connection.rollback();
        console.log(err);

        res.status(500).json({
            message: '입장 그룹 예매에 실패했습니다.'
        });
    }
});

module.exports = router;

// 예매 취소
router.put('/:id/cancel', authMiddleware, async (req, res) => {
    const reservationId = req.params.id;
    const userId = req.user.user_id;

    let transactionStarted = false;

    try {
        // 트랜잭션 시작
        await connection.beginTransaction();
        transactionStarted = true;

        // 본인의 예매 내역 확인
        const [reservations] = await connection.query(`
            SELECT reservation_id, event_id, group_id,
                   quantity, status
            FROM reservations
            WHERE reservation_id = ? AND user_id = ?
            FOR UPDATE
        `, [reservationId, userId]);

        if (reservations.length === 0) {
            await connection.rollback();
            transactionStarted = false;

            return res.status(404).json({
                message: '예매 내역을 찾을 수 없습니다.'
            });
        }

        const reservation = reservations[0];

        // 이미 취소된 예매인지 확인
        if (reservation.status !== 'success') {
            await connection.rollback();
            transactionStarted = false;

            return res.status(400).json({
                message: '취소할 수 없는 예매입니다.'
            });
        }

        // 게임 행사 그룹 예매 취소
        if (reservation.group_id !== null) {
            const [groups] = await connection.query(`
                SELECT group_id
                FROM event_groups
                WHERE group_id = ? AND event_id = ?
                FOR UPDATE
            `, [reservation.group_id, reservation.event_id]);

            if (groups.length === 0) {
                throw new Error('입장 그룹을 찾을 수 없습니다.');
            }

            // 잔여 수량 복구
            await connection.query(`
                UPDATE event_groups
                SET remaining_quantity = remaining_quantity + ?
                WHERE group_id = ?
            `, [reservation.quantity, reservation.group_id]);

        } else {
            // 일반 행사 좌석 예매 취소
            const [seats] = await connection.query(`
                SELECT rs.seat_id
                FROM reservation_seats rs
                JOIN seats s ON rs.seat_id = s.seat_id
                WHERE rs.reservation_id = ?
                  AND s.event_id = ?
                FOR UPDATE
            `, [reservationId, reservation.event_id]);

            if (seats.length !== reservation.quantity) {
                throw new Error('예매 좌석 정보를 확인할 수 없습니다.');
            }

            // 좌석 상태 복구
            for (const seat of seats) {
                await connection.query(`
                    UPDATE seats
                    SET status = 'available'
                    WHERE seat_id = ?
                `, [seat.seat_id]);
            }
        }

        // 예매 상태 변경
        await connection.query(`
            UPDATE reservations
            SET status = 'cancelled'
            WHERE reservation_id = ? AND user_id = ?
        `, [reservationId, userId]);

        // 모든 작업 완료
        await connection.commit();
        transactionStarted = false;

        res.json({
            message: '예매 취소 성공!'
        });

    } catch (err) {
        if (transactionStarted) {
            await connection.rollback();
        }

        console.log(err);

        res.status(500).json({
            message: '예매 취소에 실패했습니다.'
        });
    }
});

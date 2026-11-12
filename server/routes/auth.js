const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const router = express.Router();

// 회원가입
router.post('/register', async (req, res) => {
    const { username, password, name, email } = req.body;

    if (!username || !password || !name || !email) {
        return res.status(400).json({
            message: '모든 항목을 입력해주세요.'
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO users (username, password, name, email)
            VALUES (?, ?, ?, ?)
        `;

        db.query(sql, [username, hashedPassword, name, email], (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({
                        message: '이미 사용 중인 아이디 또는 이메일입니다.'
                    });
                }

                return res.status(500).json({
                    message: '회원가입에 실패했습니다.'
                });
            }

            res.status(201).json({
                message: '회원가입 성공!'
            });
        });
    } catch (err) {
        res.status(500).json({
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 로그인
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            message: '아이디와 비밀번호를 입력해주세요.'
        });
    }

    const sql = 'SELECT * FROM users WHERE username = ?';

    db.query(sql, [username], async (err, results) => {
        if (err) {
            return res.status(500).json({
                message: '서버 오류가 발생했습니다.'
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                message: '아이디 또는 비밀번호가 올바르지 않습니다.'
            });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                message: '아이디 또는 비밀번호가 올바르지 않습니다.'
            });
        }

        const token = jwt.sign(
            {
                user_id: user.user_id,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            message: '로그인 성공!',
            token,
            user: {
                user_id: user.user_id,
                username: user.username,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    });
});

module.exports = router;
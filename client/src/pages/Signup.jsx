
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

function Signup() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        username: '',
        password: '',
        name: '',
        email: ''
    });

    const [error, setError] = useState('');

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await api.post('/auth/register', form);

            alert(response.data.message);
            navigate('/login');
        } catch (err) {
            setError(
                err.response?.data?.message ||
                '회원가입에 실패했습니다.'
            );
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-box">
                <h1>회원가입</h1>
                <p>티켓 브릿지의 회원이 되어보세요.</p>

                <form onSubmit={handleSignup}>
                    <div className="auth-input">
                        <label>아이디</label>
                        <input
                            type="text"
                            name="username"
                            value={form.username}
                            onChange={handleChange}
                            placeholder="아이디를 입력하세요"
                            required
                        />
                    </div>

                    <div className="auth-input">
                        <label>비밀번호</label>
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="비밀번호를 입력하세요"
                            required
                        />
                    </div>

                    <div className="auth-input">
                        <label>이름</label>
                        <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="이름을 입력하세요"
                            required
                        />
                    </div>

                    <div className="auth-input">
                        <label>이메일</label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="이메일을 입력하세요"
                            required
                        />
                    </div>

                    {error && (
                        <p className="auth-error">{error}</p>
                    )}

                    <button type="submit" className="auth-button">
                        회원가입
                    </button>
                </form>

                <div className="auth-link">
                    이미 회원이신가요?
                    <Link to="/login">로그인</Link>
                </div>
            </div>
        </div>
    );
}

export default Signup;


import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

function Login() {
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await api.post('/auth/login', {
                username,
                password
            });

            localStorage.setItem('token', response.data.token);
            localStorage.setItem(
                'user',
                JSON.stringify(response.data.user)
            );

            window.dispatchEvent(new Event('storage'));

            alert('로그인 성공!');
            navigate('/events');
        } catch (err) {
            setError(
                err.response?.data?.message ||
                '로그인에 실패했습니다.'
            );
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-box">
                <h1>로그인</h1>
                <p>티켓 브릿지에 오신 것을 환영합니다.</p>

                <form onSubmit={handleLogin}>
                    <div className="auth-input">
                        <label>아이디</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="아이디를 입력하세요"
                            required
                        />
                    </div>

                    <div className="auth-input">
                        <label>비밀번호</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="비밀번호를 입력하세요"
                            required
                        />
                    </div>

                    {error && (
                        <p className="auth-error">{error}</p>
                    )}

                    <button type="submit" className="auth-button">
                        로그인
                    </button>
                </form>

                <div className="auth-link">
                    아직 회원이 아니신가요?
                    <Link to="/signup">회원가입</Link>
                </div>
            </div>
        </div>
    );
}

export default Login;

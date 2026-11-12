
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './index.css';

import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import BookingStart from './pages/BookingStart';
import Queue from './pages/Queue';
import Select from './pages/Select';
import Login from './pages/Login';
import Signup from './pages/Signup';
import BookingConfirm from './pages/BookingConfirm';
import Payment from './pages/Payment';
import BookingComplete from './pages/BookingComplete';
import MyPage from './pages/MyPage';

function Home() {
    return (
        <div className="home">
            <h1>티켓 브릿지</h1>
            <p>실전처럼 연습하는 나만의 티켓팅 플랫폼</p>
            <Link to="/events" className="home-button">
                티켓팅 연습하기
            </Link>
        </div>
    );
}



function Header() {
    const navigate = useNavigate();

    const [isLogin, setIsLogin] = useState(
        !!localStorage.getItem('token')
    );

    useEffect(() => {
        const checkLogin = () => {
            setIsLogin(!!localStorage.getItem('token'));
        };

        window.addEventListener('storage', checkLogin);

        return () => {
            window.removeEventListener('storage', checkLogin);
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        setIsLogin(false);
        alert('로그아웃되었습니다.');
        navigate('/');
    };

    return (
        <header>
            <Link to="/" className="logo">TiketBridge</Link>

            <nav>
                <Link to="/">홈</Link>
                <Link to="/events">행사 목록</Link>

                {isLogin ? (
                    <>
                        <Link to="/mypage">마이페이지</Link>
                        <button
                            className="logout-button"
                            onClick={handleLogout}
                        >
                            로그아웃
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/login">로그인</Link>
                        <Link to="/signup">회원가입</Link>
                    </>
                )}
            </nav>
        </header>
    );
}

function App() {
    return (
        <BrowserRouter>
            <Header />

            <main>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/events" element={<Events />} />
                    <Route path="/events/:id" element={<EventDetail />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/mypage" element={<MyPage />} />
                    <Route path="/events/:id/practice" element={<BookingStart />} />
                    <Route path="/events/:id/queue" element={<Queue />} />
                    <Route path="/events/:id/select" element={<Select />} />
                    <Route path="/events/:id/payment" element={<Payment />} />
                    <Route path="/events/:id/confirm" element={<BookingConfirm />} />
                    <Route path="/events/:id/complete" element={<BookingComplete />} />
                </Routes>
            </main>
        </BrowserRouter>
    );
}

export default App;

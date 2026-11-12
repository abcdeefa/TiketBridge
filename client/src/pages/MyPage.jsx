
import { useEffect, useState } from 'react';
import api from '../api/axios';

function MyPage() {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({});
    const [sessions, setSessions] = useState([]);
    const [events, setEvents] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [editingProfile, setEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({
        name: '',
        email: ''
    });

    const [editingEvent, setEditingEvent] = useState(null);
    const [eventForm, setEventForm] = useState({
        title: '',
        description: '',
        location: '',
        event_date: '',
        booking_start: '',
        poster: null
    });

    const getDate = (value) => {
        if (!value) return '';

        const date = new Date(value);
        const localDate = new Date(
            date.getTime() - date.getTimezoneOffset() * 60000
        );

        return localDate.toISOString().slice(0, 10);
    };

    const loadData = async () => {
        setLoading(true);
        setError('');

        try {
            const results = await Promise.allSettled([
                api.get('/users/me'),
                api.get('/users/mypage'),
                api.get('/practice-sessions/my'),
                api.get('/events/my')
            ]);

            const [userResult, statsResult, sessionResult, eventResult] = results;

            if (userResult.status === 'fulfilled') {
                const data = userResult.value.data;
                const userData = data.user || data;

                setUser(userData);
                setProfileForm({
                    name: userData.name || '',
                    email: userData.email || ''
                });
            } else {
                setError('회원정보를 불러오지 못했습니다.');
            }

            if (statsResult.status === 'fulfilled') {
                const data = statsResult.value.data;
                setStats(data.stats || data);
            }

            if (sessionResult.status === 'fulfilled') {
                const data = sessionResult.value.data;
                setSessions(data.sessions || data.records || []);
            }

            if (eventResult.status === 'fulfilled') {
                setEvents(eventResult.value.data.events || []);
            }

        } catch (err) {
            console.error(err);
            setError('마이페이지 정보를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const formatPrice = (price) => {
        return Number(price || 0).toLocaleString('ko-KR') + '원';
    };

    const formatDate = (value) => {
        if (!value) return '-';

        return new Date(value).toLocaleDateString('ko-KR');
    };

    const handleProfileChange = (e) => {
        setProfileForm({
            ...profileForm,
            [e.target.name]: e.target.value
        });
    };

    const updateProfile = async (e) => {
        e.preventDefault();

        try {
            await api.put('/users/me', profileForm);

            alert('회원정보가 수정되었습니다.');
            setEditingProfile(false);
            loadData();

        } catch (err) {
            alert(err.response?.data?.message || '회원정보 수정에 실패했습니다.');
        }
    };

    const startEditEvent = (event) => {
        setEditingEvent(event.event_id);

        setEventForm({
            title: event.title || '',
            description: event.description || '',
            location: event.location || '',
            event_date: getDate(event.event_date),
            booking_start: getDate(event.booking_start),
            poster: null
        });
    };

    const handleEventChange = (e) => {
        const { name, value, files } = e.target;

        setEventForm({
            ...eventForm,
            [name]: files ? files[0] : value
        });
    };

    
    const updateEvent = async (e) => {
        e.preventDefault();

        const formData = new FormData();

        Object.entries(eventForm).forEach(([key, value]) => {
            if (value !== null && value !== '') {
                formData.append(key, value);
            }
        });

    // 기존 카테고리를 그대로 전송
    const currentEvent = events.find(
        (event) => event.event_id === editingEvent
    );

    if (currentEvent) {
        formData.append('category', currentEvent.category);
    }

    try {
        await api.put(`/events/${editingEvent}`, formData);

        alert('행사가 수정되었습니다.');
        setEditingEvent(null);
        loadData();

    } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || '행사 수정에 실패했습니다.');
    }
    };


    const deleteEvent = async (event) => {
        const confirmed = window.confirm(
            `"${event.title}" 행사를 삭제할까요?\n관련 예매 정보와 연습 기록도 함께 삭제됩니다.`
        );

        if (!confirmed) return;

        try {
            await api.delete(`/events/${event.event_id}`);

            alert('행사가 삭제되었습니다.');
            loadData();

        } catch (err) {
            alert(err.response?.data?.message || '행사 삭제에 실패했습니다.');
        }
    };

    if (loading) {
        return <div className="mypage-message">마이페이지 불러오는 중...</div>;
    }

    return (
        <div className="mypage">
            <div className="mypage-header">
                <h1>마이페이지</h1>
                <p>나의 회원정보와 티켓팅 연습 기록을 확인하세요.</p>
            </div>

            {error && <p className="mypage-error">{error}</p>}

            {/* 회원정보 */}
            <section className="mypage-section">
                <div className="mypage-section-header">
                    <h2>회원정보</h2>

                    <button
                        className="mypage-small-button"
                        onClick={() => setEditingProfile(!editingProfile)}
                    >
                        {editingProfile ? '취소' : '정보 수정'}
                    </button>
                </div>

                {editingProfile ? (
                    <form className="mypage-form" onSubmit={updateProfile}>
                        <label>이름</label>
                        <input
                            name="name"
                            value={profileForm.name}
                            onChange={handleProfileChange}
                            required
                        />

                        <label>이메일</label>
                        <input
                            type="email"
                            name="email"
                            value={profileForm.email}
                            onChange={handleProfileChange}
                            required
                        />

                        <button type="submit" className="mypage-primary-button">
                            수정 완료
                        </button>
                    </form>
                ) : (
                    <div className="mypage-profile">
                        <div>
                            <span>아이디</span>
                            <strong>{user?.username || '-'}</strong>
                        </div>

                        <div>
                            <span>이름</span>
                            <strong>{user?.name || '-'}</strong>
                        </div>

                        <div>
                            <span>이메일</span>
                            <strong>{user?.email || '-'}</strong>
                        </div>
                    </div>
                )}
            </section>

            {/* 연습 통계 */}
            <section className="mypage-section">
                <h2>나의 연습 통계</h2>

                <div className="mypage-stats">
                    <div className="mypage-stat-card">
                        <span>총 연습 횟수</span>
                        <strong>{stats.total_sessions ?? stats.total_count ?? 0}회</strong>
                    </div>

                    <div className="mypage-stat-card">
                        <span>성공 횟수</span>
                        <strong>{stats.success_count ?? 0}회</strong>
                    </div>

                    <div className="mypage-stat-card">
                        <span>성공률</span>
                        <strong>{Number(stats.success_rate || 0).toFixed(1)}%</strong>
                    </div>
                </div>
            </section>

            {/* 연습 기록 */}
            <section className="mypage-section">
                <h2>연습 기록</h2>

                {sessions.length === 0 ? (
                    <p className="mypage-empty">아직 연습 기록이 없습니다.</p>
                ) : (
                    <div className="mypage-table-wrap">
                        <table className="mypage-table">
                            <thead>
                                <tr>
                                    <th>행사</th>
                                    <th>연습 날짜</th>
                                    <th>소요 시간</th>
                                    <th>결과</th>
                                </tr>
                            </thead>

                            <tbody>
                                {sessions.map((session) => (
                                    <tr key={session.session_id}>
                                        <td>{session.event_title || session.title || `행사 #${session.event_id}`}</td>
                                        <td>{formatDate(session.created_at || session.session_date)}</td>
                                        <td>{session.total_time ?? '-'}초</td>
                                        <td>
                                            <span className={
                                                session.result === 'success'
                                                    ? 'mypage-success'
                                                    : 'mypage-failure'
                                            }>
                                                {session.result === 'success' ? '성공' : '실패'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* 내가 등록한 행사 */}
            <section className="mypage-section">
                <h2>내가 등록한 행사</h2>

                {events.length === 0 ? (
                    <p className="mypage-empty">등록한 행사가 없습니다.</p>
                ) : (
                    <div className="mypage-event-list">
                        {events.map((event) => (
                            <div className="mypage-event-card" key={event.event_id}>
                                {event.poster ? (
                                    <img
                                        src={`http://localhost:5000${event.poster}`}
                                        alt={event.title}
                                    />
                                ) : (
                                    <div className="mypage-no-poster">
                                        NO IMAGE
                                    </div>
                                )}

                                <div className="mypage-event-info">
                                    <span className="mypage-event-category">
                                        {event.category}
                                    </span>

                                    <h3>{event.title}</h3>
                                    <p>{event.location}</p>
                                    <p>{formatDate(event.event_date)}</p>
                                </div>

                                <div className="mypage-event-actions">
                                    <button
                                        className="mypage-edit-button"
                                        onClick={() => startEditEvent(event)}
                                    >
                                        수정
                                    </button>

                                    <button
                                        className="mypage-delete-button"
                                        onClick={() => deleteEvent(event)}
                                    >
                                        행사 취소
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* 행사 수정 */}
            {editingEvent !== null && (
                <div className="mypage-modal-background">
                    <form className="mypage-event-form" onSubmit={updateEvent}>
                        <h2>행사 수정</h2>

                        <label>행사명</label>
                        <input
                            name="title"
                            value={eventForm.title}
                            onChange={handleEventChange}
                            required
                        />

                        

                        <label>장소</label>
                        <input
                            name="location"
                            value={eventForm.location}
                            onChange={handleEventChange}
                            required
                        />

                        <label>행사 날짜</label>
                        <input
                            type="date"
                            name="event_date"
                            value={eventForm.event_date}
                            onChange={handleEventChange}
                            required
                        />

                        <label>예매 시작일</label>
                        <input
                            type="date"
                            name="booking_start"
                            value={eventForm.booking_start}
                            onChange={handleEventChange}
                        />

                        <label>행사 설명</label>
                        <textarea
                            name="description"
                            value={eventForm.description}
                            onChange={handleEventChange}
                        />

                        <label>포스터 변경</label>
                        <input
                            type="file"
                            name="poster"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleEventChange}
                        />

                        <div className="mypage-form-buttons">
                            <button
                                type="button"
                                className="mypage-cancel-button"
                                onClick={() => setEditingEvent(null)}
                            >
                                닫기
                            </button>

                            <button
                                type="submit"
                                className="mypage-primary-button"
                            >
                                수정 저장
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export default MyPage;

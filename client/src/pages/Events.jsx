
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

function Events() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [isLogin] = useState(!!localStorage.getItem('token'));
    const [showForm, setShowForm] = useState(false);
    const [posterFile, setPosterFile] = useState(null);
    const [posterPreview, setPosterPreview] = useState('');

    const [form, setForm] = useState({
        title: '',
        category: 'concert',
        description: '',
        location: '',
        event_date: '',
        booking_start: ''
    });

    const getEvents = useCallback(async () => {
        try {
            const response = await api.get('/events');
            setEvents(response.data.events);
        } catch (err) {
            console.error(err);
            setError('행사 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        getEvents();
    }, [getEvents]);

    // 입력값 변경
    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    // 포스터 파일 선택
    const handlePosterChange = (e) => {
        const file = e.target.files[0];

        if (!file) return;

        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp'
        ];

        if (!allowedTypes.includes(file.type)) {
            alert('JPG, PNG, GIF, WEBP 이미지만 선택할 수 있습니다.');
            e.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('이미지 크기는 5MB 이하여야 합니다.');
            e.target.value = '';
            return;
        }

        setPosterFile(file);
        setPosterPreview(URL.createObjectURL(file));
    };

    // 포스터 선택 취소
    const removePoster = () => {
        setPosterFile(null);
        setPosterPreview('');
    };

    // 행사 등록
    const handleSubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData();

        Object.entries(form).forEach(([key, value]) => {
            formData.append(key, value);
        });

        if (posterFile) {
            formData.append('poster', posterFile);
        }

        try {
            await api.post('/events', formData);

            alert('행사가 등록되었습니다.');

            setForm({
                title: '',
                category: 'concert',
                description: '',
                location: '',
                event_date: '',
                booking_start: ''
            });

            setPosterFile(null);
            setPosterPreview('');
            setShowForm(false);
            setLoading(true);
            setError('');

            await getEvents();

        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || '행사 등록에 실패했습니다.');
        }
    };

    if (loading) {
        return <div className="event-message">행사 목록을 불러오는 중...</div>;
    }

    if (error) {
        return <div className="event-message">{error}</div>;
    }

    return (
        <div className="events-page">
            <div className="events-title">
                <h1>행사 목록</h1>
                <p>원하는 행사를 선택하고 티켓팅 연습을 시작해 보세요.</p>

                {isLogin && (
                    <button
                        className="add-event-button"
                        onClick={() => setShowForm(!showForm)}
                    >
                        {showForm ? '등록 취소' : '+ 행사 등록'}
                    </button>
                )}
            </div>

            {isLogin && showForm && (
                <form className="event-form" onSubmit={handleSubmit}>
                    <h2>새 행사 등록</h2>

                    <label>행사명</label>
                    <input
                        type="text"
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                        required
                    />

                    <label>카테고리</label>
                    <select
                        name="category"
                        value={form.category}
                        onChange={handleChange}
                    >
                        <option value="concert">콘서트</option>
                        <option value="musical">뮤지컬 / 연극</option>
                        <option value="game">게임 행사</option>
                        <option value="sports">스포츠 / e스포츠</option>
                        <option value="etc">전시 / 기타</option>
                    </select>

                    <label>설명</label>
                    <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                    />

                    <label>포스터 이미지</label>
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handlePosterChange}
                    />

                    {posterPreview && (
                        <div className="poster-preview">
                            <img src={posterPreview} alt="포스터 미리보기" />
                            <button
                                type="button"
                                onClick={removePoster}
                            >
                                이미지 선택 취소
                            </button>
                        </div>
                    )}

                    <label>장소</label>
                    <input
                        type="text"
                        name="location"
                        value={form.location}
                        onChange={handleChange}
                        required
                    />

                    <label>행사 날짜</label>
                    <input
                        type="datetime-local"
                        name="event_date"
                        value={form.event_date}
                        onChange={handleChange}
                        required
                    />

                    <label>예매 시작일</label>
                    <input
                        type="datetime-local"
                        name="booking_start"
                        value={form.booking_start}
                        onChange={handleChange}
                    />

                    <button type="submit" className="submit-event-button">
                        행사 등록하기
                    </button>
                </form>
            )}

            <div className="event-list">
                {events.length === 0 ? (
                    <p>등록된 행사가 없습니다.</p>
                ) : (
                    events.map((event) => (
                        <div className="event-card" key={event.event_id}>
                            <div className="event-poster">
                                {event.poster ? (
                                    <img
                                        src={`http://localhost:5000${event.poster}`}
                                        alt={event.title}
                                    />
                                ) : (
                                    <span>NO IMAGE</span>
                                )}
                            </div>

                            <div className="event-info">
                                <span className="event-category">
                                    {event.category}
                                </span>

                                <h2>{event.title}</h2>
                                <p>{event.description}</p>
                                <p>{event.location}</p>

                                <Link
                                    to={`/events/${event.event_id}`}
                                    className="detail-button"
                                >
                                    상세 보기
                                </Link>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Events;

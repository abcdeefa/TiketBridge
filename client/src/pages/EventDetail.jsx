
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

function EventDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const getEvent = async () => {
            try {
                const response = await api.get('/events');

                const selectedEvent = response.data.events.find(
                    (item) => String(item.event_id) === id
                );

                if (!selectedEvent) {
                    setError('해당 행사를 찾을 수 없습니다.');
                } else {
                    setEvent(selectedEvent);
                }
            } catch (err) {
                console.error(err);
                setError('행사 정보를 불러오지 못했습니다.');
            } finally {
                setLoading(false);
            }
        };

        getEvent();
    }, [id]);

    if (loading) {
        return <div className="event-message">행사 정보를 불러오는 중...</div>;
    }

    if (error) {
        return <div className="event-message">{error}</div>;
    }

    return (
        <div className="event-detail">
            <Link to="/events" className="back-link">
                ← 행사 목록으로
            </Link>

            <div className="detail-card">
                <div className="detail-poster">
                    {event.poster ? (
                        <img
                            src={`http://localhost:5000${event.poster}`}
                            alt={event.title}
                        />
                    ) : (
                        <span>NO IMAGE</span>
                    )}
                </div>

                <div className="detail-info">
                    <span className="event-category">
                        {event.category}
                    </span>

                    <h1>{event.title}</h1>

                    <p>{event.description || '행사 설명이 없습니다.'}</p>

                    <div className="detail-items">
                        <p><strong>장소</strong> {event.location || '미정'}</p>
                        <p>
                            <strong>행사 날짜</strong>{' '}
                            {event.event_date
                                ? new Date(event.event_date).toLocaleDateString('ko-KR')
                                : '미정'}
                        </p>
                    </div>

                    <button
                        className="practice-button"
                        onClick={() => navigate(`/events/${id}/practice`)}
                    >
                        티켓팅 연습하기
                    </button>
                </div>
            </div>
        </div>
    );
}

export default EventDetail;

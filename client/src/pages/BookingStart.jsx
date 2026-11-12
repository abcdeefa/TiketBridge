
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

function BookingStart() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [event, setEvent] = useState(null);
    const [date, setDate] = useState('');
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
                    setError('행사를 찾을 수 없습니다.');
                    return;
                }

                setEvent(selectedEvent);

                if (selectedEvent.event_date) {
                    const eventDate = new Date(selectedEvent.event_date);
                    const localDate = new Date(
                        eventDate.getTime() - eventDate.getTimezoneOffset() * 60000
                    );

                    setDate(localDate.toISOString().slice(0, 10));
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

    const startPractice = () => {
        if (!date) {
            alert('행사 날짜를 선택해 주세요.');
            return;
        }

        navigate(`/events/${id}/queue?date=${date}`);
    };

    if (loading) {
        return <div className="event-message">불러오는 중...</div>;
    }

    if (error) {
        return <div className="event-message">{error}</div>;
    }

    return (
        <div className="booking-start">
            <h1>티켓팅 연습 준비</h1>

            <p className="booking-subtitle">
                연습할 행사를 확인하고 날짜를 선택해 주세요.
            </p>

            <div className="booking-event-card">
                <span className="event-category">{event.category}</span>

                <h2>{event.title}</h2>

                <p>{event.location || '장소 미정'}</p>

                <div className="date-select">
                    <label htmlFor="event-date">행사 날짜</label>

                    <input
                        type="date"
                        id="event-date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </div>

                <button
                    className="queue-button"
                    onClick={startPractice}
                >
                    대기열 진입하기
                </button>
            </div>
        </div>
    );
}

export default BookingStart;

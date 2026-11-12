
import { useLocation, useNavigate, useParams } from 'react-router-dom';

function BookingConfirm() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const booking = location.state;

    // 예매 정보가 없으면 좌석 선택 페이지로 이동
    if (!booking || !booking.event) {
        return (
            <div className="event-message">
                예매 정보가 없습니다.
                <button onClick={() => navigate(`/events/${id}/practice`)}>
                    돌아가기
                </button>
            </div>
        );
    }

    const {
        event,
        date,
        selectedSeats,
        selectedGroup,
        quantity,
        totalPrice
    } = booking;

    const isGame = event.category === 'game';

    // 결제 페이지로 이동
    const goToPayment = () => {
        navigate(`/events/${id}/payment`, {
            state: booking
        });
    };

    return (
        <div className="booking-confirm-page">
            <div className="booking-confirm-header">
                <h1>예매 정보 확인</h1>
                <p>선택한 예매 정보를 확인해 주세요.</p>
            </div>

            <div className="booking-confirm-card">
                {event.poster && (
                    <div className="confirm-poster">
                        <img
                            src={`http://localhost:5000${event.poster}`}
                            alt={event.title}
                        />
                    </div>
                )}

                <div className="confirm-event-info">
                    <span className="event-category">
                        {event.category}
                    </span>

                    <h2>{event.title}</h2>

                    <p>{event.location}</p>
                    <p>행사 날짜: {date}</p>
                </div>

                <div className="confirm-divider"></div>

                <h3>선택한 예매 정보</h3>

                {isGame ? (
                    <div className="confirm-detail">
                        <span>입장 그룹</span>
                        <strong>{selectedGroup?.group_name} 그룹</strong>

                        <span>수량</span>
                        <strong>{quantity}매</strong>

                        <span>티켓 가격</span>
                        <strong>
                            {Number(selectedGroup?.price).toLocaleString()}원
                        </strong>
                    </div>
                ) : (
                    <div className="confirm-detail">
                        <span>선택 좌석</span>
                        <strong>
                            {selectedSeats.map((seat) =>
                                `${seat.section} ${seat.seat_row}열 ${seat.seat_number}번`
                            ).join(', ')}
                        </strong>

                        <span>수량</span>
                        <strong>{selectedSeats.length}석</strong>
                    </div>
                )}

                <div className="confirm-divider"></div>

                <div className="confirm-total">
                    <span>최종 결제 금액</span>
                    <strong>{Number(totalPrice).toLocaleString()}원</strong>
                </div>

                <p className="confirm-notice">
                    본 사이트는 티켓팅 연습용으로 실제 결제는 진행되지 않습니다.
                </p>

                <div className="confirm-buttons">
                    <button
                        className="confirm-back-button"
                        onClick={() => navigate(-1)}
                    >
                        이전 단계
                    </button>

                    <button
                        className="confirm-payment-button"
                        onClick={goToPayment}
                    >
                        결제하기
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BookingConfirm;


import { useLocation, useNavigate, useParams } from 'react-router-dom';

function BookingComplete() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const booking = location.state;

    if (!booking || !booking.reservationId) {
        return (
            <div className="complete-error">
                <h2>예매 정보를 찾을 수 없습니다.</h2>
                <p>예매 완료 페이지는 결제 후에 확인할 수 있습니다.</p>
                <button onClick={() => navigate('/events')}>
                    행사 목록으로 돌아가기
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
        totalPrice,
        reservationId,
        paymentMethod,
        paymentDate,
        practiceSaved
    } = booking;

    const formatPrice = (price) => {
        return Number(price || 0).toLocaleString('ko-KR') + '원';
    };

    const formatDate = (value) => {
        if (!value) return '-';

        return new Date(value).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getSeatText = () => {
        if (!selectedSeats || selectedSeats.length === 0) {
            return '-';
        }

        return selectedSeats.map((seat) => {
            return `${seat.section || ''} ${seat.seat_row || ''}열 ${seat.seat_number || ''}번`;
        }).join(', ');
    };

    return (
        <div className="booking-complete-page">
            <div className="complete-card">
                <div className="complete-icon">✓</div>

                <h1>예매가 완료되었습니다!</h1>

                <p className="complete-subtitle">
                    티켓 브릿지 예매 연습이 완료되었습니다.
                </p>

                <div className="complete-reservation-number">
                    <span>예매 번호</span>
                    <strong>{reservationId}</strong>
                </div>

                <div className="complete-divider"></div>

                <h2>예매 정보</h2>

                <div className="complete-event-info">
                    {event?.poster && (
                        <img
                            src={`http://localhost:5000${event.poster}`}
                            alt="행사 포스터"
                        />
                    )}

                    <div>
                        <h3>{event?.title || '행사 정보 없음'}</h3>
                        <p>{event?.location || '장소 미정'}</p>
                        <p>{formatDate(date)}</p>
                    </div>
                </div>

                <div className="complete-details">
                    {selectedGroup ? (
                        <div className="complete-detail-row">
                            <span>입장 그룹</span>
                            <strong>{selectedGroup.group_name}</strong>
                        </div>
                    ) : (
                        <div className="complete-detail-row">
                            <span>선택 좌석</span>
                            <strong>{getSeatText()}</strong>
                        </div>
                    )}

                    <div className="complete-detail-row">
                        <span>예매 수량</span>
                        <strong>{quantity || selectedSeats?.length || 1}매</strong>
                    </div>

                    <div className="complete-detail-row">
                        <span>결제 수단</span>
                        <strong>{paymentMethod || '-'}</strong>
                    </div>

                    <div className="complete-detail-row">
                        <span>결제 일시</span>
                        <strong>
                            {paymentDate
                                ? new Date(paymentDate).toLocaleString('ko-KR')
                                : '-'}
                        </strong>
                    </div>
                </div>

                <div className="complete-divider"></div>

                <div className="complete-total">
                    <span>총 결제 금액</span>
                    <strong>{formatPrice(totalPrice)}</strong>
                </div>

                {practiceSaved === false && (
                    <div className="complete-warning">
                        예매는 완료되었지만 연습 기록 저장에 실패했습니다.
                        마이페이지에서 기록이 보이지 않을 수 있습니다.
                    </div>
                )}

                <div className="complete-buttons">
                    <button
                        className="complete-home-button"
                        onClick={() => navigate('/events')}
                    >
                        행사 목록으로
                    </button>

                    <button
                        className="complete-mypage-button"
                        onClick={() => navigate('/mypage')}
                    >
                        마이페이지 확인
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BookingComplete;

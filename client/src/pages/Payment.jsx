
import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

function Payment() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const booking = location.state;

    const [paymentMethod, setPaymentMethod] = useState('card');
    const [agree, setAgree] = useState(false);
    const [paying, setPaying] = useState(false);
    const [error, setError] = useState('');

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

    // 실제 연습 소요 시간 계산
    const getPracticeTime = () => {
        const storageKey = `tiketbridge_practice_${id}_${date}`;

        let practiceData = {};

        try {
            practiceData = JSON.parse(
                sessionStorage.getItem(storageKey) || '{}'
            );
        } catch (err) {
            console.error('연습 시간 정보 조회 실패:', err);
        }

        const now = Date.now();

        const queueTime =
            practiceData.queueStartedAt &&
            practiceData.queueCompletedAt
                ? Math.max(
                    0,
                    Math.round(
                        (practiceData.queueCompletedAt -
                            practiceData.queueStartedAt) / 1000
                    )
                )
                : 0;

        const seatTime = practiceData.selectStartedAt
            ? Math.max(
                0,
                Math.round(
                    (now - practiceData.selectStartedAt) / 1000
                )
            )
            : 0;

        const totalTime = practiceData.startedAt
            ? Math.max(
                0,
                Math.round(
                    (now - practiceData.startedAt) / 1000
                )
            )
            : queueTime + seatTime;

        return {
            queueTime,
            seatTime,
            totalTime
        };
    };

    const handlePayment = async () => {
        if (!agree) {
            alert('결제 진행에 동의해 주세요.');
            return;
        }

        if (paying) return;

        setPaying(true);
        setError('');

        const selectedSeatText = isGame
            ? null
            : selectedSeats.map((seat) =>
                `${seat.section} ${seat.seat_row}열 ${seat.seat_number}번`
            ).join(', ');

        const selectedGroupText = isGame
            ? selectedGroup?.group_name
            : null;

        try {
            let reservationResponse;

            // 일반 행사 좌석 예매
            if (!isGame) {
                reservationResponse = await api.post('/reservations/seats', {
                    event_id: Number(id),
                    seat_ids: selectedSeats.map((seat) => seat.seat_id)
                });
            } else {
                // 게임 행사 그룹 예매
                reservationResponse = await api.post('/reservations/groups', {
                    event_id: Number(id),
                    group_id: selectedGroup.group_id,
                    quantity: quantity
                });
            }

            const reservationId = reservationResponse.data.reservation_id;

            // 실제 소요 시간 계산
            const {
                queueTime,
                seatTime,
                totalTime
            } = getPracticeTime();

            // 성공 연습 기록 저장
            let practiceSaved = true;

            try {
                await api.post('/practice-sessions', {
                    event_id: Number(id),
                    queue_time: queueTime,
                    seat_time: seatTime,
                    total_time: totalTime,
                    result: 'success',
                    selected_seat: selectedSeatText,
                    selected_group: selectedGroupText,
                    failure_reason: null
                });
            } catch (err) {
                console.error('연습 기록 저장 실패:', err);
                practiceSaved = false;
            }

            // 예매 완료 페이지로 이동
            navigate(`/events/${id}/complete`, {
                state: {
                    ...booking,
                    reservationId,
                    paymentMethod,
                    paymentDate: new Date().toISOString(),
                    practiceSaved
                }
            });

        } catch (err) {
            console.error(err);

            const failureReason =
                err.response?.data?.message ||
                '예매 처리에 실패했습니다.';

            // 실제 소요 시간 계산
            const {
                queueTime,
                seatTime,
                totalTime
            } = getPracticeTime();

            // 예매 실패 기록 저장
            try {
                await api.post('/practice-sessions', {
                    event_id: Number(id),
                    queue_time: queueTime,
                    seat_time: seatTime,
                    total_time: totalTime,
                    result: 'fail',
                    selected_seat: selectedSeatText,
                    selected_group: selectedGroupText,
                    failure_reason: failureReason
                });

                console.log('실패 기록 저장 성공!');
            } catch (recordError) {
                console.error('실패 기록 저장 실패:', recordError);
            }

            setError(failureReason);

        } finally {
            setPaying(false);
        }
    };

    return (
        <div className="payment-page">
            <div className="payment-header">
                <h1>결제하기</h1>
                <p>예매 정보를 확인하고 결제를 진행해 주세요.</p>
            </div>

            <div className="payment-layout">
                <div className="payment-main">
                    <div className="payment-card">
                        <h2>예매 정보</h2>

                        <div className="payment-event">
                            {event.poster && (
                                <img
                                    src={`http://localhost:5000${event.poster}`}
                                    alt={event.title}
                                />
                            )}

                            <div>
                                <h3>{event.title}</h3>
                                <p>{event.location}</p>
                                <p>행사 날짜: {date}</p>
                            </div>
                        </div>

                        <div className="payment-divider"></div>

                        <h3>선택 내역</h3>

                        {isGame ? (
                            <div className="payment-detail">
                                <span>입장 그룹</span>
                                <strong>{selectedGroup.group_name} 그룹</strong>

                                <span>수량</span>
                                <strong>{quantity}매</strong>

                                <span>티켓 가격</span>
                                <strong>
                                    {Number(selectedGroup.price).toLocaleString()}원
                                </strong>
                            </div>
                        ) : (
                            <div className="payment-detail">
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
                    </div>

                    <div className="payment-card">
                        <h2>결제 수단</h2>

                        <div className="payment-methods">
                            <button
                                className={paymentMethod === 'card' ? 'active' : ''}
                                onClick={() => setPaymentMethod('card')}
                                disabled={paying}
                            >
                                카드 결제
                            </button>

                            <button
                                className={paymentMethod === 'transfer' ? 'active' : ''}
                                onClick={() => setPaymentMethod('transfer')}
                                disabled={paying}
                            >
                                계좌이체
                            </button>

                            <button
                                className={paymentMethod === 'simple' ? 'active' : ''}
                                onClick={() => setPaymentMethod('simple')}
                                disabled={paying}
                            >
                                간편 결제
                            </button>
                        </div>

                        <p className="payment-method-description">
                            {paymentMethod === 'card'
                                ? '카드 결제 방식으로 가상 결제를 진행합니다.'
                                : paymentMethod === 'transfer'
                                    ? '계좌이체 방식으로 가상 결제를 진행합니다.'
                                    : '간편 결제 방식으로 가상 결제를 진행합니다.'}
                        </p>

                        <div className="payment-agree">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={agree}
                                    onChange={(e) => setAgree(e.target.checked)}
                                    disabled={paying}
                                />
                                예매 정보 확인 및 가상 결제 진행에 동의합니다.
                            </label>
                        </div>
                    </div>
                </div>

                <div className="payment-summary">
                    <h2>최종 결제 금액</h2>

                    <div className="payment-price-row">
                        <span>티켓 금액</span>
                        <strong>
                            {Number(totalPrice).toLocaleString()}원
                        </strong>
                    </div>

                    <div className="payment-price-row">
                        <span>배송비</span>
                        <strong>0원</strong>
                    </div>

                    <div className="payment-divider"></div>

                    <div className="payment-total">
                        <span>총 결제 금액</span>
                        <strong>
                            {Number(totalPrice).toLocaleString()}원
                        </strong>
                    </div>

                    <p className="payment-notice">
                        본 사이트는 티켓팅 연습용입니다.
                        실제 결제는 진행되지 않습니다.
                    </p>

                    {error && (
                        <p className="payment-error">
                            {error}
                        </p>
                    )}

                    <button
                        className="payment-submit-button"
                        onClick={handlePayment}
                        disabled={paying}
                    >
                        {paying
                            ? '예매 처리 중...'
                            : `${Number(totalPrice).toLocaleString()}원 결제하기`}
                    </button>

                    <button
                        className="payment-back-button"
                        onClick={() => navigate(-1)}
                        disabled={paying}
                    >
                        이전 단계
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Payment;

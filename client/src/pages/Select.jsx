
import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

function Select() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const date = searchParams.get('date');
    const storageKey = `tiketbridge_practice_${id}_${date}`;
    const seatStorageKey = `tiketbridge_seats_${id}_${date}`;

    const [event, setEvent] = useState(null);
    const [seats, setSeats] = useState([]);
    const [groups, setGroups] = useState([]);
    const [selectedSeats, setSelectedSeats] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [unavailableSeats, setUnavailableSeats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [allSeatsSoldOut, setAllSeatsSoldOut] = useState(false);
    const [seatStateLoaded, setSeatStateLoaded] = useState(false);

    // 실패 기록 중복 저장 방지
    const failureRecorded = useRef(false);

    const selectedGroup = groups.find(
        (group) => group.group_id === selectedGroupId
    );

    // 실제 연습 소요 시간 계산
    const getPracticeTime = () => {
        let practiceData = {};

        try {
            practiceData = JSON.parse(
                sessionStorage.getItem(storageKey) || '{}'
            );
        } catch (err) {
            console.error('시간 정보 조회 실패:', err);
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

    // 모든 입장 그룹 매진 여부
    const allGroupsSoldOut =
        event?.category === 'game' &&
        groups.length > 0 &&
        groups.every(
            (group) => Number(group.remaining_quantity) <= 0
        );

    // 행사 및 좌석, 그룹 정보 조회
    useEffect(() => {
        const getData = async () => {
            try {
                const eventResponse = await api.get('/events');

                const selectedEvent = eventResponse.data.events.find(
                    (item) => String(item.event_id) === String(id)
                );

                if (!selectedEvent) {
                    setError('행사를 찾을 수 없습니다.');
                    return;
                }

                setEvent(selectedEvent);

                if (selectedEvent.category === 'game') {
                    const response = await api.get(`/event-groups/event/${id}`);
                    setGroups(response.data.groups || []);
                } else {
                    const response = await api.get(`/seats/event/${id}`);
                    const seatData = response.data.seats || [];

                    setSeats(seatData);

                    // 이전에 저장한 좌석 상태 복원
                    let savedState = {};

                    try {
                        savedState = JSON.parse(
                            sessionStorage.getItem(seatStorageKey) || '{}'
                        );
                    } catch (err) {
                        console.error('좌석 상태 복원 실패:', err);
                    }

                    const validSeatIds = seatData.map(
                        (seat) => seat.seat_id
                    );

                    const restoredUnavailable = (
                        savedState.unavailableSeats || []
                    ).filter((seatId) =>
                        validSeatIds.includes(seatId)
                    );

                    const restoredSelected = (
                        savedState.selectedSeatIds || []
                    )
                        .filter((seatId) =>
                            validSeatIds.includes(seatId)
                        )
                        .filter((seatId) =>
                            !restoredUnavailable.includes(seatId)
                        )
                        .map((seatId) =>
                            seatData.find(
                                (seat) => seat.seat_id === seatId
                            )
                        )
                        .filter(Boolean)
                        .filter((seat) => seat.status === 'available');

                    setUnavailableSeats(restoredUnavailable);
                    setSelectedSeats(restoredSelected);
                    setSeatStateLoaded(true);
                }
            } catch (err) {
                console.error(err);
                setError('예매 정보를 불러오지 못했습니다.');
            } finally {
                setLoading(false);
            }
        };

        getData();
    }, [id, seatStorageKey]);

    // 좌석 상태 저장
    useEffect(() => {
        if (!seatStateLoaded || event?.category === 'game') {
            return;
        }

        const saveSeatState = {
            unavailableSeats,
            selectedSeatIds: selectedSeats.map(
                (seat) => seat.seat_id
            )
        };

        sessionStorage.setItem(
            seatStorageKey,
            JSON.stringify(saveSeatState)
        );
    }, [
        unavailableSeats,
        selectedSeats,
        seatStateLoaded,
        seatStorageKey,
        event
    ]);

    // 게임 행사 입장 그룹 잔여 수량 감소
    useEffect(() => {
        if (!event || event.category !== 'game' || groups.length === 0) {
            return;
        }

        const timer = setInterval(() => {
            setGroups((prev) => {
                return prev.map((group) => {
                    const remaining = Number(group.remaining_quantity);

                    if (remaining <= 0) {
                        return {
                            ...group,
                            remaining_quantity: 0
                        };
                    }

                    const decrease = Math.floor(Math.random() * 3) + 1;

                    return {
                        ...group,
                        remaining_quantity: Math.max(0, remaining - decrease)
                    };
                });
            });
        }, 250);

        return () => clearInterval(timer);
    }, [event, groups.length]);

    // 선택한 그룹의 잔여 수량이 부족해지면 수량 조정
    useEffect(() => {
        if (!selectedGroup) return;

        const remaining = Number(selectedGroup.remaining_quantity);

        if (remaining <= 0) {
            setSelectedGroupId(null);
            setQuantity(1);
        } else if (quantity > remaining) {
            setQuantity(remaining);
        }
    }, [groups, selectedGroup, quantity]);

    // 가상 좌석 점유
    useEffect(() => {
        if (
            !event ||
            event.category === 'game' ||
            seats.length === 0 ||
            !seatStateLoaded ||
            allSeatsSoldOut
        ) {
            return;
        }

        // 내가 선택한 좌석도 점유 대상에 포함
        const availableSeats = seats.filter((seat) =>
            seat.status === 'available' &&
            !unavailableSeats.includes(seat.seat_id)
        );

        if (availableSeats.length === 0) return;

        const timer = setTimeout(() => {
            const randomIndex = Math.floor(
                Math.random() * availableSeats.length
            );

            const randomSeat = availableSeats[randomIndex];

            // 다른 사람이 좌석을 가져간 것으로 처리
            setUnavailableSeats((prev) => {
                if (prev.includes(randomSeat.seat_id)) {
                    return prev;
                }

                return [...prev, randomSeat.seat_id];
            });

            // 내가 선택한 좌석이라도 선택 내역에서 제거
            setSelectedSeats((prev) =>
                prev.filter(
                    (item) => item.seat_id !== randomSeat.seat_id
                )
            );
        }, Math.random() * 400 + 100);

        return () => clearTimeout(timer);
    }, [
        event,
        seats,
        selectedSeats,
        unavailableSeats,
        allSeatsSoldOut,
        seatStateLoaded
    ]);

    // 모든 좌석 매진 확인 및 실패 기록
    useEffect(() => {
        if (
            !event ||
            event.category === 'game' ||
            seats.length === 0 ||
            !seatStateLoaded
        ) {
            return;
        }

        const soldOut = seats.every((seat) =>
            seat.status !== 'available' ||
            unavailableSeats.includes(seat.seat_id)
        );

        if (!soldOut) {
            setAllSeatsSoldOut(false);
            return;
        }

        setAllSeatsSoldOut(true);

        if (failureRecorded.current) return;

        failureRecorded.current = true;

        const saveFailure = async () => {
            const {
                queueTime,
                seatTime,
                totalTime
            } = getPracticeTime();

            try {
                await api.post('/practice-sessions', {
                    event_id: Number(id),
                    queue_time: queueTime,
                    seat_time: seatTime,
                    total_time: totalTime,
                    result: 'fail',
                    selected_seat: null,
                    selected_group: null,
                    failure_reason: '모든 좌석 매진'
                });

                console.log('전체 좌석 매진 기록 저장 성공!');
            } catch (err) {
                console.error('전체 좌석 매진 기록 저장 실패:', err);
            }
        };

        saveFailure();
    }, [
        event,
        seats,
        unavailableSeats,
        id,
        seatStateLoaded
    ]);

    // 게임 행사 전체 매진 시 실패 기록 저장
    useEffect(() => {
        if (!allGroupsSoldOut || failureRecorded.current) {
            return;
        }

        failureRecorded.current = true;

        const saveFailure = async () => {
            const {
                queueTime,
                seatTime,
                totalTime
            } = getPracticeTime();

            try {
                await api.post('/practice-sessions', {
                    event_id: Number(id),
                    queue_time: queueTime,
                    seat_time: seatTime,
                    total_time: totalTime,
                    result: 'fail',
                    selected_seat: null,
                    selected_group: null,
                    failure_reason: '모든 입장 그룹 매진'
                });

                console.log('입장 그룹 매진 기록 저장 성공!');
            } catch (err) {
                console.error('입장 그룹 매진 기록 저장 실패:', err);
            }
        };

        saveFailure();
    }, [allGroupsSoldOut, id]);

    // 좌석 선택 및 취소
    const toggleSeat = (seat) => {
        if (
            seat.status !== 'available' ||
            unavailableSeats.includes(seat.seat_id)
        ) {
            return;
        }

        setSelectedSeats((prev) => {
            if (
                prev.some((item) => item.seat_id === seat.seat_id)
            ) {
                return prev.filter(
                    (item) => item.seat_id !== seat.seat_id
                );
            }

            if (prev.length >= 2) {
                alert('최대 2석까지 선택할 수 있습니다.');
                return prev;
            }

            return [...prev, seat];
        });
    };

    // 구역과 열별로 좌석 정리
    const seatSections = Object.values(
        seats.reduce((acc, seat) => {
            if (!acc[seat.section]) {
                acc[seat.section] = {
                    name: seat.section,
                    rows: {}
                };
            }

            if (!acc[seat.section].rows[seat.seat_row]) {
                acc[seat.section].rows[seat.seat_row] = [];
            }

            acc[seat.section].rows[seat.seat_row].push(seat);

            return acc;
        }, {})
    );

    // 총 가격 계산
    const totalPrice = event?.category === 'game'
        ? Number(selectedGroup?.price || 0) * quantity
        : selectedSeats.reduce(
            (sum, seat) => sum + Number(seat.price),
            0
        );

    // 예매 확인 페이지로 이동
    const goToConfirm = () => {
        if (event.category === 'game') {
            if (!selectedGroup) {
                alert('입장 그룹을 선택해 주세요.');
                return;
            }

            if (Number(selectedGroup.remaining_quantity) < quantity) {
                alert('선택한 그룹의 잔여 수량이 부족합니다.');
                return;
            }
        }

        if (event.category !== 'game' && selectedSeats.length === 0) {
            alert('좌석을 선택해 주세요.');
            return;
        }

        navigate(`/events/${id}/confirm`, {
            state: {
                event,
                date,
                selectedSeats,
                selectedGroup,
                quantity,
                totalPrice
            }
        });
    };

    if (loading) {
        return (
            <div className="event-message">
                예매 정보를 불러오는 중...
            </div>
        );
    }

    if (error) {
        return (
            <div className="event-message">
                {error}
            </div>
        );
    }

    if (!event) {
        return null;
    }

    return (
        <div className="select-page">
            <div className="select-header">
                <h1>{event.title}</h1>
                <p>행사 날짜: {date}</p>
            </div>

            {event.category === 'game' ? (
                allGroupsSoldOut ? (
                    <div className="sold-out-page">
                        <h2>모든 티켓이 매진되었습니다.</h2>

                        <p>
                            아쉽지만 선택 가능한 입장 그룹이 모두 매진되었습니다.
                        </p>

                        <button
                            className="next-button"
                            onClick={() => navigate('/')}
                        >
                            홈으로 돌아가기
                        </button>
                    </div>
                ) : (
                    <>
                        <h2>입장 그룹 선택</h2>

                        <p className="select-description">
                            원하는 입장 그룹과 수량을 선택해 주세요.
                        </p>

                        <div className="group-layout">
                            <div className="group-list">
                                {groups.map((group) => (
                                    <div
                                        key={group.group_id}
                                        className={`group-card ${
                                            selectedGroupId === group.group_id
                                                ? 'selected'
                                                : ''
                                        } ${
                                            Number(group.remaining_quantity) <= 0
                                                ? 'sold-out'
                                                : ''
                                        }`}
                                        onClick={() => {
                                            if (Number(group.remaining_quantity) > 0) {
                                                setSelectedGroupId(group.group_id);
                                                setQuantity(1);
                                            }
                                        }}
                                    >
                                        <div>
                                            <h3>{group.group_name} 그룹</h3>

                                            <p>
                                                {Number(group.price).toLocaleString()}원
                                            </p>

                                            <span>
                                                {Number(group.remaining_quantity) > 0
                                                    ? `잔여 ${group.remaining_quantity}매`
                                                    : '매진'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="selection-summary">
                                <h3>선택 내역</h3>

                                {selectedGroup ? (
                                    <>
                                        <p>
                                            {selectedGroup.group_name} 그룹
                                        </p>

                                        <label>수량</label>

                                        <select
                                            value={quantity}
                                            onChange={(e) =>
                                                setQuantity(Number(e.target.value))
                                            }
                                        >
                                            {Array.from(
                                                {
                                                    length: Math.min(
                                                        4,
                                                        Number(selectedGroup.remaining_quantity)
                                                    )
                                                },
                                                (_, i) => i + 1
                                            ).map((num) => (
                                                <option key={num} value={num}>
                                                    {num}매
                                                </option>
                                            ))}
                                        </select>

                                        <p className="total-price">
                                            총 {totalPrice.toLocaleString()}원
                                        </p>
                                    </>
                                ) : (
                                    <p>입장 그룹을 선택해 주세요.</p>
                                )}
                            </div>
                        </div>
                    </>
                )
            ) : (
                allSeatsSoldOut ? (
                    <div className="sold-out-page">
                        <h2>모든 좌석이 매진되었습니다.</h2>

                        <p>
                            아쉽지만 선택할 수 있는 좌석이 모두 매진되었습니다.
                        </p>

                        <button
                            className="next-button"
                            onClick={() => navigate('/')}
                        >
                            홈으로 돌아가기
                        </button>
                    </div>
                ) : (
                    <>
                        <h2>좌석 선택</h2>

                        <p className="select-description">
                            원하는 좌석을 선택해 주세요. 최대 2석까지 선택할 수 있습니다.
                        </p>

                        <div className="seat-screen">
                            STAGE
                        </div>

                        <div className="seat-sections">
                            {seatSections.map((section) => (
                                <div
                                    className="seat-section"
                                    key={section.name}
                                >
                                    <h3>{section.name}구역</h3>

                                    {Object.entries(section.rows)
                                        .sort(([a], [b]) => Number(a) - Number(b))
                                        .map(([row, rowSeats]) => (
                                            <div
                                                className="seat-row"
                                                key={row}
                                            >
                                                <span className="row-number">
                                                    {row}열
                                                </span>

                                                <div className="seat-row-list">
                                                    {rowSeats
                                                        .sort((a, b) =>
                                                            Number(a.seat_number) -
                                                            Number(b.seat_number)
                                                        )
                                                        .map((seat) => {
                                                            const isSelected =
                                                                selectedSeats.some(
                                                                    (item) =>
                                                                        item.seat_id === seat.seat_id
                                                                );

                                                            const isUnavailable =
                                                                seat.status !== 'available' ||
                                                                unavailableSeats.includes(
                                                                    seat.seat_id
                                                                );

                                                            return (
                                                                <button
                                                                    key={seat.seat_id}
                                                                    className={`seat ${
                                                                        isSelected
                                                                            ? 'seat-selected'
                                                                            : isUnavailable
                                                                                ? 'seat-disabled'
                                                                                : 'seat-available'
                                                                    }`}
                                                                    onClick={() =>
                                                                        toggleSeat(seat)
                                                                    }
                                                                    disabled={isUnavailable}
                                                                    title={`${seat.section} ${seat.seat_row}열 ${seat.seat_number}번`}
                                                                >
                                                                    {seat.seat_number}
                                                                </button>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            ))}
                        </div>

                        <div className="seat-legend">
                            <span>■ 선택 가능</span>
                            <span>■ 선택한 좌석</span>
                            <span>■ 선택 불가</span>
                        </div>

                        <div className="selection-summary">
                            <h3>선택 내역</h3>

                            <p>
                                {selectedSeats.length > 0
                                    ? selectedSeats.map((seat) =>
                                        `${seat.section} ${seat.seat_row}열 ${seat.seat_number}번`
                                    ).join(', ')
                                    : '선택한 좌석이 없습니다.'}
                            </p>

                            <p className="total-price">
                                총 {totalPrice.toLocaleString()}원
                            </p>
                        </div>
                    </>
                )
            )}

            {!allGroupsSoldOut && !allSeatsSoldOut && (
                <button
                    className="next-button"
                    disabled={
                        event.category === 'game'
                            ? !selectedGroup
                            : selectedSeats.length === 0
                    }
                    onClick={goToConfirm}
                >
                    다음 단계
                </button>
            )}
        </div>
    );
}

export default Select;

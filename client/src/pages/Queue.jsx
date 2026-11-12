
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

function Queue() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const date = searchParams.get('date');

    const [progress, setProgress] = useState(0);
    const [waiting, setWaiting] = useState(1248);

    const storageKey = `tiketbridge_practice_${id}_${date}`;

    // 날짜가 없으면 날짜 선택 페이지로 이동
    useEffect(() => {
        if (!date) {
            navigate(`/events/${id}/practice`, { replace: true });
            return;
        }

        // 새로운 연습 시작
        sessionStorage.setItem(storageKey, JSON.stringify({
            startedAt: Date.now(),
            queueStartedAt: Date.now(),
            queueCompletedAt: null,
            selectStartedAt: null
        }));
    }, [id, date, navigate]);

    // 대기열 진행 상황 업데이트
    useEffect(() => {
        if (!date) return;

        const timer = setInterval(() => {
            setProgress((prev) => Math.min(prev + 1, 100));

            setWaiting((prev) => Math.max(
                prev - Math.floor(Math.random() * 15 + 5),
                0
            ));
        }, 120);

        return () => clearInterval(timer);
    }, [date]);

    // 대기열 완료 시 다음 페이지로 이동
    useEffect(() => {
        if (progress >= 100 && date) {
            const saved = JSON.parse(
                sessionStorage.getItem(storageKey) || '{}'
            );

            const now = Date.now();

            sessionStorage.setItem(storageKey, JSON.stringify({
                ...saved,
                queueCompletedAt: now,
                selectStartedAt: now
            }));

            navigate(`/events/${id}/select?date=${date}`, {
                replace: true
            });
        }
    }, [progress, id, date, navigate]);

    return (
        <div className="queue-page">
            <div className="queue-card">
                <h1>TiketBridge</h1>
                <h2>접속 대기 중입니다.</h2>

                <p className="queue-description">
                    원활한 티켓팅 연습을 위해 잠시 기다려 주세요.
                </p>

                <div className="queue-number">
                    <span>내 앞의 대기 인원</span>
                    <strong>{waiting.toLocaleString()}명</strong>
                </div>

                <div className="progress-info">
                    <span>대기 진행률</span>
                    <strong>{progress}%</strong>
                </div>

                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                <p className="queue-notice">
                    대기 중에는 새로고침하지 마세요.
                </p>
            </div>
        </div>
    );
}

export default Queue;

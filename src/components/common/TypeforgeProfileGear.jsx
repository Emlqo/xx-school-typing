import { useEffect, useRef, useState } from 'react';
import { getTypeforgeProfileGear } from '../../services/studentSecurityApi.js';
import { typeforgeEquipmentTypes } from '../../utils/typeforgePractice.js';
import './TypeforgeProfileGear.css';

export default function TypeforgeProfileGear({ refreshKey }) {
  const [result, setResult] = useState({ loading: true });
  const [retry, setRetry] = useState(0);
  const request = useRef(null);

  useEffect(() => {
    if (request.current?.refreshKey !== refreshKey || request.current?.retry !== retry) {
      request.current = { refreshKey, retry, pending: getTypeforgeProfileGear() };
    }
    let active = true;
    setResult(previous => ({ ...previous, loading: true, error: false }));
    request.current.pending.then(({ gear }) => {
      if (active) setResult({ gear, loading: false });
    }).catch(() => {
      if (active) setResult(previous => ({ ...previous, loading: false, error: true }));
    });
    return () => { active = false; };
  }, [refreshKey, retry]);

  const { gear, loading, error } = result;

  return (
    <section className="typeforge-profile-card" data-tier={gear?.tier} aria-label="타자공방 장비" aria-busy={loading}>
      {gear ? (
        <>
          <div className="typeforge-profile-card__content">
            <p className="typeforge-profile-card__label">타자공방 장비 <span>{typeforgeEquipmentTypes[gear.type]}</span></p>
            <div className="typeforge-profile-card__rank">
              <span className="typeforge-profile-card__level">+{gear.level}</span>
              <span className="typeforge-profile-card__tier">{gear.tier}</span>
            </div>
            <h3>{gear.name}</h3>
            <p className="typeforge-profile-card__description">{gear.description}</p>
            {error && <button type="button" className="typeforge-profile-card__retry" onClick={() => setRetry(value => value + 1)}>최신 장비 다시 불러오기</button>}
          </div>
          <div className="typeforge-profile-card__image">
            <img key={gear.art} src={gear.art} alt="" decoding="async" referrerPolicy="no-referrer" />
          </div>
        </>
      ) : (
        <div className="typeforge-profile-card__content typeforge-profile-card__content--empty">
          <p className="typeforge-profile-card__label">타자공방 장비</p>
          <div role="status">
            <h3>{loading ? '장비를 불러오는 중…' : error ? '장비를 불러오지 못했어요' : '아직 보유한 장비가 없어요'}</h3>
            {!loading && !error && <p className="typeforge-profile-card__description">타자공방에 처음 입장하면 장비가 여기에 표시돼요.</p>}
          </div>
          {error && <button type="button" className="typeforge-profile-card__retry" onClick={() => setRetry(value => value + 1)}>다시 불러오기</button>}
        </div>
      )}
    </section>
  );
}

import { useId } from 'react';

const CAPSULES = [
  [128, 302, -24, '#fa786c'], [196, 310, 15, '#49c7b5'], [264, 309, -18, '#f3c348'],
  [334, 302, 32, '#659ce3'], [155, 251, 25, '#f3c348'], [222, 252, -34, '#659ce3'],
  [288, 254, 16, '#fa786c'], [366, 250, -25, '#49c7b5'], [120, 199, -12, '#49c7b5'],
  [189, 194, 32, '#fa786c'], [256, 199, -20, '#f3c348'], [324, 195, 25, '#659ce3'],
];

function Capsule({ color, opening = false }) {
  return <g className={opening ? 'capsule-opening' : undefined}>
    <g className="capsule-top"><path d="M-31 0a31 31 0 0 1 62 0Z" fill={color} stroke="#213e4655" strokeWidth="1.5" /><path d="M-22-10q5-12 17-13" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" opacity=".7" /></g>
    <path d="M-31 0a31 31 0 0 0 62 0Z" fill="#effcfa" fillOpacity=".86" stroke="#476c7555" strokeWidth="1.5" />
    <path d="M-30 0h60" stroke="#284c5b" strokeWidth="3" opacity=".4" />
    <path d="M-19 14q9 9 22 9" fill="none" stroke="white" strokeWidth="3" opacity=".8" />
  </g>;
}

export default function GachaMachine({ busy, result, enabled, price, disabled, pending, onSpin }) {
  const id = useId().replace(/:/g, '');
  const label = busy ? '추첨 중...' : pending ? '진행한 뽑기 결과 확인' : `${price ?? '—'}P로 뽑기`;
  return <div className={`gacha-machine ${busy ? 'is-spinning' : ''} ${result ? 'has-result' : ''}`}>
    <div className="gacha-marquee"><span>LUCKY CAPSULE · SEASON 02</span><h3>럭키 가챠샵</h3><span className="gacha-price">1회 {price ?? '—'}P</span></div>
    <div className="gacha-machine-stage">
      <svg className="gacha-machine-art" viewBox="0 0 500 580" role="img" aria-label="투명 통과 회전 손잡이, 캡슐 배출구가 있는 뽑기 기계">
        <defs>
          <linearGradient id={`${id}-glass`} x2="1" y2="1"><stop stopColor="#e3fbff" stopOpacity=".8" /><stop offset=".5" stopColor="#b4e3df" stopOpacity=".18" /><stop offset="1" stopColor="#59aeb0" stopOpacity=".45" /></linearGradient>
          <linearGradient id={`${id}-body`} x2="1" y2="0"><stop stopColor="#c34643" /><stop offset=".17" stopColor="#ff8576" /><stop offset=".8" stopColor="#ed665f" /><stop offset="1" stopColor="#af393d" /></linearGradient>
          <linearGradient id={`${id}-metal`} x2="0" y2="1"><stop stopColor="#fff" /><stop offset=".4" stopColor="#c5d9d6" /><stop offset=".55" stopColor="#829f9d" /><stop offset="1" stopColor="#e4efea" /></linearGradient>
          <clipPath id={`${id}-chamber`}><path d="M97 107Q250 57 403 107L414 283Q414 337 360 347H140Q86 337 86 283Z" /></clipPath>
          <clipPath id={`${id}-outlet`}><rect x="103" y="439" width="132" height="100" rx="22" /></clipPath>
        </defs>
        <ellipse cx="250" cy="567" rx="208" ry="10" fill="#1d554c22" />
        <path d="M87 340H413L443 531Q447 557 417 559H83Q53 557 57 531Z" fill={`url(#${id}-body)`} stroke="#933b3b" strokeWidth="3" />
        <path d="M83 348L70 529Q67 543 84 545H414" fill="none" stroke="#ffb8a0" strokeWidth="5" opacity=".7" />
        <rect x="85" y="550" width="58" height="18" rx="5" fill="#214c49" /><rect x="357" y="550" width="58" height="18" rx="5" fill="#214c49" />
        <path d="M97 107Q250 57 403 107L414 283Q414 337 360 347H140Q86 337 86 283Z" fill={`url(#${id}-glass)`} stroke="#558b8e" strokeWidth="5" />
        <g clipPath={`url(#${id}-chamber)`}>
          <path d="M70 325Q245 285 430 325V358H70Z" fill="#79b0a0" />
          {CAPSULES.map(([x, y, rotation, color], i) => <g key={i} transform={`translate(${x} ${y}) rotate(${rotation})`}><g className="gacha-chamber-capsule" style={{ '--capsule-sway': `${(i % 2 ? 1 : -1) * (12 + i % 3 * 5)}px`, '--capsule-lift': `${-(12 + i % 4 * 5)}px`, '--capsule-roll': `${(i % 2 ? 1 : -1) * (24 + i * 4)}deg` }}><Capsule color={color} /></g></g>)}
          <path d="M112 100L151 86 113 279 95 254Z" fill="white" opacity=".25" /><path d="M366 91L380 96 398 286 387 298Z" fill="white" opacity=".17" />
        </g>
        <path d="M78 99Q250 15 422 99L415 118Q250 80 85 118Z" fill="#21645b" stroke="#174b43" strokeWidth="3" />
        <path d="M95 96Q250 32 405 96" fill="none" stroke="#68b6a4" strokeWidth="6" />
        <rect x="208" y="37" width="84" height="18" rx="8" fill={`url(#${id}-metal)`} />
        <path d="M81 332Q250 353 419 332L419 357Q250 379 81 357Z" fill={`url(#${id}-metal)`} stroke="#547b72" strokeWidth="2" />
        <rect x="177" y="365" width="146" height="38" rx="6" fill="#fff9e3" stroke="#a14437" strokeWidth="2" />
        <text x="250" y="390" textAnchor="middle" fill="#2d5d53" fontSize="16" fontWeight="900">LUCKY CAPSULE</text>
        <rect x="93" y="427" width="152" height="120" rx="26" fill={`url(#${id}-metal)`} stroke="#93433e" strokeWidth="3" />
        <rect x="103" y="439" width="132" height="100" rx="22" fill="#123e39" />
        <path d="M114 456Q168 441 224 456" fill="none" stroke="#071f1d" strokeWidth="16" />
        <g clipPath={`url(#${id}-outlet)`}>
          {result && <ellipse className="gacha-capsule-shadow" cx="170" cy="530" rx="28" ry="5" fill="#061f1a" opacity=".65" />}
          {result && <g key={result.id} transform="translate(169 502)"><g className="gacha-dispensed-capsule"><Capsule color={result.outcome === 'won' ? '#f4c54f' : '#55c7b9'} opening /></g></g>}
        </g>
        <path d="M111 534H227" stroke="#669087" strokeWidth="4" />
        <rect x="320" y="408" width="55" height="16" rx="5" fill={`url(#${id}-metal)`} stroke="#93433e" strokeWidth="2" /><rect x="329" y="413" width="37" height="5" rx="2" fill="#15372f" />
        {[ [86,390], [414,390], [78,531], [423,531] ].map(([x,y]) => <g key={`${x}-${y}`}><circle cx={x} cy={y} r="5" fill="#f3d5b6" /><path d={`M${x-2} ${y-2}l4 4`} stroke="#984c3e" /></g>)}
      </svg>
      <button type="button" onClick={onSpin} disabled={disabled} className="gacha-crank-button" aria-label={label} title={label}>
        <span className="gacha-crank-face" aria-hidden="true"><span className="gacha-crank-grip" /><span className="gacha-crank-screw" /></span>
      </button>
      <div className="gacha-turn-caption" aria-hidden="true">{busy ? '끼릭... 끼릭...' : '돌려서 뽑기'}</div>
    </div>
    <div className="gacha-tray" aria-live="polite">
      {busy ? <><strong>캡슐을 고르고 있어요</strong><span>끼릭, 끼릭... 잠시만 기다려주세요.</span></> : result ? <div className="gacha-winning-ticket"><span>{result.outcome === 'won' ? '당첨!' : result.outcome === 'sold_out' ? '품절로 미당첨' : '꽝 · 상품 미지급'}</span><strong>{result.itemName}</strong><span>{result.pointsSpent}P 사용 · {result.outcome === 'won' ? '선생님께 상품을 받아주세요.' : '지급할 상품이 없습니다.'}</span></div> : <><strong>{enabled ? label : '지금은 준비 중입니다'}</strong><span>전교 공통 재고</span></>}
    </div>
  </div>;
}

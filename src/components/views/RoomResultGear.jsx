import { typeforgeEquipmentTypes } from '../../utils/typeforgePractice.js';
import './RoomResultGear.css';

const finishers = {
  keyboard: { 19: 'lock', 20: 'rewrite' },
  mouse: { 19: 'shadow', 20: 'thread' },
  monitor: { 19: 'tide', 20: 'seasons' },
  printer: { 19: 'press', 20: 'mountains' },
  speaker: { 19: 'lightning', 20: 'silence' },
  gpu: { 19: 'city', 20: 'prism' },
};

export function selectRoomResultGear(gear) {
  if (!Object.hasOwn(typeforgeEquipmentTypes, gear?.type) || !Number.isInteger(gear?.level) ||
      gear.level < 15 || gear.level > 20 || !gear.name || !gear.art) return null;
  return gear;
}

export default function RoomResultGear({ gear }) {
  const finale = finishers[gear.type][gear.level];
  const segments = finale === 'prism' || gear.type === 'gpu' || gear.type === 'keyboard' ? 7 : 4;

  return (
    <header className="room-result-hero" data-finale={finale}>
      <div className="room-result-stage">
        <div className="room-result-motif" aria-hidden="true">
          {Array.from({ length: segments }, (_, index) => <i key={index} style={{ '--index': index }} />)}
        </div>
        <img className="room-result-art" src={gear.art} alt="" width="400" height="224" fetchPriority="high" />
      </div>
      <div className="room-result-gear-name">
        <span>+{gear.level}</span>
        <strong>{gear.name}</strong>
      </div>
    </header>
  );
}

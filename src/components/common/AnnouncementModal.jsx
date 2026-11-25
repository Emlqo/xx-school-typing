import { useEffect, useId, useRef } from 'react';
import LinkifiedText from './LinkifiedText.jsx';
import { formatAnnouncementDate } from '../../utils/format.js';

export default function AnnouncementModal({ announcements = [], onClose = () => {} }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog ref={dialogRef} className="student-urgent-dialog" aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="student-urgent-dialog__header">
        <h2 id={titleId}>긴급 공지</h2>
        <button type="button" onClick={onClose} className="student-urgent-dialog__close">닫기</button>
      </div>
      {announcements.map((announcement) => (
        <article key={announcement.id} className="student-urgent-dialog__notice">
          <h3>{announcement.title}</h3>
          <LinkifiedText text={announcement.content} className="student-home__notice-body" />
          <time>{formatAnnouncementDate(announcement.createdAt)}</time>
        </article>
      ))}
    </dialog>
  );
}

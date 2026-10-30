import { useEffect, useRef } from 'react';
import type { ImageMedia } from './projects';
import { ChevronIcon, CloseIcon } from './icons';

interface Props {
  images: ImageMedia[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}

/** Full-screen image viewer: arrow keys or buttons to step through, Escape or a click outside to close. */
export function Lightbox({ images, index, onIndex, onClose }: Props) {
  const close = useRef<HTMLButtonElement>(null);
  const count = images.length;
  const step = (delta: number) => onIndex((index + delta + count) % count);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowLeft') step(-1);
      else if (event.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    close.current?.focus();
    document.body.classList.add('no-scroll');
    return () => {
      document.body.classList.remove('no-scroll');
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  const image = images[index];
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Image viewer" onClick={onClose}>
      <img src={image.src} alt={image.caption ?? ''} onClick={(event) => event.stopPropagation()} />
      <button ref={close} className="lightbox-button lightbox-close" onClick={onClose} aria-label="Close">
        <CloseIcon />
      </button>
      {count > 1 && (
        <>
          <button
            className="lightbox-button lightbox-prev"
            onClick={(event) => {
              event.stopPropagation();
              step(-1);
            }}
            aria-label="Previous image"
          >
            <ChevronIcon direction="left" />
          </button>
          <button
            className="lightbox-button lightbox-next"
            onClick={(event) => {
              event.stopPropagation();
              step(1);
            }}
            aria-label="Next image"
          >
            <ChevronIcon direction="right" />
          </button>
          <span className="lightbox-count">
            {index + 1} / {count}
          </span>
        </>
      )}
    </div>
  );
}

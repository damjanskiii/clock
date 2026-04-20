"use client";

import type { ClockVariantId } from "@/lib/clock-variants";
import styles from "@/components/clock-shell.module.css";

type ClockShellProps = {
  debugText: string;
  errorText: string | null;
  imageAlt: string;
  imageUrl: string | null;
  onImageError: () => void;
  isGenerating: boolean;
  isModalOpen: boolean;
  questionMarkColor: string;
  variant: ClockVariantId;
  variantCopy: string;
  onCloseModal: () => void;
  onOpenModal: () => void;
};

export function ClockShell({
  debugText,
  errorText,
  imageAlt,
  imageUrl,
  onImageError,
  isGenerating,
  isModalOpen,
  questionMarkColor,
  variant,
  variantCopy,
  onCloseModal,
  onOpenModal,
}: ClockShellProps) {
  return (
    <main className={styles.page} data-variant={variant}>
      <button
        aria-label="About this clock"
        className={styles.helpButton}
        style={{ color: questionMarkColor }}
        type="button"
        onClick={onOpenModal}
      >
        ?
      </button>

      <section className={styles.centerStage} aria-live="polite">
        <div className={styles.clockFrame}>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={imageAlt} className={styles.clockImage} src={imageUrl} onError={onImageError} />
          ) : (
            <div aria-hidden="true" className={styles.placeholder} />
          )}

          {isGenerating && !imageUrl && (
            <div className={styles.loadingOverlay}>
              <span className={styles.loadingCopy}>
                Loading the Clock
                <span aria-hidden="true" className={styles.loadingDots} />
              </span>
            </div>
          )}
        </div>

        {errorText && (
          <p className={styles.statusText}>
            {errorText}
          </p>
        )}
      </section>

      <p aria-hidden="true" className={styles.debugReadout}>
        {debugText}
      </p>

      {isModalOpen && (
        <div
          aria-modal="true"
          className={styles.modalOverlay}
          role="dialog"
          onClick={onCloseModal}
        >
          <div className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
            <button
              aria-label="Close information popup"
              className={styles.closeButton}
              type="button"
              onClick={onCloseModal}
            >
              Close
            </button>
            <p className={styles.modalCopy}>{variantCopy}</p>
          </div>
        </div>
      )}
    </main>
  );
}

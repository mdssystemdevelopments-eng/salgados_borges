import type { OrderAdvanceModalContent } from "@/lib/order/advance";

type OrderAdvanceModalProps = {
  open: boolean;
  content: OrderAdvanceModalContent;
  onChangeOrder: () => void;
  onClose?: () => void;
};

export function OrderAdvanceModal({
  open,
  content,
  onChangeOrder,
  onClose,
}: OrderAdvanceModalProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed inset-0 z-[81] flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-advance-modal-title"
      >
        <div className="order-advance-modal w-full max-w-md rounded-2xl border border-gold/35 bg-card p-6 sm:p-8 shadow-deep space-y-5">
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-2xl">
              ⚠️
            </div>
            <h2
              id="order-advance-modal-title"
              className="font-display text-2xl text-foreground leading-tight"
            >
              {content.title}
            </h2>
            <p className="text-sm leading-relaxed text-foreground">{content.message}</p>
            {content.description ? (
              <p className="text-sm leading-relaxed text-muted-foreground">{content.description}</p>
            ) : null}
          </div>

          <div className="space-y-2.5">
            {content.whatsappEnabled && content.whatsappUrl ? (
              <a
                href={content.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gold-gradient px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground shadow-gold-sm transition-shadow hover:shadow-gold-glow"
              >
                <span aria-hidden>📱</span>
                {content.whatsappButtonText}
              </a>
            ) : null}

            {content.changeOrderEnabled ? (
              <button
                type="button"
                onClick={onChangeOrder}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-gold/45 bg-background px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-foreground transition-colors hover:border-gold hover:bg-gold/5"
              >
                <span aria-hidden>🛒</span>
                {content.changeOrderButtonText}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

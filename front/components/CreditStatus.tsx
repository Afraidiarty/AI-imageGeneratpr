import React from 'react';

interface CreditStatusProps {
  credits: number | null;
  onAddCredits: () => void;
  isProcessing?: boolean;
}

const CreditStatus: React.FC<CreditStatusProps> = ({ credits, onAddCredits, isProcessing }) => {
  const lowCredits = typeof credits === 'number' && credits <= 10;

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-900 to-neutral-800 p-4 md:flex-row md:items-center md:justify-between ${lowCredits ? 'ring-1 ring-red-500/60' : ''}`}>
      <div>
        <p className="text-sm uppercase tracking-wide text-neutral-400">Доступно кредитов</p>
        <p className="text-3xl font-bold text-white">{typeof credits === 'number' ? credits : '—'}</p>
        {lowCredits && <p className="text-sm text-red-300">Осталось мало. Пополните баланс, чтобы продолжить работу.</p>}
      </div>
      <button
        onClick={onAddCredits}
        disabled={isProcessing}
        className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Пополнить / тарифы
      </button>
    </div>
  );
};

export default CreditStatus;


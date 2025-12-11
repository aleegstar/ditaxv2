import React from 'react';
import PaymentSection from '@/components/PaymentSection';
import { FormProvider } from '@/contexts';
import { useSearchParams } from 'react-router-dom';

const PaymentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const year = searchParams.get('year') || (new Date().getFullYear() - 1).toString();
  const isUpgrade = searchParams.get('upgrade') === 'true';
  const returnId = searchParams.get('returnId');

  return (
    <FormProvider taxYear={year}>
      <PaymentSection isUpgrade={isUpgrade} upgradeReturnId={returnId || undefined} />
    </FormProvider>
  );
};

export default PaymentPage;
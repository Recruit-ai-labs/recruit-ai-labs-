'use client';

import { useFormStatus } from 'react-dom';

export function AnalysisSubmit({ idle, pending }) {
  const { pending: isPending } = useFormStatus();
  return <button className="primaryAction" type="submit" disabled={isPending}>{isPending ? pending : idle} <span>&rarr;</span></button>;
}

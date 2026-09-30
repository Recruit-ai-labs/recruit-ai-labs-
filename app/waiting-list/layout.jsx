import ProtectedSession from '../components/ProtectedSession';

export default function WaitingListLayout({ children }) {
  return <ProtectedSession scope="identity">{children}</ProtectedSession>;
}

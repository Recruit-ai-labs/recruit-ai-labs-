import ProtectedSession from '../components/ProtectedSession';

export default function ApprovalLayout({ children }) {
  return <ProtectedSession scope="admin">{children}</ProtectedSession>;
}

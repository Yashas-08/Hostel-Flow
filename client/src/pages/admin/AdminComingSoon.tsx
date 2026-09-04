import { useAuth } from '../../context/AuthContext';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import { EmptyState } from '../../components/States';
import Button from '../../components/Button';

export default function AdminComingSoon({ title, description }: { title: string; description: string }) {
  const { user, logout } = useAuth();
  return (
    <>
      <AdminHeader name={user?.fullName ?? ''} title="Settings" />
      <AdminScreen>
        <div className="lg:max-w-xl lg:mx-auto lg:mt-10">
          <EmptyState
            title={title}
            description={description}
            action={<Button variant="ghost" size="sm" onClick={logout}>Log out</Button>}
          />
        </div>
      </AdminScreen>
    </>
  );
}

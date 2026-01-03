import { useAuthStore } from './stores/authStore';
import { useSessionStore } from './stores/sessionStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import SessionSetupPage from './pages/SessionSetupPage';
import UploadPage from './pages/UploadPage';
import UpdateNotification from './components/UpdateNotification';

export default function App() {
  const { isAuthenticated } = useAuthStore();
  const { session } = useSessionStore();

  return (
    <>
      <UpdateNotification />
      <Layout>
        {!isAuthenticated ? (
          <LoginPage />
        ) : !session ? (
          <SessionSetupPage />
        ) : (
          <UploadPage />
        )}
      </Layout>
    </>
  );
}

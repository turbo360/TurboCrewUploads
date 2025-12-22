import { useAuthStore } from './stores/authStore';
import { useSessionStore } from './stores/sessionStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import SessionSetupPage from './pages/SessionSetupPage';
import UploadPage from './pages/UploadPage';

export default function App() {
  const { isAuthenticated } = useAuthStore();
  const { session } = useSessionStore();

  return (
    <Layout>
      {!isAuthenticated ? (
        <LoginPage />
      ) : !session ? (
        <SessionSetupPage />
      ) : (
        <UploadPage />
      )}
    </Layout>
  );
}

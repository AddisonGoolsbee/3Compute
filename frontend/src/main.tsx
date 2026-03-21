import TerminalTabs from './components/Terminal';
import Login from './components/Login';
import Onboarding from './components/Onboarding';
import Layout from './Layout';
import { useContext } from 'react';
import { UserDataContext } from './util/UserData';

export default function App() {
  const userData = useContext(UserDataContext);

  if (!userData.userInfo) {
    return (
      <>
        <Layout>
          <TerminalTabs />
        </Layout>
        <Login />
      </>
    );
  }

  if (userData.userInfo.needs_onboarding) {
    return <Onboarding />;
  }

  return (
    <Layout>
      <TerminalTabs />
    </Layout>
  );
}

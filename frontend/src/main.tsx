import TerminalTabs from './components/Terminal';
import Login from './components/Login';
import Layout from './Layout';
import { useContext } from 'react';
import { UserDataContext } from './util/UserData';

export default function App() {
  const userData = useContext(UserDataContext);

  return <>
    <Layout>
      <TerminalTabs />
    </Layout>
    {!userData.userInfo && <Login />}
  </>;
}

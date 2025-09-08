import Login from '../components/Login';
import { useContext } from 'react';
import { UserDataContext } from '../util/UserData';
import Layout from './classrooms.layout';

export default function App() {
  const userData = useContext(UserDataContext);

  return <>
    <Layout>

    </Layout>
    {!userData.userInfo && <Login />}
  </>;
}

import Login from '../components/Login';
import { useContext } from 'react';
import { UserDataContext } from '../util/UserData';

export default function App() {
  const userData = useContext(UserDataContext);

  return <>
    {!userData.userInfo && <Login />}
  </>;
}

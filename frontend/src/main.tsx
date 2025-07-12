import Terminal from "./components/Terminal";
import Login from "./components/Login";
import Layout from "./Layout";
import { useContext } from "react";
import { UserDataContext } from "./root";

export default function App() {
  const userData = useContext(UserDataContext);

  return <>
    <Layout>
      <Terminal />
    </Layout>
    {!userData.userInfo && <Login />}
  </>;
}

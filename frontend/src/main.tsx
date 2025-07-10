import Terminal from "./components/Terminal";
import Login from "./components/Login";
import { clientLoader, UserInfo } from "./root";
import { useLoaderData } from "react-router";

// eslint-disable-next-line react-refresh/only-export-components
export { clientLoader };

export default function App() {
  const userInfo = useLoaderData() as UserInfo | undefined;
  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center">
        {!userInfo && <Login />}
        {userInfo && <Terminal userInfo={userInfo} />}
      </div>
    </>
  );
}
